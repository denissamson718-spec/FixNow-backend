import React, { useMemo, useRef, useEffect } from "react";
import { Image, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppMap, { AppMapMarker as Marker, AppMapPolyline as Polyline, MapRegion as Region } from "./AppMap";
import { useAppContext } from "../state/AppContext";
import { palette } from "../theme/palette";
import { getMapProvider, getMapType, OpenStreetMapTiles } from "./mapSource";
import { calculateDistanceMeters } from "../utils/mapTracking";
import type { AppMapHandle } from "./AppMap";
import { useSmoothMapTracking } from "../hooks/useSmoothMapTracking";
import { useMultipleDistances } from "../hooks/useDistanceTracking";

export type MapMechanicPreview = {
  id: string;
  name: string;
  specialty: string;
  etaMinutes: number;
  distanceKm: number;
  rating: number;
  priceLabel: string;
  latitude: number;
  longitude: number;
  profilePhoto?: string;
};

const fallbackRegion: Region = {
  latitude: -6.7469,
  longitude: 39.2897,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018
};

function buildRegion({
  driverLatitude,
  driverLongitude,
  mechanics
}: {
  driverLatitude?: number;
  driverLongitude?: number;
  mechanics?: MapMechanicPreview[];
}) {
  const points = [
    ...(typeof driverLatitude === "number" && typeof driverLongitude === "number"
      ? [{ latitude: driverLatitude, longitude: driverLongitude }]
      : []),
    ...(mechanics?.map((mechanic) => ({
      latitude: mechanic.latitude,
      longitude: mechanic.longitude
    })) ?? [])
  ];

  if (!points.length) {
    return fallbackRegion;
  }

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  // When all points are very close together (same location), use a fixed zoom
  const latDelta = maxLatitude - minLatitude;
  const lonDelta = maxLongitude - minLongitude;
  const isAtSameLocation = latDelta < 0.0002 && lonDelta < 0.0002;

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: isAtSameLocation ? 0.015 : Math.max(latDelta * 1.8, 0.012),
    longitudeDelta: isAtSameLocation ? 0.015 : Math.max(lonDelta * 1.8, 0.012)
  };
}

