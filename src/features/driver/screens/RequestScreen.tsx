import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import AppMap, { AppMapHandle, AppMapMarker as Marker, MapRegion as Region } from "../../../components/AppMap";
import { BackArrowButton } from "../../../components/BackArrowButton";
import { HighlightedLocationMarker } from "../../../components/HighlightedLocationMarker";
import { MapSourceSwitch } from "../../../components/MapSourceSwitch";
import { getMapProvider, getMapType, OpenStreetMapTiles } from "../../../components/mapSource";
import { getRideMapInteractionProps } from "../../../components/rideMapConfig";
import { OnlineStatusPill } from "../../../components/OnlineStatusPill";
import { useLiveLocation } from "../../../hooks/useLiveLocation";
import { useSmoothMapTracking } from "../../../hooks/useSmoothMapTracking";
import { useMultipleDistances } from "../../../hooks/useDistanceTracking";
import { useAppContext } from "../../../state/AppContext";
import { palette } from "../../../theme/palette";
import { DriverSideMenu } from "../components/DriverSideMenu";
import { UnreadMessageBadge } from "../../../components/UnreadMessageBadge";

const requestAccent = "#2F8F5B";
const requestAccentSoft = "#E8F7EE";
const requestSurface = "#FFFFFF";
const requestInk = "#101828";
const requestInkSoft = "#667085";
const requestBorder = "#D7DCE1";
const SHEET_PEEK_HEIGHT = 220;
const commonCarProblemGroups = [
  {
    title: "Starting",
    problems: [
      { label: "Engine won't start", icon: "construct-outline" },
      { label: "Battery dead", icon: "battery-dead-outline" },
      { label: "Starter problem", icon: "flash-outline" },
      { label: "Alternator issue", icon: "sync-outline" }
    ]
  },
  {
    title: "Roadside",
    problems: [
      { label: "Flat tyre", icon: "disc-outline" },
      { label: "Brake problem", icon: "warning-outline" },
      { label: "Fuel finished", icon: "water-outline" },
      { label: "Locked keys inside", icon: "key-outline" }
    ]
  },
  {
    title: "Mechanical",
    problems: [
      { label: "Overheating", icon: "flame-outline" },
      { label: "Gearbox issue", icon: "settings-outline" },
      { label: "Suspension noise", icon: "pulse-outline" },
      { label: "Oil leak", icon: "color-fill-outline" }
    ]
  }
] as const;

