import { useEffect, useState, useRef } from "react";
import * as Location from "expo-location";

export type LiveLocation = {
  latitude: number;
  longitude: number;
};

function toLiveLocation(position: Location.LocationObject): LiveLocation {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude
  };
}

export function useLiveLocation(enabled = true) {
  const [liveLocation, setLiveLocation] = useState<LiveLocation | undefined>(undefined);
  const lastLocationRef = useRef<LiveLocation | undefined>(undefined);
  const updateCountRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setLiveLocation(undefined);
      lastLocationRef.current = undefined;
      return;
    }

    let isMounted = true;
    let subscription: Location.LocationSubscription | undefined;

    const watchLiveLocation = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (permission.status !== "granted") {
          return;
        }

        if (!isMounted) return;

        // A recent fix can center the map while the live GPS watch starts.
        // Never let a late cache response replace a fresh watch update.
        let receivedLivePosition = false;
        void Location.getLastKnownPositionAsync({
          maxAge: 60_000,
          requiredAccuracy: 100
        }).then(position => {
          if (isMounted && position && !receivedLivePosition) {
            const location = toLiveLocation(position);
            setLiveLocation(location);
            lastLocationRef.current = location;
          }
        }).catch(() => {});

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 5, // Reduced from 8 for smoother tracking
            timeInterval: 2000 // Reduced from 4000 for more frequent updates
          },
          (position) => {
            receivedLivePosition = true;
            if (isMounted) {
              const location = toLiveLocation(position);
              setLiveLocation(location);
              lastLocationRef.current = location;
              updateCountRef.current += 1;
            }
          }
        );
        if (!isMounted) subscription.remove();
      } catch (error) {
        if (__DEV__) {
          console.warn("Unable to start live map location updates.", error);
        }
      }
    };

    void watchLiveLocation();

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, [enabled]);

  return liveLocation;
}
