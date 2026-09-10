import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Alert, Animated, Easing, Image, KeyboardAvoidingView, Linking, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { FlipType, manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";

import AppMap, {
  AppMapHandle,
  AppMapMarker as Marker,
  AppMapPolyline as Polyline,
  MapRegion as Region
} from "../../../components/AppMap";
import { LiveRequestNotice } from "../../../components/LiveRequestNotice";
import { MapSourceSwitch } from "../../../components/MapSourceSwitch";
import { UnreadMessageBadge } from "../../../components/UnreadMessageBadge";
import { getMapProvider, getMapType, OpenStreetMapTiles } from "../../../components/mapSource";
import { getRideMapInteractionProps } from "../../../components/rideMapConfig";
import { useRoadRoute } from "../../../hooks/useRoadRoute";
import { useAppContext } from "../../../state/AppContext";
import { palette } from "../../../theme/palette";
import { areTrackingCoordinatesOverlapping, separateTrackingCoordinates } from "../../../utils/mapTracking";
import { getTransportIconName, getTransportLabel, getTransportMapIconName, mechanicTransportOptions } from "../../../utils/transport";
import { MechanicSideMenu } from "../components/MechanicSideMenu";

const SHEET_PEEK_HEIGHT = 148;
const mechanicSurface = "#FFFFFF";
const mechanicBorder = "#DDE3EA";
const mechanicSoft = "#F5F7FA";

function buildRegion({
  driverLatitude,
  driverLongitude,
  mechanicLatitude,
  mechanicLongitude
}: {
  driverLatitude?: number;
  driverLongitude?: number;
  mechanicLatitude?: number;
  mechanicLongitude?: number;
}): Region {
  const points = [
    ...(typeof driverLatitude === "number" && typeof driverLongitude === "number"
      ? [{ latitude: driverLatitude, longitude: driverLongitude }]
      : []),
    ...(typeof mechanicLatitude === "number" && typeof mechanicLongitude === "number"
      ? [{ latitude: mechanicLatitude, longitude: mechanicLongitude }]
      : [])
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

function getDistanceMeters(
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = toRadians(end.latitude - start.latitude);
  const longitudeDelta = toRadians(end.longitude - start.longitude);
  const latitude1 = toRadians(start.latitude);
  const latitude2 = toRadians(end.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;

  return 6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function fitMapToPoints(map: AppMapHandle | null, points: Array<{ latitude: number; longitude: number }>) {
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

export function MechanicJobsScreen() {
  const navigation = useNavigation<any>();
  const {
    activeRequest,
    completeServiceWithCost,
    currentMechanic,
    dismissMechanicNotification,
    mechanicCredentials,
    mechanicNotification,
    mechanics,
    offers,
    openServiceRequests,
    registeredAccounts,
    mapSource,
    setMapSource,
    updateMechanicTransportMode,
    unreadJobMessageCount,
    advanceRequestStatus,
    resetRequest,
    sendMechanicOffer,
    sendJobMessage,
    userProfile
  } = useAppContext();
  const fallbackMechanic = currentMechanic ?? mechanics[1] ?? mechanics[0];
  const assignedMechanic = mechanics.find((mechanic) => mechanic.id === activeRequest.assignedMechanicId) ?? fallbackMechanic;
  const myOffer = offers.find((offer) => offer.mechanicId === fallbackMechanic?.id);
  const hasOpenRequest = openServiceRequests.length > 0 && activeRequest.status !== "draft";
  const iWonTheJob = Boolean(fallbackMechanic?.id) && activeRequest.assignedMechanicId === fallbackMechanic?.id;
  const sheetTargetMechanic = iWonTheJob ? assignedMechanic : fallbackMechanic;
  const visibleTransportType = myOffer?.transportType ?? mechanicCredentials?.transportMode;
  const liveDriverAccount = registeredAccounts.find(
    (account) => account.role === "driver" && account.id === activeRequest.requestedByAccountId
  );
  const [repairCost, setRepairCost] = useState(activeRequest.repairCost ?? "");
  const [offerPrice, setOfferPrice] = useState(myOffer?.basePrice ?? fallbackMechanic?.serviceFee ?? "");
  const [messageDraft, setMessageDraft] = useState("");
  const [diagnosisPhotoUri, setDiagnosisPhotoUri] = useState<string | undefined>(undefined);
  const [isCommunicationOpen, setIsCommunicationOpen] = useState(false);
  const [sheetHeight, setSheetHeight] = useState(0);
  const [isAutoFollowEnabled, setIsAutoFollowEnabled] = useState(true);
  const translateY = useRef(new Animated.Value(0)).current;
  const currentSheetY = useRef(0);
  const dragStartY = useRef(0);
  const mapRef = useRef<AppMapHandle | null>(null);
  const panelScrollRef = useRef<ScrollView | null>(null);
  const stableMechanicCoordinateRef = useRef<{ latitude: number; longitude: number } | undefined>(undefined);
  const stableMechanicRotationRef = useRef(0);
  const [driverMarkerImage, setDriverMarkerImage] = useState<React.ComponentProps<typeof Marker>["image"]>();
  const [mechanicMarkerImage, setMechanicMarkerImage] = useState<React.ComponentProps<typeof Marker>["image"]>();

  useEffect(() => {
    setRepairCost(activeRequest.repairCost ?? "");
  }, [activeRequest.repairCost]);

  useEffect(() => {
    setOfferPrice(myOffer?.basePrice ?? fallbackMechanic?.serviceFee ?? "");
  }, [activeRequest.id, fallbackMechanic?.serviceFee, myOffer?.basePrice]);

  useEffect(() => {
    let isActive = true;

    const loadMarkerImages = async () => {
      const [driverIcon, mechanicIcon] = await Promise.all([
        MaterialCommunityIcons.getImageSource("account", 44, palette.primary),
        MaterialCommunityIcons.getImageSource(getTransportMapIconName(visibleTransportType), 48, palette.success)
      ]);
      const flippedMechanicIcon = mechanicIcon?.uri
        ? await manipulateAsync(
            mechanicIcon.uri,
            [{ flip: FlipType.Vertical }],
            { format: SaveFormat.PNG }
          )
        : mechanicIcon;

      if (isActive) {
        setDriverMarkerImage(driverIcon ?? undefined);
        setMechanicMarkerImage(flippedMechanicIcon ?? undefined);
      }
    };

    loadMarkerImages().catch(() => {
      if (isActive) {
        setMechanicMarkerImage(undefined);
      }
    });

    return () => {
      isActive = false;
    };
  }, [visibleTransportType]);

  const handleRecenterMap = () => {
    setIsAutoFollowEnabled(true);

    const points = [
      ...(displayMechanicCoordinate ? [displayMechanicCoordinate] : []),
      ...(displayDriverCoordinate ? [displayDriverCoordinate] : [])
    ];

    fitMapToPoints(mapRef.current, points);
  };

  const driverLatitude = hasOpenRequest
    ? (liveDriverAccount?.lastKnownLocation?.latitude ?? activeRequest.latitude) || undefined
    : undefined;
  const driverLongitude = hasOpenRequest
    ? (liveDriverAccount?.lastKnownLocation?.longitude ?? activeRequest.longitude) || undefined
    : undefined;
  const mechanicLatitude = sheetTargetMechanic?.latitude;
  const mechanicLongitude = sheetTargetMechanic?.longitude;
  const driverCoordinate =
    typeof driverLatitude === "number" && typeof driverLongitude === "number"
      ? { latitude: driverLatitude, longitude: driverLongitude }
      : undefined;
  const mechanicCoordinate =
    typeof mechanicLatitude === "number" && typeof mechanicLongitude === "number"
      ? { latitude: mechanicLatitude, longitude: mechanicLongitude }
      : undefined;
  const hasSharedArrivalLocation = hasOpenRequest && areTrackingCoordinatesOverlapping(driverCoordinate, mechanicCoordinate);
  const separatedTrackingCoordinates = separateTrackingCoordinates(mechanicCoordinate, driverCoordinate);
  const displayMechanicCoordinate = separatedTrackingCoordinates.start ?? mechanicCoordinate;
  const displayDriverCoordinate = separatedTrackingCoordinates.end ?? driverCoordinate;
  const stableDisplayMechanicCoordinate = useMemo(() => {
    if (!displayMechanicCoordinate) {
      stableMechanicCoordinateRef.current = undefined;
      return undefined;
    }

    const previousCoordinate = stableMechanicCoordinateRef.current;
    if (!previousCoordinate || getDistanceMeters(previousCoordinate, displayMechanicCoordinate) >= 6) {
      stableMechanicCoordinateRef.current = displayMechanicCoordinate;
    }

    return stableMechanicCoordinateRef.current;
  }, [displayMechanicCoordinate?.latitude, displayMechanicCoordinate?.longitude]);
  const routeCoordinates = useRoadRoute({
    enabled: Boolean(hasOpenRequest && iWonTheJob && mechanicCoordinate && driverCoordinate && !hasSharedArrivalLocation),
    origin: mechanicCoordinate,
    destination: driverCoordinate
  });
  const mechanicMarkerRotation = useMemo(() => {
    if (routeCoordinates.length < 2) {
      return 0;
    }

    const directionPoint =
      routeCoordinates.find((coordinate) => getDistanceMeters(routeCoordinates[0], coordinate) >= 20) ??
      routeCoordinates[routeCoordinates.length - 1];
    const routeBearing = getBearingDegrees(routeCoordinates[0], directionPoint);
    const sideFacingIconOffset = visibleTransportType === "car" ? 0 : -90;
    const nextRotation = (routeBearing + sideFacingIconOffset + 360) % 360;
    const rotationDifference = Math.abs(((nextRotation - stableMechanicRotationRef.current + 540) % 360) - 180);

    if (rotationDifference >= 10) {
      stableMechanicRotationRef.current = Math.round(nextRotation / 5) * 5;
    }

    return stableMechanicRotationRef.current;
  }, [routeCoordinates, visibleTransportType]);
  const region = buildRegion({
    driverLatitude,
    driverLongitude,
    mechanicLatitude: displayMechanicCoordinate?.latitude ?? mechanicLatitude,
    mechanicLongitude: displayMechanicCoordinate?.longitude ?? mechanicLongitude
  });
  const collapsedOffset = Math.max(sheetHeight - SHEET_PEEK_HEIGHT, 0);
  const actionLabel =
    !hasOpenRequest
      ? "Waiting for driver request"
      : activeRequest.status === "reviewing"
        ? myOffer
          ? "Waiting for driver choice"
          : "Send your offer"
        : activeRequest.status === "accepted"
          ? iWonTheJob
            ? "Start driving"
            : "Not assigned to you"
          : activeRequest.status === "arriving"
            ? iWonTheJob
              ? "Complete service and send payment"
              : "Driver chose another mechanic"
            : "Clear completed job";
  const statusTitle =
    !hasOpenRequest
      ? "No live request"
      : activeRequest.status === "reviewing"
        ? "Driver request live"
        : iWonTheJob
          ? "You are assigned"
          : "Driver chose another mechanic";

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

    const points = [
      ...(displayMechanicCoordinate ? [displayMechanicCoordinate] : []),
      ...(displayDriverCoordinate ? [displayDriverCoordinate] : [])
    ];

    fitMapToPoints(mapRef.current, points);
  }, [
    displayDriverCoordinate,
    displayMechanicCoordinate,
    driverLatitude,
    driverLongitude,
    isAutoFollowEnabled,
    mapSource,
    mechanicLatitude,
    mechanicLongitude
  ]);

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
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 3,
        onMoveShouldSetPanResponderCapture: (_, gestureState) => Math.abs(gestureState.dy) > 3,
        onPanResponderGrant: () => {
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
        },
        onPanResponderTerminationRequest: () => false
      }),
    [animateSheet, collapsedOffset, translateY]
  );

  const handleAction = () => {
    if (!hasOpenRequest) {
      return;
    }

    if (activeRequest.status === "completed") {
      resetRequest();
      return;
    }

    if (!iWonTheJob && activeRequest.status !== "reviewing") {
      return;
    }

    if (activeRequest.status === "arriving") {
      if (!repairCost.trim()) {
        Alert.alert("Missing repair cost", "Add the final repair amount before completing this service.");
        return;
      }

      completeServiceWithCost(repairCost);
      return;
    }

    if (activeRequest.status === "reviewing") {
      if (myOffer) {
        Alert.alert("Waiting for driver", "Your offer has been sent. The driver is still choosing a mechanic.");
        return;
      }

      if (!fallbackMechanic?.id) {
        Alert.alert("Mechanic unavailable", "Your mechanic profile could not be loaded.");
        return;
      }

      if (!offerPrice.trim()) {
        Alert.alert("Missing offer price", "Enter your service price before sending the offer.");
        return;
      }

      if (!visibleTransportType) {
        Alert.alert("Choose transport", "Select how you are getting to the driver before sending the offer.");
        return;
      }

      sendMechanicOffer(fallbackMechanic.id, offerPrice, visibleTransportType);
      return;
    }

    advanceRequestStatus();
  };

  const handleCallDriver = async () => {
    const phone = liveDriverAccount?.profile.phone?.trim();

    if (!phone) {
      Alert.alert("Phone unavailable", "The driver has not provided a phone number for this request.");
      return;
    }

    try {
      await Linking.openURL(`tel:${phone.replace(/[^+\d]/g, "")}`);
    } catch {
      Alert.alert("Call unavailable", "This device could not open the phone dialer.");
    }
  };

  const handlePickDiagnosisPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required", "Allow photo access to attach a diagnosis image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.6,
      base64: true
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const shareableUri = asset.base64
        ? `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`
        : asset.uri;

      setDiagnosisPhotoUri(shareableUri);
    }
  };

  const handleSendMessage = () => {
    if (!messageDraft.trim() && !diagnosisPhotoUri) {
      return;
    }

    sendJobMessage(messageDraft, diagnosisPhotoUri);
    setMessageDraft("");
    setDiagnosisPhotoUri(undefined);
    setTimeout(() => panelScrollRef.current?.scrollToEnd({ animated: true }), 100);
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
          <Polyline
            coordinates={routeCoordinates}
            strokeColor={palette.primary}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}

        {displayDriverCoordinate ? (
          <Marker
            coordinate={displayDriverCoordinate}
            title="Driver location"
            description={activeRequest.locationLabel}
            image={driverMarkerImage}
            zIndex={100}
          />
        ) : null}

        {stableDisplayMechanicCoordinate ? (
          <Marker
            coordinate={stableDisplayMechanicCoordinate}
            title={sheetTargetMechanic?.name ?? "Mechanic"}
            description={`${getTransportLabel(visibleTransportType)} - ${sheetTargetMechanic?.specialty ?? "Roadside mechanic"}`}
            image={mechanicMarkerImage}
            rotation={mechanicMarkerRotation}
            flat
            zIndex={101}
          />
        ) : null}
      </AppMap>

      <LinearGradient
        pointerEvents="none"
        colors={["rgba(10, 18, 31, 0.12)", "transparent", "rgba(10, 18, 31, 0.10)"]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView pointerEvents="box-none" style={styles.overlay} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.topBar}>
          <MechanicSideMenu />
          <View style={styles.topBarRight}>
            <MapSourceSwitch value={mapSource} onChange={setMapSource} />
            <Pressable onPress={handleRecenterMap} style={({ pressed }) => [styles.mapActionButton, pressed && styles.mapActionButtonPressed]}>
              <Ionicons name="locate" size={18} color={palette.ink} />
            </Pressable>

          </View>
        </View>

        {hasOpenRequest ? (
          <View style={styles.requestPeekCard}>
            <View style={styles.requestPeekHeader}>
              <View style={styles.requestIcon}>
                <Ionicons name="construct" size={17} color="#FFFFFF" />
              </View>
              <View style={styles.requestCopy}>
                <Text style={styles.requestEyebrow}>{iWonTheJob ? "YOUR ACTIVE JOB" : "NEW SERVICE REQUEST"}</Text>
                <Text numberOfLines={1} style={styles.requestTitle}>{activeRequest.issue}</Text>
              </View>
              <View style={styles.requestEta}>
                <Text style={styles.requestEtaValue}>{hasSharedArrivalLocation ? "Here" : `${sheetTargetMechanic?.etaMinutes ?? "--"} min`}</Text>
                <Text style={styles.requestEtaLabel}>ETA</Text>
              </View>
            </View>
            <View style={styles.requestPeekFooter}>
              <Ionicons name="location" size={14} color={palette.primaryDark} />
              <Text numberOfLines={1} style={styles.requestLocation}>{activeRequest.locationLabel}</Text>
              <Text style={styles.requestVehicle}>{activeRequest.vehicle}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.onlineChip}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineChipText}>Online — waiting for a request</Text>
          </View>
        )}

        <Animated.View
          pointerEvents="box-none"
          style={[styles.sheetWrap, { transform: [{ translateY }] }]}
          onLayout={(event) => setSheetHeight(event.nativeEvent.layout.height)}
        >
          <KeyboardAvoidingView
            style={styles.keyboardAvoider}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 24}
          >
            <View style={styles.bottomPanel}>
              <View {...panResponder.panHandlers} style={styles.dragArea}>
                <View style={styles.handle} />
                <Text style={styles.panelTitle}>{hasOpenRequest ? "Job control centre" : "You are online"}</Text>
                <Text style={styles.panelSubtitle}>
                  {hasOpenRequest
                    ? hasSharedArrivalLocation
                      ? `You have arrived for ${activeRequest.issue}`
                      : "Track the driver, choose your transport, and keep the job moving."
                    : "Your map stays ready while nearby drivers ask for help."}
                </Text>
              </View>

              {hasOpenRequest ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open job communication"
                  onPress={() => navigation.navigate("Chat")}
                  style={({ pressed }) => [
                    styles.communicationIconButton,
                    pressed && styles.communicationButtonPressed
                  ]}
                >
                  <Ionicons name="chatbubbles" size={21} color={palette.primaryDark} />
                  <UnreadMessageBadge count={unreadJobMessageCount} />
                </Pressable>
              ) : null}

              <ScrollView
                ref={panelScrollRef}
                style={styles.panelScroll}
                contentContainerStyle={styles.panelScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                nestedScrollEnabled
              >

            {hasOpenRequest && activeRequest.status === "reviewing" && !myOffer ? (
              <View style={styles.offerCard}>
                <Text style={styles.costTitle}>Your offer</Text>
                <Text style={styles.costText}>Enter your service price. The driver will see the total including the 6% system charge.</Text>
                <TextInput
                  value={offerPrice}
                  onChangeText={setOfferPrice}
                  style={styles.input}
                  placeholder="$25"
                  placeholderTextColor={palette.inkSoft}
                  keyboardType="numeric"
                />
                <Pressable
                  onPress={handleAction}
                  style={({ pressed }) => [styles.requestMechanicButton, pressed && styles.requestMechanicButtonPressed]}
                >
                  <Text style={styles.requestMechanicButtonText}>Send your offer</Text>
                </Pressable>
              </View>
            ) : null}

            {hasOpenRequest ? (
              <View style={[styles.requestPeekCard, styles.requestSummaryCard]}>
                <View style={styles.requestPeekHeader}>
                  <View style={styles.requestIcon}>
                    <Ionicons name="construct" size={17} color="#FFFFFF" />
                  </View>
                  <View style={styles.requestCopy}>
                    <Text style={styles.requestEyebrow}>{iWonTheJob ? "YOUR ACTIVE JOB" : "NEW SERVICE REQUEST"}</Text>
                    <Text numberOfLines={1} style={styles.requestTitle}>{activeRequest.issue}</Text>
                  </View>
                  <View style={styles.requestEta}>
                    <Text numberOfLines={1} style={styles.requestEtaValue}>{hasSharedArrivalLocation ? "Here" : `${sheetTargetMechanic?.etaMinutes ?? "--"} min`}</Text>
                    <Text style={styles.requestEtaLabel}>ETA</Text>
                  </View>
                </View>

                <View style={styles.requestDetailGrid}>
                  <View style={styles.requestDetailBlock}>
                    <Text style={styles.requestDetailLabel}>Pickup location</Text>
                    <Text style={styles.requestDetailValue}>{activeRequest.locationLabel || "Not provided"}</Text>
                  </View>
                  <View style={styles.requestDetailBlock}>
                    <Text style={styles.requestDetailLabel}>Vehicle</Text>
                    <Text style={styles.requestDetailValue}>{activeRequest.vehicle || "Not provided"}</Text>
                  </View>
                  <View style={styles.requestDetailBlock}>
                    <Text style={styles.requestDetailLabel}>Budget</Text>
                    <Text style={styles.requestDetailValue}>{activeRequest.budget || "Not provided"}</Text>
                  </View>
                  <View style={styles.requestDetailBlock}>
                    <Text style={styles.requestDetailLabel}>Payment</Text>
                    <Text style={styles.requestDetailValue}>{activeRequest.paymentMethod || "Not provided"}</Text>
                  </View>
                </View>

                <View style={styles.requestNotesBlock}>
                  <Text style={styles.requestDetailLabel}>Driver notes</Text>
                  <Text style={styles.requestDetailValue}>{activeRequest.notes || "No extra notes from driver."}</Text>
                </View>

                <View style={styles.requestPeekFooter}>
                  <Ionicons name="location" size={14} color={palette.primaryDark} />
                  <Text style={styles.requestLocation}>
                    {driverCoordinate ? `${driverCoordinate.latitude.toFixed(5)}, ${driverCoordinate.longitude.toFixed(5)}` : "Coordinates unavailable"}
                  </Text>
                  <Text style={styles.requestVehicle}>{activeRequest.status}</Text>
                </View>
              </View>
            ) : null}

            {hasOpenRequest && isCommunicationOpen ? (
              <View style={styles.communicationCard}>
                <View style={styles.communicationHeader}>
                  <Pressable
                    accessibilityLabel="Call driver"
                    onPress={handleCallDriver}
                    style={({ pressed }) => [styles.callButton, pressed && styles.communicationButtonPressed]}
                  >
                    <Ionicons name="call" size={19} color="#FFFFFF" />
                  </Pressable>
                </View>

                {(activeRequest.messages ?? []).length ? (
                  <View style={styles.messageList}>
                    {(activeRequest.messages ?? []).map((message) => (
                      <View
                        key={message.id}
                        style={[styles.messageBubble, message.senderRole === "mechanic" && styles.messageBubbleMine]}
                      >
                        <Text style={styles.messageSender}>{message.senderRole === "mechanic" ? "You" : message.senderName}</Text>
                        {message.photoUri ? <Image source={{ uri: message.photoUri }} style={styles.messagePhoto} /> : null}
                        {message.text ? <Text style={styles.messageText}>{message.text}</Text> : null}
                      </View>
                    ))}
                  </View>
                ) : null}

                {diagnosisPhotoUri ? (
                  <View style={styles.photoPreviewWrap}>
                    <Image source={{ uri: diagnosisPhotoUri }} style={styles.photoPreview} />
                    <Pressable
                      accessibilityLabel="Remove diagnosis photo"
                      onPress={() => setDiagnosisPhotoUri(undefined)}
                      style={styles.removePhotoButton}
                    >
                      <Ionicons name="close" size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ) : null}

                <View style={styles.messageComposer}>
                  <Pressable
                    accessibilityLabel="Attach diagnosis photo"
                    onPress={handlePickDiagnosisPhoto}
                    style={({ pressed }) => [styles.attachButton, pressed && styles.communicationButtonPressed]}
                  >
                    <Ionicons name="camera" size={20} color={palette.primaryDark} />
                  </Pressable>
                  <TextInput
                    value={messageDraft}
                    onChangeText={setMessageDraft}
                    style={styles.messageInput}
                    placeholder="Message the driver"
                    placeholderTextColor={palette.inkSoft}
                    multiline
                  />
                  <Pressable
                    accessibilityLabel="Send message"
                    onPress={handleSendMessage}
                    style={({ pressed }) => [styles.sendMessageButton, pressed && styles.communicationButtonPressed]}
                  >
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            ) : null}

            {mechanicNotification ? (
              <View style={styles.noticeWrap}>
                <LiveRequestNotice
                  title={mechanicNotification.title}
                  message={mechanicNotification.message}
                  onDismiss={dismissMechanicNotification}
                />
              </View>
            ) : null}

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Ionicons name="briefcase-outline" size={16} color={palette.primaryDark} />
                <Text style={styles.metricValue}>{openServiceRequests.length}</Text>
                <Text style={styles.metricLabel}>Live jobs</Text>
              </View>
              <View style={styles.metricCard}>
                <Ionicons name="time-outline" size={16} color={palette.primaryDark} />
                <Text style={styles.metricValue}>{hasSharedArrivalLocation ? "Here" : `${sheetTargetMechanic?.etaMinutes ?? 0} min`}</Text>
                <Text style={styles.metricLabel}>{hasSharedArrivalLocation ? "Arrived" : "Your ETA"}</Text>
              </View>
              <View style={styles.metricCard}>
                <Ionicons name="cash-outline" size={16} color={palette.primaryDark} />
                <Text style={styles.metricValue}>{myOffer?.basePrice ?? myOffer?.price ?? "--"}</Text>
                <Text style={styles.metricLabel}>Your offer</Text>
              </View>
            </View>

            {hasOpenRequest ? (
              <View style={styles.transportCard}>
                <Text style={styles.transportTitle}>How are you getting there?</Text>
                <Text style={styles.transportText}>
                  Choose your travel mode so the driver sees the right arrival estimate.
                </Text>
                <View style={styles.transportRow}>
                  {mechanicTransportOptions.map((option) => {
                    const isSelected = option.id === visibleTransportType;

                    return (
                      <Pressable
                        key={option.id}
                        onPress={() => updateMechanicTransportMode(option.id)}
                        style={({ pressed }) => [
                          styles.transportChip,
                          isSelected && styles.transportChipActive,
                          pressed && styles.transportChipPressed
                        ]}
                      >
                        <Ionicons
                          name={getTransportIconName(option.id)}
                          size={16}
                          color={isSelected ? "#FFFFFF" : palette.ink}
                        />
                        <Text style={[styles.transportChipLabel, isSelected && styles.transportChipLabelActive]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={styles.transportHint}>
                  {visibleTransportType
                    ? `Current mode: ${getTransportLabel(visibleTransportType)}`
                    : "Transport will appear here after the mechanic sets it while sending the offer."}
                </Text>
              </View>
            ) : null}

            <Text style={styles.liveSectionTitle}>{statusTitle}</Text>

            <View style={[styles.liveList, styles.liveListContent]}>
              {hasOpenRequest ? (
                <View style={styles.trackingCard}>
                  <Text style={styles.trackingStatus}>
                    {hasSharedArrivalLocation
                      ? "You have arrived"
                      : activeRequest.status === "reviewing"
                      ? myOffer
                        ? "Driver is reviewing your offer"
                        : "Send your offer to the driver"
                      : activeRequest.status === "accepted"
                        ? "You were selected"
                        : activeRequest.status === "arriving"
                          ? "Driver is waiting for arrival"
                          : "Job completed"}
                  </Text>
                  <View style={styles.trackingNameRow}>
                    <View style={styles.trackingNameIcon}>
                      <Ionicons name="person" size={18} color="#FFFFFF" />
                    </View>
                    <Text style={styles.trackingName}>{sheetTargetMechanic?.name ?? "Mechanic"}</Text>
                  </View>
                  <Text style={styles.trackingMeta}>{activeRequest.locationLabel}</Text>
                  <Text style={styles.trackingMeta}>{activeRequest.issue}</Text>
                  <Text style={styles.trackingMeta}>{activeRequest.vehicle}</Text>
                  <View style={styles.safeZoneCard}>
                    <View style={styles.safeZoneHeader}>
                      <Ionicons name="shield-checkmark" size={17} color={palette.success} />
                      <Text style={styles.safeZoneTitle}>Safe zone</Text>
                      <Text style={styles.safeZoneStatus}>Confirm before arrival</Text>
                    </View>
                    <Text style={styles.safeZoneText}>
                      Meeting point: {activeRequest.locationLabel}. Keep the vehicle in a visible area and confirm the driver and vehicle before starting work.
                    </Text>
                  </View>
                  {iWonTheJob && activeRequest.status === "arriving" ? (
                    <View style={styles.costCard}>
                      <Text style={styles.costTitle}>Final repair cost</Text>
                      <Text style={styles.costText}>
                        Add the repair amount after checking the car so the driver can complete payment.
                      </Text>
                      <TextInput
                        value={repairCost}
                        onChangeText={setRepairCost}
                        style={styles.input}
                        placeholder="$45"
                        placeholderTextColor={palette.inkSoft}
                        keyboardType="numeric"
                        onFocus={() => {
                          setTimeout(() => panelScrollRef.current?.scrollToEnd({ animated: true }), 500);
                        }}
                      />
                    </View>
                  ) : null}

                  {activeRequest.totalPaymentDue && iWonTheJob ? (
                    <View style={styles.completedCard}>
                      <Text style={styles.completedTitle}>Payment sent to driver</Text>
                      <Text style={styles.completedMeta}>Repair cost {activeRequest.repairCost ?? "--"}</Text>
                      <Text style={styles.completedMeta}>FixNow fee {activeRequest.platformFee ?? "--"}</Text>
                      <Text style={styles.completedMeta}>Driver pays {activeRequest.totalPaymentDue ?? "--"}</Text>
                    </View>
                  ) : null}

                  {activeRequest.status !== "reviewing" ? (
                    <Pressable
                      onPress={handleAction}
                      style={({ pressed }) => [
                        styles.requestMechanicButton,
                        (!hasOpenRequest || (activeRequest.status !== "completed" && !iWonTheJob)) &&
                          styles.requestMechanicButtonDisabled,
                        pressed && styles.requestMechanicButtonPressed
                      ]}
                    >
                      <Text style={styles.requestMechanicButtonText}>{actionLabel}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>No live driver request yet</Text>
                  <Text style={styles.emptyStateText}>
                    This map now mirrors the driver map style. As soon as a driver submits a rescue request, it will appear here automatically.
                  </Text>
                </View>
              )}
            </View>
            </ScrollView>
          </View>
          </KeyboardAvoidingView>
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
  requestPeekCard: {
    display: "none",
    marginTop: 14,
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.86)",
    shadowColor: "#0F1720",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5
  },
  requestSummaryCard: {
    display: "flex",
    marginHorizontal: 0,
    shadowOpacity: 0.08,
    elevation: 2
  },
  requestDetailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#EDF0F2"
  },
  requestDetailBlock: {
    width: "48%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F8FAFB",
    borderWidth: 1,
    borderColor: mechanicBorder
  },
  requestNotesBlock: {
    marginTop: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F8FAFB",
    borderWidth: 1,
    borderColor: mechanicBorder
  },
  requestDetailLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: palette.inkSoft
  },
  requestDetailValue: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    color: palette.ink
  },
  requestPeekHeader: {
    flexDirection: "row",
    alignItems: "center"
  },
  requestIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary
  },
  requestCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10
  },
  requestEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.75,
    color: palette.primaryDark
  },
  requestTitle: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: "800",
    color: palette.ink
  },
  requestEta: {
    alignItems: "flex-end",
    minWidth: 54,
    flexShrink: 0,
    paddingLeft: 8
  },
  requestEtaValue: {
    fontSize: 15,
    fontWeight: "800",
    color: palette.ink
  },
  requestEtaLabel: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: "700",
    color: palette.inkSoft
  },
  requestPeekFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EDF0F2"
  },
  requestLocation: {
    flex: 1,
    fontSize: 12,
    color: palette.inkSoft
  },
  requestVehicle: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.ink
  },
  onlineChip: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.96)"
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.success
  },
  onlineChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.ink
  },
  sheetWrap: {
    position: "absolute",
    top: 150,
    left: 0,
    right: 0,
    bottom: 0
  },
  bottomPanel: {
    flex: 1,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)"
  },
  keyboardAvoider: {
    flex: 1
  },
  panelScroll: {
    flex: 1
  },
  panelScrollContent: {
    paddingBottom: 8
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
  noticeWrap: {
    marginTop: 14
  },
  communicationCard: {
    marginTop: 10,
    borderRadius: 18,
    padding: 14,
    backgroundColor: mechanicSurface,
    borderWidth: 1,
    borderColor: mechanicBorder
  },
  communicationIconButton: {
    position: "absolute",
    top: 12,
    right: 18,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: mechanicSoft,
    borderWidth: 1,
    borderColor: mechanicBorder
  },
  communicationIconButtonActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary
  },
  communicationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12
  },
  callButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.success
  },
  communicationButtonPressed: {
    opacity: 0.78
  },
  messageList: {
    marginTop: 14,
    gap: 8
  },
  messageBubble: {
    alignSelf: "flex-start",
    maxWidth: "88%",
    borderRadius: 14,
    padding: 10,
    backgroundColor: mechanicSoft
  },
  messageBubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: "#E8F7EE"
  },
  messageSender: {
    fontSize: 10,
    fontWeight: "800",
    color: palette.primaryDark
  },
  messageText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: palette.ink
  },
  messagePhoto: {
    width: 190,
    maxWidth: "100%",
    aspectRatio: 4 / 3,
    marginTop: 7,
    borderRadius: 10,
    backgroundColor: mechanicBorder
  },
  photoPreviewWrap: {
    width: 96,
    height: 76,
    marginTop: 12
  },
  photoPreview: {
    width: 96,
    height: 76,
    borderRadius: 10,
    backgroundColor: mechanicBorder
  },
  removePhotoButton: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.78)"
  },
  messageComposer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 12
  },
  attachButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: mechanicSoft,
    borderWidth: 1,
    borderColor: mechanicBorder
  },
  messageInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 92,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: mechanicBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: palette.ink,
    backgroundColor: "#F8FAFB"
  },
  sendMessageButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: mechanicSoft
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
  transportCard: {
    marginTop: 14,
    paddingTop: 4
  },
  transportTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: palette.ink
  },
  transportText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSoft
  },
  transportRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12
  },
  transportChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: mechanicBorder,
    backgroundColor: "#FFFFFF"
  },
  transportChipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary
  },
  transportChipPressed: {
    opacity: 0.84
  },
  transportChipLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.ink
  },
  transportChipLabelActive: {
    color: "#FFFFFF"
  },
  transportHint: {
    marginTop: 10,
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
    marginTop: 20
  },
  liveListContent: {
    paddingBottom: 32,
    gap: 12
  },
  trackingCard: {
    paddingBottom: 4
  },
  trackingStatus: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: palette.primaryDark
  },
  trackingNameRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  trackingNameIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary
  },
  trackingName: {
    flex: 1,
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
  safeZoneCard: {
    marginTop: 14,
    borderRadius: 16,
    padding: 13,
    backgroundColor: "#EEF9F2",
    borderWidth: 1,
    borderColor: "#B8E1C5"
  },
  safeZoneHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  safeZoneTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: palette.success
  },
  safeZoneStatus: {
    marginLeft: "auto",
    fontSize: 11,
    fontWeight: "700",
    color: palette.primaryDark
  },
  safeZoneText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSoft
  },
  costCard: {
    marginTop: 16,
    borderRadius: 18,
    padding: 14,
    backgroundColor: mechanicSurface,
    borderWidth: 1,
    borderColor: mechanicBorder
  },
  offerCard: {
    marginTop: 16,
    borderRadius: 18,
    padding: 14,
    backgroundColor: mechanicSurface,
    borderWidth: 1,
    borderColor: mechanicBorder
  },
  costTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.ink
  },
  costText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSoft
  },
  input: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "#F8FAFB",
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: palette.ink
  },
  requestMechanicButton: {
    marginTop: 16,
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
  completedCard: {
    marginTop: 16,
    borderRadius: 18,
    padding: 14,
    backgroundColor: mechanicSurface,
    borderWidth: 1,
    borderColor: mechanicBorder
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
  emptyState: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: mechanicSoft
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
  }
});
