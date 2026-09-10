import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import AppMap, { AppMapHandle, AppMapMarker as Marker, AppMapPolyline as Polyline } from "../../../components/AppMap";
import { MapSourceSwitch } from "../../../components/MapSourceSwitch";
import { getMapProvider, getMapType, OpenStreetMapTiles } from "../../../components/mapSource";
import { getRideMapInteractionProps } from "../../../components/rideMapConfig";
import { useLiveLocation } from "../../../hooks/useLiveLocation";
import { useRoadRoute } from "../../../hooks/useRoadRoute";
import { backendBaseUrl } from "../../../services/backend";
import { useAppContext } from "../../../state/AppContext";
import { palette } from "../../../theme/palette";
import { DriverSideMenu } from "../components/DriverSideMenu";

type PlaceKind = "garage" | "fuel";
type NearbyPlace = { id: string; name: string; kind: PlaceKind; latitude: number; longitude: number };
type OverpassElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

const SEARCH_RADIUS_METRES = 8000;

function distanceKm(origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDifference = toRadians(destination.latitude - origin.latitude);
  const longitudeDifference = toRadians(destination.longitude - origin.longitude);
  const value =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(origin.latitude)) *
      Math.cos(toRadians(destination.latitude)) *
      Math.sin(longitudeDifference / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function bearingDegrees(origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const toDegrees = (value: number) => (value * 180) / Math.PI;
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);
  const longitudeDifference = toRadians(destination.longitude - origin.longitude);
  const y = Math.sin(longitudeDifference) * Math.cos(destinationLatitude);
  const x =
    Math.cos(originLatitude) * Math.sin(destinationLatitude) -
    Math.sin(originLatitude) * Math.cos(destinationLatitude) * Math.cos(longitudeDifference);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export function NearbyPlacesScreen() {
  const { mapSource, setMapSource } = useAppContext();
  const liveLocation = useLiveLocation();
  const mapRef = useRef<AppMapHandle | null>(null);
  const followTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [kind, setKind] = useState<PlaceKind>("garage");
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [loadMessage, setLoadMessage] = useState("Waiting for your location...");
  const [searchVersion, setSearchVersion] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);
  const searchOriginRef = useRef<{ latitude: number; longitude: number } | undefined>(undefined);
  const hasLiveLocation = Boolean(liveLocation);

  useEffect(() => {
    if (!liveLocation) return;
    const searchOrigin = searchOriginRef.current ?? liveLocation;
    searchOriginRef.current = searchOrigin;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35000);
    setIsLoading(true);
    setLoadMessage("");

    const loadPlaces = async () => {
      try {
        const query = new URLSearchParams({
          latitude: String(searchOrigin.latitude),
          longitude: String(searchOrigin.longitude),
          radius: String(SEARCH_RADIUS_METRES)
        });
        const response = await fetch(`${backendBaseUrl}/api/places/nearby?${query.toString()}`, {
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`Place service returned ${response.status}`);
        const payload = (await response.json()) as { elements?: OverpassElement[] };
        const nextPlaces = (payload.elements ?? [])
          .map((element): NearbyPlace | undefined => {
            const latitude = element.lat ?? element.center?.lat;
            const longitude = element.lon ?? element.center?.lon;
            if (typeof latitude !== "number" || typeof longitude !== "number") return undefined;
            const placeKind: PlaceKind = element.tags?.amenity === "fuel" ? "fuel" : "garage";
            return {
              id: `${placeKind}-${element.id}`,
              name: element.tags?.name || (placeKind === "fuel" ? "Nearby filling station" : "Nearby garage"),
              kind: placeKind,
              latitude,
              longitude
            };
          })
          .filter((place): place is NearbyPlace => Boolean(place))
          .sort((first, second) => distanceKm(searchOrigin, first) - distanceKm(searchOrigin, second))
          .slice(0, 30);
        setPlaces(nextPlaces);
        setLoadMessage(nextPlaces.length ? "" : "No garages or filling stations were found within 8 km.");
      } catch (error) {
        setLoadMessage(
          (error as Error).name === "AbortError"
            ? "The nearby place search timed out. Please try again."
            : "Nearby places could not be loaded. Check your internet connection and try again."
        );
      } finally {
        clearTimeout(timer);
        setIsLoading(false);
      }
    };

    void loadPlaces();
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [hasLiveLocation, searchVersion]);

  const retrySearch = () => {
    if (!liveLocation) return;
    searchOriginRef.current = liveLocation;
    setSearchVersion((value) => value + 1);
  };

  const visiblePlaces = useMemo(() => places.filter((place) => place.kind === kind).slice(0, 12), [kind, places]);
  const selectedPlace = places.find((place) => place.id === selectedPlaceId);
  const destination = selectedPlace
    ? { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude }
    : undefined;
  const routeCoordinates = useRoadRoute({
    enabled: Boolean(liveLocation && destination),
    origin: liveLocation,
    destination
  });
  const headingTarget =
    routeCoordinates[Math.min(6, Math.max(routeCoordinates.length - 1, 0))] ?? destination;
  const navigationCenter = routeCoordinates[0] ?? liveLocation;

  useEffect(() => {
    if (!selectedPlace || selectedPlace.kind !== kind) setSelectedPlaceId(visiblePlaces[0]?.id);
  }, [kind, selectedPlace, visiblePlaces]);

  useEffect(() => {
    if (!liveLocation || !destination) return;
    if (isNavigating) {
      if (isFollowing && navigationCenter) {
        mapRef.current?.animateCamera(
          {
            center: navigationCenter,
            zoom: 22.5,
            pitch: 15,
            heading: headingTarget ? bearingDegrees(liveLocation, headingTarget) : 0
          },
          { duration: 650 }
        );
      }
      return;
    }
    mapRef.current?.fitToCoordinates([liveLocation, destination], {
      edgePadding: { top: 150, right: 55, bottom: 360, left: 55 },
      animated: true
    });
  }, [destination?.latitude, destination?.longitude, headingTarget?.latitude, headingTarget?.longitude, isFollowing, isNavigating, liveLocation?.latitude, liveLocation?.longitude, navigationCenter?.latitude, navigationCenter?.longitude]);

  const startNavigation = () => {
    if (!liveLocation || !selectedPlace) return;
    if (followTimerRef.current) clearTimeout(followTimerRef.current);
    setIsNavigating(true);
    setIsFollowing(true);
    mapRef.current?.animateCamera(
      {
        center: navigationCenter ?? liveLocation,
        zoom: 22.5,
        pitch: 15,
        heading: headingTarget ? bearingDegrees(liveLocation, headingTarget) : 0
      },
      { duration: 900 }
    );
  };

  const stopNavigation = () => {
    if (followTimerRef.current) clearTimeout(followTimerRef.current);
    setIsNavigating(false);
    setIsFollowing(true);
    if (liveLocation && destination) {
      mapRef.current?.fitToCoordinates([liveLocation, destination], {
        edgePadding: { top: 150, right: 55, bottom: 360, left: 55 },
        animated: true
      });
    }
  };

  const recenterNavigation = () => {
    if (!liveLocation) return;
    setIsFollowing(true);
    mapRef.current?.animateCamera(
      {
        center: navigationCenter ?? liveLocation,
        zoom: 22.5,
        pitch: 15,
        heading: headingTarget ? bearingDegrees(liveLocation, headingTarget) : 0
      },
      { duration: 500 }
    );
  };

  const remainingDistance = liveLocation && selectedPlace ? distanceKm(liveLocation, selectedPlace) : undefined;

  useEffect(() => {
    return () => {
      if (followTimerRef.current) clearTimeout(followTimerRef.current);
    };
  }, []);

  const initialRegion = {
    latitude: liveLocation?.latitude ?? -3.3869,
    longitude: liveLocation?.longitude ?? 36.6829,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06
  };

  return (
    <View style={styles.container}>
      <AppMap
        ref={(instance) => { mapRef.current = instance; }}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        provider={getMapProvider(mapSource)}
        mapType={getMapType(mapSource)}
        {...getRideMapInteractionProps({ showsUserLocation: true })}
        maxZoomLevel={23}
        onPanDrag={() => {
          if (isNavigating) setIsFollowing(false);
        }}
      >
        <OpenStreetMapTiles source={mapSource} />
        {routeCoordinates.length > 1 ? (
          <>
            <Polyline coordinates={routeCoordinates} strokeColor="rgba(255,255,255,0.9)" strokeWidth={9} lineCap="round" lineJoin="round" />
            <Polyline coordinates={routeCoordinates} strokeColor={palette.primary} strokeWidth={5} lineCap="round" lineJoin="round" />
          </>
        ) : null}
        {visiblePlaces.map((place) => {
          const selected = place.id === selectedPlaceId;
          return (
            <Marker
              key={place.id}
              coordinate={{ latitude: place.latitude, longitude: place.longitude }}
              title={place.name}
              onPress={() => {
                if (!isNavigating) setSelectedPlaceId(place.id);
              }}
            >
              <View style={[styles.marker, selected && styles.markerSelected]}>
                <Ionicons name={place.kind === "fuel" ? "water" : "construct"} size={17} color="#FFFFFF" />
              </View>
            </Marker>
          );
        })}
      </AppMap>

      <SafeAreaView pointerEvents="box-none" style={styles.overlay} edges={["top", "left", "right"]}>
        <View style={styles.topBar}>
          <DriverSideMenu />
          <MapSourceSwitch value={mapSource} onChange={setMapSource} />
        </View>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {isNavigating && selectedPlace ? (
            <View style={styles.navigationPanel}>
              <View style={styles.navigationHeader}>
                <View style={styles.navigationIcon}>
                  <Ionicons name="navigate" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.routeCopy}>
                  <Text style={styles.navigationLabel}>
                    {remainingDistance !== undefined && remainingDistance < 0.05 ? "You have arrived" : "Navigation active"}
                  </Text>
                  <Text numberOfLines={1} style={styles.navigationDestination}>{selectedPlace.name}</Text>
                  <Text style={styles.navigationDistance}>
                    {remainingDistance !== undefined ? `${remainingDistance.toFixed(1)} km remaining` : "Updating location..."}
                  </Text>
                </View>
              </View>
              <View style={styles.navigationActions}>
                <Pressable onPress={recenterNavigation} style={[styles.navigationButton, styles.recenterButton]}>
                  <Ionicons name="locate" size={18} color={palette.primaryDark} />
                  <Text style={styles.recenterText}>{isFollowing ? "Following" : "Recenter"}</Text>
                </Pressable>
                <Pressable onPress={stopNavigation} style={[styles.navigationButton, styles.stopButton]}>
                  <Ionicons name="close" size={18} color="#FFFFFF" />
                  <Text style={styles.stopText}>Stop</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.title}>Nearby roadside places</Text>
              <Text style={styles.subtitle}>Choose a garage or filling station to mark a road route from your location.</Text>
              <View style={styles.filters}>
                {(["garage", "fuel"] as PlaceKind[]).map((filterKind) => {
                  const active = kind === filterKind;
                  return (
                    <Pressable key={filterKind} onPress={() => setKind(filterKind)} style={[styles.filterButton, active && styles.filterButtonActive]}>
                      <Ionicons name={filterKind === "fuel" ? "water-outline" : "construct-outline"} size={18} color={active ? "#FFFFFF" : palette.primaryDark} />
                      <Text style={[styles.filterText, active && styles.filterTextActive]}>
                        {filterKind === "fuel" ? "Filling stations" : "Garages"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {selectedPlace && liveLocation ? (
                <View style={styles.routeSummary}>
                  <Ionicons name="navigate" size={19} color={palette.primary} />
                  <View style={styles.routeCopy}>
                    <Text numberOfLines={1} style={styles.routeName}>{selectedPlace.name}</Text>
                    <Text style={styles.routeDistance}>{distanceKm(liveLocation, selectedPlace).toFixed(1)} km away</Text>
                  </View>
                  <Pressable onPress={startNavigation} style={styles.startButton}>
                    <Ionicons name="navigate" size={17} color="#FFFFFF" />
                    <Text style={styles.startText}>Start</Text>
                  </Pressable>
                </View>
              ) : null}
              {isLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color={palette.primary} />
                  <Text style={styles.message}>Finding nearby places...</Text>
                </View>
              ) : visiblePlaces.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.placeList}>
                  {visiblePlaces.map((place) => {
                    const selected = place.id === selectedPlaceId;
                    return (
                      <Pressable key={place.id} onPress={() => setSelectedPlaceId(place.id)} style={[styles.placeCard, selected && styles.placeCardSelected]}>
                        <Ionicons name={place.kind === "fuel" ? "water" : "construct"} size={20} color={palette.primary} />
                        <Text numberOfLines={2} style={styles.placeName}>{place.name}</Text>
                        {liveLocation ? <Text style={styles.placeDistance}>{distanceKm(liveLocation, place).toFixed(1)} km</Text> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.message}>{loadMessage}</Text>
                  {liveLocation ? (
                    <Pressable onPress={retrySearch} style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}>
                      <Ionicons name="refresh" size={17} color="#FFFFFF" />
                      <Text style={styles.retryText}>Try again</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.canvas },
  overlay: { flex: 1, justifyContent: "space-between" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18 },
  sheet: { paddingTop: 10, paddingHorizontal: 20, paddingBottom: 18, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "rgba(255,255,255,0.98)", borderWidth: 1, borderColor: palette.border },
  handle: { alignSelf: "center", width: 48, height: 5, borderRadius: 3, backgroundColor: palette.border },
  title: { marginTop: 13, fontSize: 24, fontWeight: "900", color: palette.ink },
  subtitle: { marginTop: 5, fontSize: 13, lineHeight: 18, color: palette.inkSoft },
  filters: { flexDirection: "row", gap: 10, marginTop: 15 },
  filterButton: { flex: 1, minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 15, backgroundColor: palette.accentSoft, borderWidth: 1, borderColor: palette.border },
  filterButtonActive: { backgroundColor: palette.primary, borderColor: palette.primary },
  filterText: { fontSize: 13, fontWeight: "800", color: palette.primaryDark },
  filterTextActive: { color: "#FFFFFF" },
  routeSummary: { marginTop: 12, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 15, backgroundColor: palette.accentSoft },
  routeCopy: { flex: 1 },
  routeName: { fontSize: 14, fontWeight: "800", color: palette.ink },
  routeDistance: { marginTop: 2, fontSize: 12, color: palette.inkSoft },
  startButton: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 15, borderRadius: 20, backgroundColor: palette.primary },
  startText: { fontSize: 13, fontWeight: "900", color: "#FFFFFF" },
  navigationPanel: { paddingTop: 14 },
  navigationHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  navigationIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: palette.primary },
  navigationLabel: { fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5, color: palette.primaryDark },
  navigationDestination: { marginTop: 2, fontSize: 18, fontWeight: "900", color: palette.ink },
  navigationDistance: { marginTop: 3, fontSize: 13, color: palette.inkSoft },
  navigationActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  navigationButton: { flex: 1, minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 15 },
  recenterButton: { backgroundColor: palette.accentSoft, borderWidth: 1, borderColor: palette.border },
  recenterText: { fontSize: 13, fontWeight: "800", color: palette.primaryDark },
  stopButton: { backgroundColor: palette.ink },
  stopText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  loadingRow: { minHeight: 92, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  message: { paddingVertical: 25, textAlign: "center", fontSize: 13, lineHeight: 18, color: palette.inkSoft },
  emptyState: { alignItems: "center", paddingBottom: 4 },
  retryButton: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 18, borderRadius: 14, backgroundColor: palette.primary },
  retryButtonPressed: { opacity: 0.78 },
  retryText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
  placeList: { gap: 10, paddingTop: 12, paddingRight: 10 },
  placeCard: { width: 145, minHeight: 92, padding: 12, borderRadius: 16, backgroundColor: "#F5F7FA", borderWidth: 1, borderColor: palette.border },
  placeCardSelected: { backgroundColor: palette.accentSoft, borderColor: palette.primary },
  placeName: { marginTop: 7, fontSize: 13, lineHeight: 17, fontWeight: "800", color: palette.ink },
  placeDistance: { marginTop: "auto", paddingTop: 5, fontSize: 11, color: palette.inkSoft },
  marker: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: palette.primaryDark, borderWidth: 3, borderColor: "#FFFFFF" },
  markerSelected: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.primary }
});
