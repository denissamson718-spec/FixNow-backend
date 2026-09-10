import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import AppMap, {
  AppMapHandle,
  AppMapMarker as Marker,
  AppMapPolyline as Polyline,
  MapRegion as Region
} from "../../../components/AppMap";
import { BackArrowButton } from "../../../components/BackArrowButton";
import { MapSourceSwitch } from "../../../components/MapSourceSwitch";
import { getMapProvider, getMapType, OpenStreetMapTiles } from "../../../components/mapSource";
import { getRideMapInteractionProps } from "../../../components/rideMapConfig";
import { OnlineStatusPill } from "../../../components/OnlineStatusPill";
import { useLiveLocation } from "../../../hooks/useLiveLocation";
import { useRoadRoute } from "../../../hooks/useRoadRoute";
import { useAppContext } from "../../../state/AppContext";
import { palette } from "../../../theme/palette";
import { areTrackingCoordinatesOverlapping, separateTrackingCoordinates } from "../../../utils/mapTracking";
import { getTransportLabel, getTransportMapIconName } from "../../../utils/transport";
import { DriverSideMenu } from "../components/DriverSideMenu";
import { UnreadMessageBadge } from "../../../components/UnreadMessageBadge";

const SHEET_PEEK_HEIGHT = 148;
const statusLabel: Record<string, string> = {
  draft: "Draft request",
  searching: "Searching for mechanics",
  reviewing: "Comparing live mechanics",
  accepted: "Mechanic selected",
  arriving: "Mechanic arriving",
  completed: "Service completed"
};

