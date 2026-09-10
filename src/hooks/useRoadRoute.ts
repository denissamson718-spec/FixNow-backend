import { useEffect, useState } from "react";

type RoutePoint = {
  latitude: number;
  longitude: number;
};

function buildFallbackRoute(origin: RoutePoint, destination: RoutePoint) {
  return [origin, destination];
}

export function useRoadRoute({
  enabled,
  origin,
  destination
}: {
  enabled: boolean;
  origin?: RoutePoint;
  destination?: RoutePoint;
}) {
  const [routeCoordinates, setRouteCoordinates] = useState<RoutePoint[]>([]);

  useEffect(() => {
    if (!enabled || !origin || !destination) {
      setRouteCoordinates([]);
      return;
    }

    const abortController = new AbortController();
    const requestRoute = async () => {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`,
          {
            signal: abortController.signal
          }
        );

        if (!response.ok) {
          throw new Error(`Route request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as {
          routes?: Array<{
            geometry?: {
              coordinates?: number[][];
            };
          }>;
        };

        const roadCoordinates =
          payload.routes?.[0]?.geometry?.coordinates?.map(([longitude, latitude]) => ({
            latitude,
            longitude
          })) ?? [];

        setRouteCoordinates(
          roadCoordinates.length ? roadCoordinates : buildFallbackRoute(origin, destination)
        );
      } catch (error) {
        if (!abortController.signal.aborted) {
          setRouteCoordinates(buildFallbackRoute(origin, destination));
        }
      }
    };

    void requestRoute();

    return () => {
      abortController.abort();
    };
  }, [destination?.latitude, destination?.longitude, enabled, origin?.latitude, origin?.longitude]);

  return routeCoordinates;
}