export function MapPreview({
  title,
  subtitle,
  mechanics,
  highlightedMechanicId,
  driverLatitude,
  driverLongitude,
  mapHeight = 320
}: {
  title: string;
  subtitle: string;
  mechanics?: MapMechanicPreview[];
  highlightedMechanicId?: string;
  driverLatitude?: number;
  driverLongitude?: number;
  mapHeight?: number;
}) {
  const { mapSource } = useAppContext();
  const mapRef = useRef<AppMapHandle | null>(null);
  const hasMechanics = Boolean(mechanics?.length);
  
  // Calculate real-time distances for all mechanics
  const distances = useMultipleDistances(
    driverLatitude,
    driverLongitude,
    mechanics?.map((m) => ({ id: m.id, latitude: m.latitude, longitude: m.longitude })) ?? []
  );
  
  // Memoize region to prevent unnecessary recalculations and map shifts
  const region = useMemo(() => {
    return buildRegion({
      driverLatitude,
      driverLongitude,
      mechanics
    });
  }, [driverLatitude, driverLongitude, mechanics]);

  // Get the highlighted mechanic for smooth tracking
  const highlightedMechanic = mechanics?.find((m) => m.id === highlightedMechanicId);
  const highlightedDistance = highlightedMechanic ? distances.get(highlightedMechanic.id) : undefined;

  // Smooth tracking of highlighted mechanic
  useSmoothMapTracking(
    mapRef,
    highlightedMechanic
      ? { latitude: highlightedMechanic.latitude, longitude: highlightedMechanic.longitude }
      : undefined,
    Boolean(highlightedMechanic),
    { duration: 900, zoom: 15 }
  );

  // Create polyline from mechanic to driver if highlighted mechanic exists
  const polylineCoordinates = useMemo(() => {
    if (!highlightedMechanic || typeof driverLatitude !== "number" || typeof driverLongitude !== "number") {
      return undefined;
    }

    return [
      { latitude: highlightedMechanic.latitude, longitude: highlightedMechanic.longitude },
      { latitude: driverLatitude, longitude: driverLongitude }
    ];
  }, [highlightedMechanic, driverLatitude, driverLongitude]);

  return (
    <View>
      <View style={[styles.mapWrap, { height: mapHeight }]}>
        <AppMap
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          provider={getMapProvider(mapSource)}
          mapType={getMapType(mapSource)}
          showsUserLocation={false}
          showsCompass
          showsScale
        >
          <OpenStreetMapTiles source={mapSource} />

          {/* Route polyline from mechanic to driver */}
          {polylineCoordinates ? (
            <Polyline
              coordinates={polylineCoordinates}
              strokeColor={palette.primary}
              strokeWidth={3}
              lineDashPattern={[5, 5]}
            />
          ) : null}

          {typeof driverLatitude === "number" && typeof driverLongitude === "number" ? (
            <Marker
              coordinate={{ latitude: driverLatitude, longitude: driverLongitude }}
              title="Driver location"
              description={subtitle}
              pinColor={palette.primary}
            />
          ) : null}

          {mechanics?.map((mechanic) => {
            const isHighlighted = mechanic.id === highlightedMechanicId;
            const initials = mechanic.name
              .split(" ")
              .map((part) => part[0]?.toUpperCase())
              .join("")
              .slice(0, 2);

            return (
              <Marker
                key={mechanic.id}
                coordinate={{ latitude: mechanic.latitude, longitude: mechanic.longitude }}
                title={mechanic.name}
                description={`${mechanic.specialty} - ${mechanic.priceLabel}`}
              >
                <View style={styles.markerWrap}>
                  <View style={[styles.markerCard, isHighlighted && styles.markerCardActive]}>
                    {mechanic.profilePhoto ? (
                      <Image source={{ uri: mechanic.profilePhoto }} style={styles.markerAvatar} />
                    ) : (
                      <View style={styles.markerAvatarFallback}>
                        <Text style={styles.markerAvatarFallbackText}>{initials || "M"}</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.markerStem, isHighlighted && styles.markerStemActive]} />
                </View>
              </Marker>
            );
          })}
        </AppMap>

        <View style={styles.badge}>
          <Text style={styles.badgeTitle}>{title}</Text>
          <Text style={styles.badgeSubtitle}>
            {highlightedDistance
              ? `${highlightedDistance.distanceKm} km away • ${highlightedDistance.etaMinutes} min`
              : subtitle}
          </Text>
        </View>
      </View>

      {hasMechanics ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.profileRow}
          style={styles.profileScroller}
        >
          {mechanics?.map((mechanic) => {
            const isHighlighted = mechanic.id === highlightedMechanicId;
            const liveDistance = distances.get(mechanic.id);

            return (
              <View key={mechanic.id} style={[styles.profileCard, isHighlighted && styles.profileCardActive]}>
                <View style={styles.profileTopRow}>
                  {mechanic.profilePhoto ? (
                    <Image source={{ uri: mechanic.profilePhoto }} style={styles.profileAvatar} />
                  ) : (
                    <View style={styles.profileAvatarFallback}>
                      <Text style={styles.profileAvatarFallbackText}>
                        {mechanic.name
                          .split(" ")
                          .map((part) => part[0]?.toUpperCase())
                          .join("")
                          .slice(0, 2) || "M"}
                      </Text>
                    </View>
                  )}
                  <View style={styles.profileHeader}>
                    <Text style={styles.profileName} numberOfLines={1}>
                      {mechanic.name}
                    </Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={14} color="#F2B938" />
                      <Text style={styles.profileRating}>{mechanic.rating.toFixed(1)}/5</Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.profileSpecialty} numberOfLines={1}>
                  {mechanic.specialty}
                </Text>
                <View style={styles.profileMetaRow}>
                  <Text style={styles.profileMeta}>{liveDistance?.etaMinutes ?? mechanic.etaMinutes} min</Text>
                  <Text style={styles.profileMeta}>{liveDistance?.distanceKm ?? mechanic.distanceKm} km</Text>
                  <Text style={styles.profileMeta}>{mechanic.priceLabel}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    borderRadius: 28,
    overflow: "hidden"
  },
  map: {
    width: "100%",
    height: "100%"
  },
  markerWrap: {
    alignItems: "center"
  },
  markerCard: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 2,
    borderColor: palette.accent,
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    overflow: "hidden"
  },
  markerCardActive: {
    borderColor: palette.primary,
    transform: [{ scale: 1.06 }]
  },
  markerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21
  },
  markerAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F7EE"
  },
  markerAvatarFallbackText: {
    fontSize: 15,
    fontWeight: "800",
    color: palette.primaryDark
  },
  markerStem: {
    width: 4,
    height: 14,
    borderRadius: 999,
    marginTop: -2,
    backgroundColor: palette.accent
  },
  markerStemActive: {
    backgroundColor: palette.primary
  },
  badge: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: "rgba(255, 253, 252, 0.92)",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 15
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.ink
  },
  badgeSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: palette.inkSoft
  },
  profileScroller: {
    marginTop: 14
  },
  profileRow: {
    gap: 14,
    paddingRight: 12
  },
  profileCard: {
    width: 272,
    minHeight: 148,
    borderRadius: 24,
    padding: 18,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: "#1D1D1D",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4
  },
  profileCardActive: {
    borderColor: palette.primary,
    backgroundColor: "#ECF8F0"
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  profileAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#E7F1EA",
    overflow: "hidden"
  },
  profileAvatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F7EE",
    borderWidth: 1,
    borderColor: palette.border
  },
  profileAvatarFallbackText: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.primaryDark
  },
  profileHeader: {
    flex: 1
  },
  profileName: {
    fontSize: 17,
    fontWeight: "800",
    color: palette.ink
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6
  },
  profileRating: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.primaryDark
  },
  profileSpecialty: {
    marginTop: 12,
    fontSize: 14,
    color: palette.inkSoft
  },
  profileMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 14
  },
  profileMeta: {
    fontSize: 13,
    color: palette.inkSoft
  }
});