function buildRegion({
  driverLatitude,
  driverLongitude,
  mechanics
}: {
  driverLatitude?: number;
  driverLongitude?: number;
  mechanics: Array<{ latitude: number; longitude: number }>;
}): Region {
  const points = [
    ...(typeof driverLatitude === "number" && typeof driverLongitude === "number"
      ? [{ latitude: driverLatitude, longitude: driverLongitude }]
      : []),
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

  return {
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    latitudeDelta: Math.max((Math.max(...latitudes) - Math.min(...latitudes)) * 1.8, 0.012),
    longitudeDelta: Math.max((Math.max(...longitudes) - Math.min(...longitudes)) * 1.8, 0.012)
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getBearingDegrees(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitude1 = toRadians(start.latitude);
  const latitude2 = toRadians(end.latitude);
  const longitudeDelta = toRadians(end.longitude - start.longitude);
  const y = Math.sin(longitudeDelta) * Math.cos(latitude2);
  const x =
    Math.cos(latitude1) * Math.sin(latitude2) -
    Math.sin(latitude1) * Math.cos(latitude2) * Math.cos(longitudeDelta);

  return (Math.atan2(y, x) * 180) / Math.PI;
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
      { duration: 950 }
    );
    return;
  }

  map.fitToCoordinates(points, {
    edgePadding: {
      top: 170,
      right: 54,
      bottom: 360,
      left: 54
    },
    animated: true
  });
}

export function NearbyMechanicsScreen() {
  const navigation = useNavigation<any>();
  const {
    activeRequest,
    mechanics,
    offers,
    mapSource,
    resetRequest,
    setMapSource,
    selectOffer,
    advanceRequestStatus,
    completeServiceWithCost,
    submitMechanicRating,
    userProfile,
    unreadJobMessageCount
  } = useAppContext();
  const liveLocation = useLiveLocation();
  const [sheetHeight, setSheetHeight] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [repairCostInput, setRepairCostInput] = useState(activeRequest.agreedPrice ?? activeRequest.budget ?? "");
  const [selectedRating, setSelectedRating] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [hasCompletedCheckout, setHasCompletedCheckout] = useState(false);
  const [isAutoFollowEnabled, setIsAutoFollowEnabled] = useState(true);
  const translateY = useRef(new Animated.Value(0)).current;
  const currentSheetY = useRef(0);
  const dragStartY = useRef(0);
  const mapRef = useRef<AppMapHandle | null>(null);
  const [driverMarkerImage, setDriverMarkerImage] = useState<React.ComponentProps<typeof Marker>["image"]>();
  const [seatBeltMarkerImage, setSeatBeltMarkerImage] = useState<React.ComponentProps<typeof Marker>["image"]>();
  const [mechanicMarkerImage, setMechanicMarkerImage] = useState<React.ComponentProps<typeof Marker>["image"]>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("DriverTabs");
  };

  const handleCancelRequest = () => {
    setIsCheckoutOpen(false);
    setHasCompletedCheckout(false);
    setRatingComment("");
    setSelectedRating(5);
    resetRequest();
    navigation.navigate("Request");
  };

  const handleRecenterMap = () => {
    setIsAutoFollowEnabled(true);

    const points =
      isTrackingMode && assignedMechanic
        ? [
            ...(displayDriverCoordinate ? [displayDriverCoordinate] : []),
            ...(displayMechanicCoordinate ? [displayMechanicCoordinate] : [])
          ]
        : [
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
  const fastestEta = nearbyMechanics.length ? Math.min(...nearbyMechanics.map((mechanic) => mechanic.etaMinutes)) : 0;
  const assignedMechanic = mechanics.find((mechanic) => mechanic.id === activeRequest.assignedMechanicId);
  const acceptedOffer = offers.find((offer) => offer.id === activeRequest.selectedOfferId);
  const isTrackingMode = Boolean(assignedMechanic) && activeRequest.status !== "reviewing";
  const driverCoordinate =
    typeof driverLatitude === "number" && typeof driverLongitude === "number"
      ? { latitude: driverLatitude, longitude: driverLongitude }
      : undefined;
  const mechanicCoordinate = assignedMechanic
    ? {
        latitude: assignedMechanic.latitude,
        longitude: assignedMechanic.longitude
      }
    : undefined;
  const hasSharedArrivalLocation = isTrackingMode && areTrackingCoordinatesOverlapping(driverCoordinate, mechanicCoordinate);
  const separatedTrackingCoordinates = separateTrackingCoordinates(driverCoordinate, mechanicCoordinate);
  const displayDriverCoordinate = isTrackingMode ? separatedTrackingCoordinates.start ?? driverCoordinate : driverCoordinate;
  const displayMechanicCoordinate = isTrackingMode ? separatedTrackingCoordinates.end ?? mechanicCoordinate : mechanicCoordinate;
  const routeCoordinates = useRoadRoute({
    enabled: isTrackingMode && Boolean(assignedMechanic) && !hasSharedArrivalLocation,
    origin: driverCoordinate,
    destination: mechanicCoordinate
  });
  const mechanicTransportType = acceptedOffer?.transportType;
  const mechanicMarkerRotation = useMemo(() => {
    if (routeCoordinates.length < 2) {
      return 0;
    }

    const mechanicEnd = routeCoordinates[routeCoordinates.length - 1];
    const directionTowardDriver = routeCoordinates[Math.max(routeCoordinates.length - 3, 0)];
    const routeBearing = getBearingDegrees(mechanicEnd, directionTowardDriver);
    const sideFacingIconOffset = mechanicTransportType === "car" ? 0 : -90;

    return (routeBearing + sideFacingIconOffset + 360) % 360;
  }, [mechanicTransportType, routeCoordinates]);

  useEffect(() => {
    let isActive = true;

    Promise.all([
      MaterialCommunityIcons.getImageSource("account", 26, palette.primary),
      MaterialCommunityIcons.getImageSource("seatbelt", 15, palette.primaryDark),
      MaterialCommunityIcons.getImageSource(getTransportMapIconName(mechanicTransportType), 26, palette.success)
    ]).then(([driverIcon, seatBeltIcon, mechanicIcon]) => {
      if (isActive) {
        setDriverMarkerImage(driverIcon?.uri ? driverIcon : undefined);
        setSeatBeltMarkerImage(seatBeltIcon?.uri ? seatBeltIcon : undefined);
        setMechanicMarkerImage(mechanicIcon?.uri ? mechanicIcon : undefined);
      }
    });

    return () => {
      isActive = false;
    };
  }, [mechanicTransportType]);
  const availableMechanicCards = nearbyMechanics.map((mechanic) => {
    const matchingOffer = offers.find((offer) => offer.mechanicId === mechanic.id);

    return {
      offerId: matchingOffer?.id,
      mechanicId: mechanic.id,
      name: mechanic.name,
      specialty: mechanic.specialty,
      etaMinutes: matchingOffer?.etaMinutes ?? mechanic.etaMinutes,
      distanceKm: matchingOffer?.distanceKm ?? mechanic.distanceKm,
      rating: mechanic.rating,
      price: matchingOffer?.price ?? (mechanic.serviceFee || "Awaiting offer"),
      transportType: matchingOffer?.transportType,
      isReadyToRequest: Boolean(matchingOffer)
    };
  });
  const region = buildRegion({
    driverLatitude,
    driverLongitude,
    mechanics: isTrackingMode && displayMechanicCoordinate
      ? [displayMechanicCoordinate]
      : (isTrackingMode && assignedMechanic ? [assignedMechanic] : nearbyMechanics).map((mechanic) => ({
          latitude: mechanic.latitude,
          longitude: mechanic.longitude
        }))
  });
  const collapsedOffset = Math.max(sheetHeight - SHEET_PEEK_HEIGHT, 0);
  const nextTrackingAction =
    activeRequest.status === "completed" ? handleCancelRequest : advanceRequestStatus;
  const nextTrackingLabel =
    activeRequest.status === "accepted"
      ? "Mark mechanic en route"
      : activeRequest.status === "arriving"
        ? "Complete service"
        : "Start new request";
  const shouldShowCancelRequest =
    !activeRequest.selectedOfferId &&
    !["accepted", "arriving", "completed"].includes(activeRequest.status);
  const completedRepairCostLabel = `Repair cost ${activeRequest.repairCost ?? "--"}`;
  const completedPlatformFeeLabel = `FixNow fee ${activeRequest.platformFee ?? "--"}`;
  const completedTotalPaidLabel = `Total paid ${activeRequest.totalPaymentDue ?? "--"}`;

  useEffect(() => {
    if (activeRequest.agreedPrice || activeRequest.budget) {
      setRepairCostInput(activeRequest.agreedPrice ?? activeRequest.budget);
    }
  }, [activeRequest.agreedPrice, activeRequest.budget]);

  useEffect(() => {
    const listenerId = translateY.addListener(({ value }) => {
      currentSheetY.current = value;
    });

    return () => {
      translateY.removeListener(listenerId);
    };
  }, [translateY]);

  useEffect(() => {
    translateY.setValue(clamp(currentSheetY.current, 0, collapsedOffset));
  }, [collapsedOffset, translateY]);

  useEffect(() => {
    if (!isAutoFollowEnabled) {
      return;
    }

    const points = isTrackingMode && assignedMechanic
      ? [
          ...(displayDriverCoordinate ? [displayDriverCoordinate] : []),
          ...(displayMechanicCoordinate ? [displayMechanicCoordinate] : [])
        ]
      : [
          ...(typeof driverLatitude === "number" && typeof driverLongitude === "number"
            ? [{ latitude: driverLatitude, longitude: driverLongitude }]
            : []),
          ...nearbyMechanics.map((mechanic) => ({
            latitude: mechanic.latitude,
            longitude: mechanic.longitude
          }))
        ];

    fitMapToPoints(mapRef.current, points);
  }, [
    assignedMechanic,
    displayDriverCoordinate,
    displayMechanicCoordinate,
    driverLatitude,
    driverLongitude,
    isAutoFollowEnabled,
    isTrackingMode,
    mapSource,
    nearbyMechanics
  ]);

  const animateSheet = useCallback(
    (toValue: number) => {
      Animated.spring(translateY, {
        toValue,
        useNativeDriver: Platform.OS !== "web",
        bounciness: 0,
        speed: 18
      }).start();
    },
    [translateY]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 4,
        onPanResponderGrant: () => {
          translateY.stopAnimation((value) => {
            dragStartY.current = value;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          translateY.setValue(clamp(dragStartY.current + gestureState.dy, 0, collapsedOffset));
        },
        onPanResponderRelease: (_, gestureState) => {
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
        {...getRideMapInteractionProps({ showsUserLocation: false })}
        onPanDrag={() => setIsAutoFollowEnabled(false)}
        onRegionChangeComplete={(_, details) => {
          if (details?.isGesture) {
            setIsAutoFollowEnabled(false);
          }
        }}
      >
        <OpenStreetMapTiles source={mapSource} />

        {routeCoordinates.length > 1 && !hasSharedArrivalLocation ? (
          <>
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="rgba(255,255,255,0.92)"
              strokeWidth={9}
              lineCap="round"
              lineJoin="round"
              zIndex={20}
            />
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#5B3DF5"
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
              zIndex={21}
            />
          </>
        ) : null}

        {displayDriverCoordinate ? (
          <>
            <Marker
              coordinate={displayDriverCoordinate}
              title="Your location"
              description={activeRequest.locationLabel}
              image={driverMarkerImage}
              zIndex={100}
            />
            {seatBeltMarkerImage ? (
              <Marker
                coordinate={displayDriverCoordinate}
                image={seatBeltMarkerImage}
                anchor={{ x: -0.45, y: 0.5 }}
                zIndex={101}
              />
            ) : null}
          </>
        ) : null}

        {nearbyMechanics.map((mechanic) => (
          <Marker
            key={mechanic.id}
            coordinate={
              isTrackingMode && assignedMechanic?.id === mechanic.id && displayMechanicCoordinate
                ? displayMechanicCoordinate
                : { latitude: mechanic.latitude, longitude: mechanic.longitude }
            }
            title={mechanic.name}
            description={
              mechanic.serviceFee
                ? `${mechanic.etaMinutes} min away - ${mechanic.serviceFee} service fee`
                : `${mechanic.etaMinutes} min away`
            }
            image={isTrackingMode && assignedMechanic?.id === mechanic.id ? mechanicMarkerImage : undefined}
            rotation={isTrackingMode && assignedMechanic?.id === mechanic.id ? mechanicMarkerRotation : 0}
            flat={isTrackingMode && assignedMechanic?.id === mechanic.id}
            zIndex={isTrackingMode && assignedMechanic?.id === mechanic.id ? 101 : 1}
          >
            {isTrackingMode && assignedMechanic?.id === mechanic.id ? (
              null
            ) : (
              <View style={styles.markerWrap}>
                <View
                  style={[
                    styles.markerDot,
                    assignedMechanic?.id === mechanic.id && styles.markerDotActive
                  ]}
                />
              </View>
            )}
          </Marker>
        ))}
      </AppMap>

      <LinearGradient
        pointerEvents="none"
        colors={["rgba(10, 18, 31, 0.34)", "transparent", "rgba(10, 18, 31, 0.28)"]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView pointerEvents="box-none" style={styles.overlay} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <DriverSideMenu />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open job chat"
              onPress={() => navigation.navigate("Chat")}
              style={({ pressed }) => [styles.mapActionButton, pressed && styles.mapActionButtonPressed]}
            >
              <Ionicons name="chatbubbles" size={20} color={palette.ink} />
              <UnreadMessageBadge count={unreadJobMessageCount} />
            </Pressable>
          </View>
          <View style={styles.topBarRight}>
            <MapSourceSwitch value={mapSource} onChange={setMapSource} />
            <Pressable onPress={handleRecenterMap} style={({ pressed }) => [styles.mapActionButton, pressed && styles.mapActionButtonPressed]}>
              <Ionicons name="locate" size={18} color={palette.ink} />
            </Pressable>
            {isTrackingMode ? (
              <View style={styles.statusChip}>
                <Ionicons name="flash" size={14} color={palette.success} />
                <Text style={styles.statusChipText}>
                  {hasSharedArrivalLocation
                    ? `${assignedMechanic?.name} has arrived`
                    : `${assignedMechanic?.name} live tracking`}
                </Text>
              </View>
            ) : (
              <OnlineStatusPill label={`${nearbyMechanics.length} mechanics online`} compact />
            )}
          </View>
        </View>

        <Animated.View
          style={[styles.sheetWrap, { transform: [{ translateY }] }]}
          onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}
        >
          <View style={styles.bottomPanel}>
            <View {...panResponder.panHandlers} style={styles.dragArea}>
              <View style={styles.handle} />
              <Text style={styles.panelTitle}>{activeRequest.locationLabel}</Text>
              <Text style={styles.panelSubtitle}>
                {isTrackingMode && assignedMechanic
                  ? hasSharedArrivalLocation
                    ? `${assignedMechanic.name} has arrived for ${activeRequest.issue}`
                    : `${assignedMechanic.name} is handling ${activeRequest.issue}`
                  : `${activeRequest.issue} for ${activeRequest.vehicle}`}
              </Text>
              <Text style={styles.dragHint}>
                {isTrackingMode
                  ? "Drag down for full map, drag up to view live tracking details"
                  : "Drag down for full map, drag up to view live mechanics"}
              </Text>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{nearbyMechanics.length}</Text>
                <Text style={styles.metricLabel}>Available</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{fastestEta} min</Text>
                <Text style={styles.metricLabel}>Fastest ETA</Text>
              </View>
            </View>

            <Text style={styles.liveSectionTitle}>
              {isTrackingMode ? "Live tracking" : "Available mechanics nearby"}
            </Text>

            <ScrollView
              style={styles.liveList}
              contentContainerStyle={styles.liveListContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {isTrackingMode && assignedMechanic ? (
                <View style={styles.trackingCard}>
                  <Text style={styles.trackingStatus}>
                    {hasSharedArrivalLocation ? "Mechanic has arrived" : statusLabel[activeRequest.status]}
                  </Text>
                  <Text style={styles.trackingName}>{assignedMechanic.name}</Text>
                  <Text style={styles.trackingMeta}>
                    {assignedMechanic.specialty} - Rated {assignedMechanic.rating.toFixed(1)}/5
                  </Text>
                  <Text style={styles.trackingMeta}>
                    {hasSharedArrivalLocation
                      ? `At your location now - Price ${activeRequest.agreedPrice ?? (assignedMechanic.serviceFee || "--")}`
                      : `ETA ${assignedMechanic.etaMinutes} min - Price ${activeRequest.agreedPrice ?? (assignedMechanic.serviceFee || "--")}`}
                  </Text>
                  {acceptedOffer?.transportType ? (
                    <Text style={styles.trackingMeta}>Mechanic is coming by {getTransportLabel(acceptedOffer.transportType)}</Text>
                  ) : null}
                  <Text style={styles.trackingMeta}>{activeRequest.locationLabel}</Text>

                  {activeRequest.status === "completed" && !hasCompletedCheckout && isCheckoutOpen ? (
                    <View style={styles.checkoutCard}>
                      <Text style={styles.checkoutTitle}>Pay and rate mechanic</Text>
                      <Text style={styles.checkoutSubtitle}>
                        Finish the job here. Once payment is confirmed, the mechanic rating is submitted immediately.
                      </Text>

                      <Text style={styles.checkoutLabel}>Repair cost</Text>
                      <TextInput
                        value={repairCostInput}
                        onChangeText={setRepairCostInput}
                        placeholder="$18"
                        placeholderTextColor={palette.inkSoft}
                        style={styles.checkoutInput}
                        keyboardType="numeric"
                      />

                      <Text style={styles.checkoutLabel}>Rate mechanic</Text>
                      <View style={styles.ratingRow}>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <Pressable
                            key={value}
                            onPress={() => setSelectedRating(value)}
                            style={[styles.ratingPill, selectedRating === value && styles.ratingPillActive]}
                          >
                            <Text style={[styles.ratingPillText, selectedRating === value && styles.ratingPillTextActive]}>
                              {value}/5
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      <TextInput
                        value={ratingComment}
                        onChangeText={setRatingComment}
                        placeholder="Optional comment about the mechanic"
                        placeholderTextColor={palette.inkSoft}
                        style={styles.ratingCommentInput}
                        multiline
                      />

                      <Pressable
                        onPress={() => {
                          if (!repairCostInput.trim()) {
                            Alert.alert("Missing payment", "Please enter the repair cost before finishing service.");
                            return;
                          }

                          completeServiceWithCost(repairCostInput);
                          submitMechanicRating(selectedRating, ratingComment.trim() || undefined);
                          setHasCompletedCheckout(true);
                          setIsCheckoutOpen(false);
                          animateSheet(0);
                        }}
                        style={({ pressed }) => [styles.requestMechanicButton, pressed && styles.requestMechanicButtonPressed]}
                      >
                        <Text style={styles.requestMechanicButtonText}>Pay and submit rating</Text>
                      </Pressable>
                    </View>
                  ) : activeRequest.status === "completed" ? (
                    <View style={styles.completedCard}>
                      <Text style={styles.completedTitle}>Payment completed</Text>
                      <Text style={styles.completedMeta}>{completedRepairCostLabel}</Text>
                      <Text style={styles.completedMeta}>{completedPlatformFeeLabel}</Text>
                      <Text style={styles.completedMeta}>{completedTotalPaidLabel}</Text>
                      {hasCompletedCheckout ? (
                        <Text style={styles.completedSuccess}>Your mechanic rating has been submitted too.</Text>
                      ) : null}
                      <Pressable
                        onPress={nextTrackingAction}
                        style={({ pressed }) => [styles.secondaryTrackingButton, pressed && styles.requestMechanicButtonPressed]}
                      >
                        <Text style={styles.secondaryTrackingButtonText}>{nextTrackingLabel}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => {
                        if (activeRequest.status === "arriving") {
                          advanceRequestStatus();
                          setIsCheckoutOpen(true);
                          animateSheet(0);
                          return;
                        }

                        nextTrackingAction();
                      }}
                      style={({ pressed }) => [styles.requestMechanicButton, pressed && styles.requestMechanicButtonPressed]}
                    >
                      <Text style={styles.requestMechanicButtonText}>{nextTrackingLabel}</Text>
                    </Pressable>
                  )}
                </View>
              ) : availableMechanicCards.length ? (
                availableMechanicCards.map((mechanic) => (
                  <View key={mechanic.offerId ?? mechanic.mechanicId} style={styles.liveCard}>
                    <View style={styles.liveCardTopRow}>
                      <View style={styles.liveCardHeader}>
                        <Text style={styles.liveCardName}>{mechanic.name}</Text>
                        <Text style={styles.liveCardSpecialty}>{mechanic.specialty}</Text>
                      </View>
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={13} color="#F2B938" />
                        <Text style={styles.ratingBadgeText}>{mechanic.rating.toFixed(1)}</Text>
                      </View>
                    </View>

                    <View style={styles.liveMetaRow}>
                      <Text style={styles.liveMetaText}>{mechanic.etaMinutes} min</Text>
                      <Text style={styles.liveMetaText}>{mechanic.distanceKm} km</Text>
                      {mechanic.transportType ? <Text style={styles.liveMetaText}>By {getTransportLabel(mechanic.transportType)}</Text> : null}
                      <Text style={styles.liveMetaText}>{mechanic.price}</Text>
                    </View>

                    <Pressable
                      onPress={() => {
                        if (!mechanic.offerId) {
                          return;
                        }

                        selectOffer(mechanic.offerId);
                        animateSheet(0);
                      }}
                      style={({ pressed }) => [
                        styles.requestMechanicButton,
                        !mechanic.isReadyToRequest && styles.requestMechanicButtonDisabled,
                        pressed && mechanic.isReadyToRequest && styles.requestMechanicButtonPressed
                      ]}
                      disabled={!mechanic.isReadyToRequest}
                    >
                      <Text style={styles.requestMechanicButtonText}>
                        {mechanic.isReadyToRequest ? `Request ${mechanic.name}` : "Preparing mechanic"}
                      </Text>
                    </Pressable>
                  </View>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>No available mechanics yet</Text>
                  <Text style={styles.emptyStateText}>
                    Nearby rescue mechanics will appear here as soon as they are available for your request.
                  </Text>
                </View>
              )}

              {shouldShowCancelRequest ? (
                <Pressable onPress={handleCancelRequest} style={styles.cancelButton}>
                  <Text style={styles.cancelText}>Cancel request</Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DDE6E2"
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
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.94)"
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.ink
  },
  markerWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E0E7"
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.ink
  },
  markerDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.primary
  },
  sheetWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 30
  },
  bottomPanel: {
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)"
  },
  dragArea: {
    paddingBottom: 2
  },
  handle: {
    alignSelf: "center",
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D0D5DD"
  },
  panelTitle: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: "800",
    color: palette.ink
  },
  panelSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSoft
  },
  dragHint: {
    marginTop: 8,
    fontSize: 12,
    color: palette.inkSoft
  },
  metricsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: "#F5F7FA"
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.ink
  },
  metricLabel: {
    marginTop: 4,
    fontSize: 12,
    color: palette.inkSoft
  },
  liveSectionTitle: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: "800",
    color: palette.ink
  },
  liveList: {
    marginTop: 12,
    maxHeight: 300
  },
  liveListContent: {
    paddingBottom: 6,
    gap: 12
  },
  liveCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: "#F5F7FA"
  },
  liveCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  liveCardHeader: {
    flex: 1
  },
  liveCardName: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.ink
  },
  liveCardSpecialty: {
    marginTop: 4,
    fontSize: 13,
    color: palette.inkSoft
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#FFFFFF"
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.ink
  },
  liveMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12
  },
  liveMetaText: {
    fontSize: 13,
    color: palette.inkSoft
  },
  requestMechanicButton: {
    marginTop: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    backgroundColor: palette.primary
  },
  requestMechanicButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }]
  },
  requestMechanicButtonDisabled: {
    backgroundColor: "#D5DCE2"
  },
  requestMechanicButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  emptyState: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#F5F7FA"
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: palette.ink
  },
  emptyStateText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSoft
  },
  trackingCard: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#F5F7FA"
  },
  trackingStatus: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: palette.primaryDark
  },
  trackingName: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "800",
    color: palette.ink
  },
  trackingMeta: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSoft
  },
  checkoutCard: {
    marginTop: 16,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#FFFFFF"
  },
  checkoutTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: palette.ink
  },
  checkoutSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSoft
  },
  checkoutLabel: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: "700",
    color: palette.ink
  },
  checkoutInput: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "#F8FAFB",
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: palette.ink
  },
  ratingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10
  },
  ratingPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "#F8FAFB"
  },
  ratingPillActive: {
    borderColor: palette.primary,
    backgroundColor: "#E8F7EE"
  },
  ratingPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.ink
  },
  ratingPillTextActive: {
    color: palette.primaryDark
  },
  ratingCommentInput: {
    minHeight: 92,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "#F8FAFB",
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlignVertical: "top",
    fontSize: 14,
    color: palette.ink
  },
  completedCard: {
    marginTop: 16,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#FFFFFF"
  },
  completedTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: palette.ink
  },
  completedMeta: {
    marginTop: 8,
    fontSize: 14,
    color: palette.inkSoft
  },
  completedSuccess: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "700",
    color: palette.primaryDark
  },
  secondaryTrackingButton: {
    marginTop: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: palette.border
  },
  secondaryTrackingButtonText: {
    fontSize: 14,
    fontWeight: "800",
    color: palette.ink
  },
  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingVertical: 12
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.inkSoft
  }
});