function buildRegion({
  latitude,
  longitude,
  mechanics
}: {
  latitude?: number;
  longitude?: number;
  mechanics: Array<{ latitude: number; longitude: number }>;
}): Region {
  const points = [
    ...(typeof latitude === "number" && typeof longitude === "number" ? [{ latitude, longitude }] : []),
    ...mechanics
  ];

  if (!points.length) {
    return {
      latitude: -6.7469,
      longitude: 39.2897,
      latitudeDelta: 0.018,
      longitudeDelta: 0.018
    };
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

function parseCurrency(value: string) {
  const normalized = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(normalized) ? normalized : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function fitMapToPoints(
  map: AppMapHandle | null,
  points: Array<{ latitude: number; longitude: number }>
) {
  if (!map || !points.length) {
    return;
  }

  if (points.length === 1) {
    map.animateCamera(
      {
        center: points[0],
        zoom: 15
      },
      { duration: 900 }
    );
    return;
  }

  map.fitToCoordinates(points, {
    edgePadding: {
      top: 180,
      right: 56,
      bottom: 360,
      left: 56
    },
    animated: true
  });
}

export function RequestScreen() {
  const navigation = useNavigation<any>();
  const { activeRequest, mechanics, mapSource, setMapSource, submitRequest, unreadJobMessageCount, updateRequest, userProfile } = useAppContext();
  const liveLocation = useLiveLocation();
  const { height: screenHeight } = useWindowDimensions();
  const [sheetHeight, setSheetHeight] = useState(0);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [isAutoFollowEnabled, setIsAutoFollowEnabled] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const translateY = useRef(new Animated.Value(0)).current;
  const currentSheetY = useRef(0);
  const dragStartY = useRef(0);
  const hasInitializedSheet = useRef(false);
  const mapRef = useRef<AppMapHandle | null>(null);
  const formScrollRef = useRef<ScrollView | null>(null);
  const vehicleInputRef = useRef<TextInput | null>(null);
  const collapsedOffset = screenHeight - SHEET_PEEK_HEIGHT;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("DriverTabs");
  };

  const handleRecenterMap = () => {
    setIsAutoFollowEnabled(true);

    const points = [
      ...(typeof driverLatitude === "number" && typeof driverLongitude === "number"
        ? [{ latitude: driverLatitude, longitude: driverLongitude }]
        : []),
      ...nearbyMechanics.map((mechanic) => ({
        latitude: mechanic.latitude,
        longitude: mechanic.longitude
      }))
    ];

    fitMapToPoints(mapRef.current, points);
  };

  const driverLatitude = liveLocation?.latitude ?? (activeRequest.latitude || undefined);
  const driverLongitude = liveLocation?.longitude ?? (activeRequest.longitude || undefined);
  const nearbyMechanics = mechanics.filter((mechanic) => mechanic.isAvailable);
  
  // Calculate real-time distances for all mechanics
  const liveDistances = useMultipleDistances(
    driverLatitude,
    driverLongitude,
    nearbyMechanics.map((m) => ({ id: m.id, latitude: m.latitude, longitude: m.longitude }))
  );
  
  const fastestEta = nearbyMechanics.length ? Math.min(...nearbyMechanics.map((mechanic) => liveDistances.get(mechanic.id)?.etaMinutes ?? mechanic.etaMinutes)) : 0;
  const topRated = nearbyMechanics.length
    ? nearbyMechanics.reduce((best, mechanic) => (mechanic.rating > best.rating ? mechanic : best), nearbyMechanics[0])
    : undefined;

  // Memoize region to prevent unnecessary recalculations and map shifts
  const region = useMemo(() => {
    return buildRegion({
      latitude: driverLatitude,
      longitude: driverLongitude,
      mechanics: nearbyMechanics.map((mechanic) => ({
        latitude: mechanic.latitude,
        longitude: mechanic.longitude
      }))
    });
  }, [driverLatitude, driverLongitude, nearbyMechanics]);

  // Use smooth tracking for auto-follow when enabled
  useSmoothMapTracking(
    mapRef,
    isAutoFollowEnabled && typeof driverLatitude === "number" && typeof driverLongitude === "number"
      ? { latitude: driverLatitude, longitude: driverLongitude }
      : undefined,
    isAutoFollowEnabled,
    { duration: 600, zoom: 15 }
  );

  const isRequestReady = Boolean(
    activeRequest.locationLabel.trim() &&
      activeRequest.issue.trim() &&
      activeRequest.vehicle.trim()
  );

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setIsKeyboardVisible(true);
      // iOS overlays the keyboard; Android already resizes the app window.
      setKeyboardInset(Platform.OS === "ios" ? event.endCoordinates.height : 0);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const scrollFormTo = useCallback((y?: number) => {
    setTimeout(() => {
      if (typeof y === "number") {
        formScrollRef.current?.scrollTo({ y, animated: true });
      } else {
        formScrollRef.current?.scrollToEnd({ animated: true });
      }
    }, 220);
  }, []);

  useEffect(() => {
    const listenerId = translateY.addListener(({ value }) => {
      currentSheetY.current = value;
      setIsSheetExpanded(value < Math.max(collapsedOffset - 8, 0));
    });

    return () => {
      translateY.removeListener(listenerId);
    };
  }, [collapsedOffset, translateY]);

  useEffect(() => {
    if (!collapsedOffset) {
      return;
    }

    if (!hasInitializedSheet.current) {
      hasInitializedSheet.current = true;
      translateY.setValue(0);
      currentSheetY.current = 0;
      setIsSheetExpanded(true);
      return;
    }

    translateY.setValue(clamp(currentSheetY.current, 0, collapsedOffset));
  }, [collapsedOffset, translateY]);

  useEffect(() => {
    if (!isAutoFollowEnabled) {
      return;
    }

    const points = [
      ...(typeof driverLatitude === "number" && typeof driverLongitude === "number"
        ? [{ latitude: driverLatitude, longitude: driverLongitude }]
        : []),
      ...nearbyMechanics.map((mechanic) => ({
        latitude: mechanic.latitude,
        longitude: mechanic.longitude
      }))
    ];

    fitMapToPoints(mapRef.current, points);
  }, [driverLatitude, driverLongitude, isAutoFollowEnabled, mapSource, nearbyMechanics]);

  const animateSheet = useCallback(
    (toValue: number) => {
      Animated.timing(translateY, {
        toValue,
        useNativeDriver: Platform.OS !== "web",
        duration: toValue === 0 ? 1600 : 1200,
        easing: toValue === 0 ? Easing.bezier(0.16, 1, 0.3, 1) : Easing.inOut(Easing.quad)
      }).start();
    },
    [translateY]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 3,
        onPanResponderGrant: () => {
          Keyboard.dismiss();
          translateY.stopAnimation((value) => {
            dragStartY.current = value;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          translateY.setValue(clamp(dragStartY.current + gestureState.dy, 0, collapsedOffset));
        },
        onPanResponderRelease: (_, gestureState) => {
          const isTap = Math.abs(gestureState.dy) < 6 && Math.abs(gestureState.dx) < 6;

          if (isTap) {
            animateSheet(0);
            return;
          }

          const nextValue = clamp(dragStartY.current + gestureState.dy, 0, collapsedOffset);
          const shouldCollapse = gestureState.vy > 0.45 || nextValue > collapsedOffset * 0.45;

          animateSheet(shouldCollapse ? collapsedOffset : 0);
        },
        onPanResponderTerminate: () => {
          animateSheet(currentSheetY.current > collapsedOffset * 0.45 ? collapsedOffset : 0);
        }
      }),
    [animateSheet, collapsedOffset, translateY]
  );

  const handleSubmit = () => {
    if (!isRequestReady) {
      Alert.alert("Missing details", "Please add your location, vehicle, and problem before requesting help.");
      return;
    }

    submitRequest(
      liveLocation
        ? {
            latitude: liveLocation.latitude,
            longitude: liveLocation.longitude
          }
        : undefined
    );
    navigation.navigate("NearbyMechanics");
  };

  return (
    <View style={styles.container}>
      <AppMap
        ref={(instance) => {
          mapRef.current = instance;
        }}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        provider={getMapProvider(mapSource)}
        mapType={getMapType(mapSource)}
        {...getRideMapInteractionProps({ showsUserLocation: true })}
        onPress={Keyboard.dismiss}
        onPanDrag={() => setIsAutoFollowEnabled(false)}
        onRegionChangeComplete={(_, details) => {
          if (details?.isGesture) {
            setIsAutoFollowEnabled(false);
          }
        }}
      >
        <OpenStreetMapTiles source={mapSource} />

        {typeof driverLatitude === "number" && typeof driverLongitude === "number" ? (
          <Marker
            coordinate={{ latitude: driverLatitude, longitude: driverLongitude }}
            title="Pickup location"
            description={activeRequest.locationLabel}
            pinColor={requestAccent}
          >
            <HighlightedLocationMarker
              accentColor={requestAccent}
              badgeLabel="You"
              fallbackLabel={userProfile.fullName}
              iconName="person"
              profilePhotoUri={userProfile.profilePhoto?.uri}
            />
          </Marker>
        ) : null}

        {nearbyMechanics.map((mechanic) => (
          <Marker
            key={mechanic.id}
            coordinate={{ latitude: mechanic.latitude, longitude: mechanic.longitude }}
            title={mechanic.name}
            description={`${mechanic.etaMinutes} min away`}
          >
            <View style={styles.mechanicMarker}>
              <View style={styles.mechanicMarkerDot} />
            </View>
          </Marker>
        ))}
      </AppMap>

      <LinearGradient
        pointerEvents="none"
        colors={["rgba(15, 23, 42, 0.38)", "rgba(15, 23, 42, 0.12)", "transparent"]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView pointerEvents="box-none" style={styles.overlay} edges={["top", "left", "right"]}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <DriverSideMenu />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open job chat"
              onPress={() => navigation.navigate("Chat")}
              style={({ pressed }) => [styles.mapActionButton, pressed && styles.mapActionButtonPressed]}
            >
              <Ionicons name="chatbubbles" size={20} color={requestInk} />
              <UnreadMessageBadge count={unreadJobMessageCount} />
            </Pressable>
          </View>
          <View style={styles.topBarRight}>
            <MapSourceSwitch value={mapSource} onChange={setMapSource} />
            <View style={styles.mapControlRow}>
              <Pressable onPress={handleRecenterMap} style={({ pressed }) => [styles.mapActionButton, pressed && styles.mapActionButtonPressed]}>
                <Ionicons name="locate" size={18} color={requestInk} />
              </Pressable>
            </View>
          </View>
        </View>

        {isSheetExpanded ? (
          <Pressable
            style={styles.backdrop}
            onPress={() => {
              if (isKeyboardVisible) {
                Keyboard.dismiss();
                return;
              }

              animateSheet(collapsedOffset);
            }}
          />
        ) : null}

        <Animated.View
          pointerEvents="box-none"
          style={[styles.sheetWrap, { bottom: keyboardInset, transform: [{ translateY }] }]}
          onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}
        >
          <View style={styles.sheet}>
            <View {...panResponder.panHandlers} style={styles.dragArea}>
              <View style={styles.sheetHandle} />
              <View style={styles.liveBadge}>
                <OnlineStatusPill label={`${nearbyMechanics.length} online`} compact />
              </View>
              <Text style={styles.sheetTitle}>Request roadside help</Text>
              <Text style={styles.sheetSubtitle}>
                Drag down for full map, or drag up to continue filling the request details.
              </Text>
            </View>

            <ScrollView
              ref={formScrollRef}
              style={styles.formScroll}
              contentContainerStyle={styles.formContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              onScrollBeginDrag={Keyboard.dismiss}
            >
              <View style={styles.routeCard}>
                <View style={styles.routeIcons}>
                  <View style={styles.pickupIcon}>
                    <Ionicons name="ellipse" size={10} color={requestAccent} />
                  </View>
                  <View style={styles.routeLine} />
                  <View style={styles.issueIcon}>
                    <Ionicons name="construct" size={14} color={requestInk} />
                  </View>
                </View>

                <View style={styles.routeInputs}>
                  <Text style={styles.fieldLabel}>Pickup location</Text>
                  <TextInput
                    value={activeRequest.locationLabel}
                    onChangeText={(value) => updateRequest({ locationLabel: value })}
                    placeholder="Current location"
                    placeholderTextColor="#98A2B3"
                    style={styles.routeInput}
                    onFocus={() => scrollFormTo(0)}
                  />

                  <View style={styles.routeDivider} />

                  <Text style={styles.fieldLabel}>Problem</Text>
                  <TextInput
                    value={activeRequest.issue}
                    onChangeText={(value) => updateRequest({ issue: value })}
                    placeholder="Battery dead, puncture, engine issue..."
                    placeholderTextColor="#98A2B3"
                    style={styles.routeInput}
                    onFocus={() => scrollFormTo(54)}
                  />

                  <Text style={styles.problemHelper}>Tap a common problem below or type your own.</Text>

                  <View style={styles.problemGroups}>
                    {commonCarProblemGroups.map((group) => (
                      <View key={group.title} style={styles.problemGroup}>
                        <Text style={styles.problemGroupTitle}>{group.title}</Text>
                        <View style={styles.problemGrid}>
                          {group.problems.map((problem) => {
                            const isSelected = activeRequest.issue.trim().toLowerCase() === problem.label.toLowerCase();

                            return (
                              <Pressable
                                key={problem.label}
                                onPress={() => updateRequest({ issue: problem.label })}
                                style={[styles.problemChip, isSelected && styles.problemChipActive]}
                              >
                                <View style={[styles.problemChipIconWrap, isSelected && styles.problemChipIconWrapActive]}>
                                  <Ionicons
                                    name={problem.icon}
                                    size={15}
                                    color={isSelected ? requestAccent : requestInkSoft}
                                  />
                                </View>
                                <Text style={[styles.problemChipText, isSelected && styles.problemChipTextActive]}>
                                  {problem.label}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.compactRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Enter vehicle details"
                  onPress={() => vehicleInputRef.current?.focus()}
                  style={({ pressed }) => [styles.compactField, pressed && styles.compactFieldPressed]}
                >
                  <View style={styles.compactHeader}>
                    <View style={styles.compactIconWrap}>
                      <Ionicons name="car-sport-outline" size={16} color={requestAccent} />
                    </View>
                    <Text style={styles.compactLabel}>Vehicle</Text>
                  </View>
                  <TextInput
                    ref={vehicleInputRef}
                    value={activeRequest.vehicle}
                    onChangeText={(value) => updateRequest({ vehicle: value })}
                    placeholder="Toyota Premio 2011"
                    placeholderTextColor="#98A2B3"
                    style={styles.compactInput}
                    onFocus={() => scrollFormTo(760)}
                    editable
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                </Pressable>
              </View>

              <View style={styles.metaPanel}>
                <View style={styles.metricsRow}>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>{fastestEta || 0} min</Text>
                    <Text style={styles.metricLabel}>Fastest ETA</Text>
                  </View>
                  <View style={styles.metricCard}>
                    <Text style={styles.metricValue}>{topRated?.rating?.toFixed(1) ?? "5.0"}</Text>
                    <Text style={styles.metricLabel}>Top rated</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.notesLabel}>Notes for mechanic</Text>
              <TextInput
                value={activeRequest.notes}
                onChangeText={(value) => updateRequest({ notes: value })}
                placeholder="Landmarks, gate instructions, or anything that helps the mechanic find you faster."
                placeholderTextColor="#98A2B3"
                style={styles.notesInput}
                multiline
                onFocus={() => scrollFormTo()}
              />

              <Text style={styles.footerText}>
                You can collapse this sheet anytime to inspect the full map, then drag it back up to continue.
              </Text>
            </ScrollView>
            {!isKeyboardVisible ? <View style={styles.stickyActionFooter}>
              {isRequestReady ? (
                <View style={styles.pickupReadyRow}>
                  <Ionicons name="location" size={18} color={requestAccent} />
                  <View style={styles.pickupReadyCopy}>
                    <Text style={styles.pickupReadyTitle}>Pickup ready</Text>
                    <Text numberOfLines={1} style={styles.pickupReadyLocation}>{activeRequest.locationLabel}</Text>
                  </View>
                </View>
              ) : null}
              <Pressable
                onPress={handleSubmit}
                disabled={!isRequestReady}
                style={({ pressed }) => [
                  styles.requestButton,
                  styles.stickyRequestButton,
                  !isRequestReady && styles.requestButtonDisabled,
                  pressed && isRequestReady && styles.requestButtonPressed
                ]}
              >
                <Text style={styles.requestButtonTitle}>Find nearby mechanics</Text>
                <Text style={styles.requestButtonSubtitle}>
                  {isRequestReady
                    ? "Compare fee, ETA, and rating before choosing"
                    : "Complete the problem details first to see available mechanics"}
                </Text>
              </Pressable>
            </View> : null}
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DCE7DD"
  },
  overlay: {
    flex: 1
  },
  topBar: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between"
  },
  topBarRight: {
    alignItems: "flex-end",
    gap: 10
  },
  topBarLeft: {
    alignItems: "flex-start",
    gap: 10
  },
  mapControlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  mapActionButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "#E7EBEF"
  },
  mapActionButtonPressed: {
    opacity: 0.85
  },
  liveBadge: {
    position: "absolute",
    top: 2,
    right: 16
  },
  mechanicMarker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: requestSurface,
    borderWidth: 1,
    borderColor: "#C9D3DD"
  },
  mechanicMarkerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: requestInk
  },
  sheetWrap: {
    position: "absolute",
    top: 12,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end"
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15, 23, 42, 0.08)"
  },
  sheet: {
    maxHeight: "100%",
    borderRadius: 30,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: requestSurface,
    borderWidth: 1,
    borderColor: "#EEF1F4",
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 8
    },
    elevation: 5
  },
  dragArea: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    minHeight: 150
  },
  sheetHandle: {
    alignSelf: "center",
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D0D5DD"
  },
  sheetTitle: {
    marginTop: 16,
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "800",
    color: requestInk
  },
  sheetSubtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: requestInkSoft
  },
  formScroll: {
    maxHeight: 520,
    flexShrink: 1
  },
  formContent: {
    paddingHorizontal: 20,
    paddingBottom: 4
  },
  routeCard: {
    marginTop: 8,
    flexDirection: "row",
    gap: 14,
    borderRadius: 24,
    padding: 16,
    backgroundColor: "#F8FAFB",
    borderWidth: 1,
    borderColor: requestBorder
  },
  routeIcons: {
    alignItems: "center",
    paddingTop: 16
  },
  pickupIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: requestAccentSoft
  },
  issueIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9EEF2"
  },
  routeLine: {
    width: 2,
    flex: 1,
    marginVertical: 6,
    borderRadius: 999,
    backgroundColor: "#D0D5DD"
  },
  routeInputs: {
    flex: 1
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: requestInkSoft
  },
  routeInput: {
    paddingTop: 8,
    paddingBottom: 6,
    fontSize: 17,
    fontWeight: "700",
    color: requestInk
  },
  routeDivider: {
    height: 1,
    marginVertical: 10,
    backgroundColor: requestBorder
  },
  problemHelper: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: requestInkSoft
  },
  problemGroups: {
    marginTop: 12
  },
  problemGroup: {
    marginTop: 12
  },
  problemGroupTitle: {
    marginBottom: 10,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: requestInkSoft
  },
  problemGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  problemChip: {
    width: "48%",
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: requestBorder
  },
  problemChipActive: {
    backgroundColor: requestAccentSoft,
    borderColor: requestAccent
  },
  problemChipIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F6F8"
  },
  problemChipIconWrapActive: {
    backgroundColor: "#FFFFFF"
  },
  problemChipText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    color: requestInk
  },
  problemChipTextActive: {
    color: requestAccent
  },
  compactRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14
  },
  compactField: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#F8FAFB",
    borderWidth: 1,
    borderColor: requestBorder
  },
  compactFieldPressed: {
    borderColor: requestAccent,
    backgroundColor: requestAccentSoft
  },
  compactHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  compactIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: requestAccentSoft
  },
  compactLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: requestInkSoft
  },
  compactInput: {
    marginTop: 8,
    minHeight: 46,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: requestBorder,
    fontSize: 16,
    fontWeight: "700",
    color: requestInk
  },
  metaPanel: {
    marginTop: 16,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#F8FAFB",
    borderWidth: 1,
    borderColor: requestBorder
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF"
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "800",
    color: requestInk
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 12,
    color: requestInkSoft
  },
  notesLabel: {
    marginTop: 18,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    color: requestInkSoft
  },
  notesInput: {
    minHeight: 94,
    marginTop: 10,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#F8FAFB",
    borderWidth: 1,
    borderColor: requestBorder,
    fontSize: 15,
    lineHeight: 22,
    color: requestInk,
    textAlignVertical: "top"
  },
  requestButton: {
    marginTop: 18,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: requestAccent
  },
  stickyActionFooter: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: requestSurface,
    borderTopWidth: 1,
    borderTopColor: requestBorder
  },
  pickupReadyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: requestAccentSoft
  },
  pickupReadyCopy: {
    flex: 1
  },
  pickupReadyTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: requestAccent
  },
  pickupReadyLocation: {
    marginTop: 2,
    fontSize: 13,
    color: requestInk
  },
  stickyRequestButton: {
    marginTop: 0
  },
  requestButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }]
  },
  requestButtonDisabled: {
    backgroundColor: "#A7B3BE"
  },
  requestButtonTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  requestButtonSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "rgba(255,255,255,0.82)"
  },
  footerText: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 20,
    color: requestInkSoft
  }
});
