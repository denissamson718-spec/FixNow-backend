import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import AppMap, { AppMapHandle, AppMapMarker as Marker, AppMapPolyline as Polyline } from "../../../components/AppMap";
import { BackArrowButton } from "../../../components/BackArrowButton";
import { MapSourceSwitch } from "../../../components/MapSourceSwitch";
import { getMapProvider, getMapType, OpenStreetMapTiles } from "../../../components/mapSource";
import { getRideMapInteractionProps } from "../../../components/rideMapConfig";
import { useLiveLocation } from "../../../hooks/useLiveLocation";
import { useRoadRoute } from "../../../hooks/useRoadRoute";
import { useAppContext } from "../../../state/AppContext";
import { palette } from "../../../theme/palette";

type Coordinate = { latitude: number; longitude: number };

function getDistanceKm(origin: Coordinate, destination: Coordinate) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDifference = toRadians(destination.latitude - origin.latitude);
  const longitudeDifference = toRadians(destination.longitude - origin.longitude);
  const value = Math.sin(latitudeDifference / 2) ** 2 + Math.cos(toRadians(origin.latitude)) * Math.cos(toRadians(destination.latitude)) * Math.sin(longitudeDifference / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

export function RouteFinderScreen() {
  const navigation = useNavigation<any>();
  const { mechanics, activeRequest, mapSource, setMapSource } = useAppContext();
  const liveLocation = useLiveLocation();
  const mapRef = useRef<AppMapHandle | null>(null);
  const availableMechanics = mechanics.filter((mechanic) => mechanic.isAvailable);
  const [selectedMechanicId, setSelectedMechanicId] = useState<string | undefined>(availableMechanics[0]?.id);
  const selectedMechanic = availableMechanics.find((mechanic) => mechanic.id === selectedMechanicId);
  const origin = liveLocation ?? (activeRequest.latitude && activeRequest.longitude ? { latitude: activeRequest.latitude, longitude: activeRequest.longitude } : undefined);
  const destination = selectedMechanic ? { latitude: selectedMechanic.latitude, longitude: selectedMechanic.longitude } : undefined;
  const routeCoordinates = useRoadRoute({ enabled: Boolean(origin && destination), origin, destination });
  const distanceKm = useMemo(() => (origin && destination ? getDistanceKm(origin, destination) : undefined), [destination, origin]);

  useEffect(() => { if (!selectedMechanicId && availableMechanics[0]) setSelectedMechanicId(availableMechanics[0].id); }, [availableMechanics, selectedMechanicId]);
  useEffect(() => { const points = [origin, destination].filter(Boolean) as Coordinate[]; if (points.length > 1) mapRef.current?.fitToCoordinates(points, { edgePadding: { top: 150, right: 44, bottom: 330, left: 44 }, animated: true }); }, [destination?.latitude, destination?.longitude, origin?.latitude, origin?.longitude]);

  const initialRegion = { latitude: origin?.latitude ?? destination?.latitude ?? -6.7469, longitude: origin?.longitude ?? destination?.longitude ?? 39.2897, latitudeDelta: 0.035, longitudeDelta: 0.035 };
  return <View style={styles.container}>
    <AppMap ref={(instance) => { mapRef.current = instance; }} style={StyleSheet.absoluteFill} initialRegion={initialRegion} provider={getMapProvider(mapSource)} mapType={getMapType(mapSource)} {...getRideMapInteractionProps({ showsUserLocation: true })}>
      <OpenStreetMapTiles source={mapSource} />
      {routeCoordinates.length > 1 ? <Polyline coordinates={routeCoordinates} strokeColor={palette.primary} strokeWidth={5} lineCap="round" lineJoin="round" /> : null}
      {origin ? <Marker coordinate={origin} title="Your location" pinColor={palette.primary} /> : null}
      {destination ? <Marker coordinate={destination} title={selectedMechanic?.name} pinColor={palette.success} /> : null}
    </AppMap>
    <SafeAreaView style={styles.overlay} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.topBar}><BackArrowButton onPress={() => navigation.goBack()} /><MapSourceSwitch value={mapSource} onChange={setMapSource} /></View>
      <View style={styles.sheet}>
        <View style={styles.headingRow}><View><Text style={styles.title}>Route Finder</Text><Text style={styles.subtitle}>Find the best route from you to a nearby mechanic.</Text></View><Ionicons name="navigate" size={24} color={palette.primary} /></View>
        {selectedMechanic ? <View style={styles.routeSummary}><Text style={styles.routeName}>To {selectedMechanic.name}</Text><Text style={styles.routeMeta}>{distanceKm ? `${distanceKm.toFixed(1)} km away` : "Getting your location..."} · about {selectedMechanic.etaMinutes || "--"} min</Text></View> : <Text style={styles.emptyText}>No available mechanics are currently sharing their location.</Text>}
        <Text style={styles.sectionTitle}>Available mechanics</Text>
        <View style={styles.mechanicList}>{availableMechanics.map((mechanic) => { const isSelected = mechanic.id === selectedMechanicId; return <Pressable key={mechanic.id} onPress={() => setSelectedMechanicId(mechanic.id)} style={({ pressed }) => [styles.mechanicOption, isSelected && styles.mechanicOptionSelected, pressed && styles.pressed]}><View style={styles.mechanicCopy}><Text style={styles.mechanicName}>{mechanic.name}</Text><Text style={styles.mechanicDetails}>{mechanic.specialty} · {mechanic.etaMinutes || "--"} min</Text></View><Ionicons name={isSelected ? "radio-button-on" : "radio-button-off"} size={22} color={isSelected ? palette.primary : palette.inkSoft} /></Pressable>; })}</View>
        {Platform.OS === "web" ? <Text style={styles.webHint}>Route lines are shown in the mobile app; the web map still shows both locations.</Text> : null}
      </View>
    </SafeAreaView>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surface }, overlay: { flex: 1, justifyContent: "space-between" }, topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18 }, sheet: { marginHorizontal: 14, marginBottom: 12, borderRadius: 24, padding: 18, backgroundColor: "rgba(255,255,255,0.97)", maxHeight: "58%" }, headingRow: { flexDirection: "row", justifyContent: "space-between", gap: 16 }, title: { fontSize: 23, fontWeight: "800", color: palette.ink }, subtitle: { marginTop: 4, fontSize: 13, lineHeight: 18, color: palette.inkSoft, maxWidth: 280 }, routeSummary: { marginTop: 16, padding: 13, borderRadius: 16, backgroundColor: "#E8F7EE" }, routeName: { fontSize: 15, fontWeight: "800", color: palette.primaryDark }, routeMeta: { marginTop: 4, fontSize: 13, color: palette.inkSoft }, emptyText: { marginTop: 16, fontSize: 14, color: palette.inkSoft }, sectionTitle: { marginTop: 18, marginBottom: 8, fontSize: 14, fontWeight: "800", color: palette.ink }, mechanicList: { gap: 8 }, mechanicOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, padding: 12, borderRadius: 14, backgroundColor: "#F5F7FA", borderWidth: 1, borderColor: "transparent" }, mechanicOptionSelected: { borderColor: palette.primary, backgroundColor: "#F3FAF5" }, mechanicCopy: { flex: 1 }, mechanicName: { fontSize: 15, fontWeight: "800", color: palette.ink }, mechanicDetails: { marginTop: 3, fontSize: 12, color: palette.inkSoft }, pressed: { opacity: 0.8 }, webHint: { marginTop: 12, fontSize: 11, lineHeight: 15, color: palette.inkSoft }
});
