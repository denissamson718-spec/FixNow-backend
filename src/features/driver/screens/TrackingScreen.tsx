import React, { useState, useMemo } from "react";
import { Alert, Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useNavigation } from "@react-navigation/native";

import { BackArrowButton } from "../../../components/BackArrowButton";
import { MapPreview } from "../../../components/MapPreview";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { Screen } from "../../../components/Screen";
import { SectionCard } from "../../../components/SectionCard";
import { useAppContext } from "../../../state/AppContext";
import { useDistanceTracking } from "../../../hooks/useDistanceTracking";
import { palette } from "../../../theme/palette";
import { formatCurrency, parseCurrency } from "../../../utils/pricing";
import { DriverSideMenu } from "../components/DriverSideMenu";
import { UnreadMessageBadge } from "../../../components/UnreadMessageBadge";

const statusLabel: Record<string, string> = {
  draft: "Draft request",
  searching: "Searching for mechanics",
  reviewing: "Comparing mechanic offers",
  accepted: "Mechanic selected",
  arriving: "Mechanic arriving",
  completed: "Job completed"
};

export function TrackingScreen() {
  const navigation = useNavigation<any>();
  const { activeRequest, mechanics, registeredAccounts, advanceRequestStatus, completeServiceWithCost, resetRequest, sendJobMessage, submitMechanicRating, unreadJobMessageCount } = useAppContext();
  const assignedMechanic = mechanics.find((mechanic) => mechanic.id === activeRequest.assignedMechanicId);
  const mechanicAccount = registeredAccounts.find(
    (account) => account.role === "mechanic" && (account.linkedMechanicId === assignedMechanic?.id || account.id === assignedMechanic?.id)
  );
  
  // Calculate real-time distance to assigned mechanic
  const liveDistanceInfo = useDistanceTracking(
    assignedMechanic?.latitude,
    assignedMechanic?.longitude,
    activeRequest.latitude,
    activeRequest.longitude
  );
  
  const [selectedRating, setSelectedRating] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [hasSubmittedRating, setHasSubmittedRating] = useState(false);
  const [repairCost, setRepairCost] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [diagnosisPhotoUri, setDiagnosisPhotoUri] = useState<string | undefined>(undefined);
  const repairAmount = parseCurrency(repairCost);
  const platformFeePreview = repairAmount * 0.07;
  const totalPreview = repairAmount + platformFeePreview;
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("DriverTabs");
  };

  const nextAction = activeRequest.status === "completed" ? resetRequest : advanceRequestStatus;
  const nextLabel =
    activeRequest.status === "accepted"
      ? "Mark Mechanic En Route"
      : "Start New Request";
  const acceptedOfferLabel = `Accepted offer: ${activeRequest.agreedPrice ?? "--"}`;
  const paymentRepairCostLabel = `${activeRequest.repairCost ?? "--"}`;
  const paymentPlatformFeeLabel = `${activeRequest.platformFee ?? "--"}`;
  const paymentTotalLabel = `${activeRequest.totalPaymentDue ?? "--"}`;
  const paymentMethodLabel = `Payment method: ${activeRequest.paymentMethod ?? "--"}`;
  const handlePickDiagnosisPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required", "Allow photo access to send the mechanic a diagnosis image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.6, base64: true });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setDiagnosisPhotoUri(asset.base64 ? `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}` : asset.uri);
    }
  };
  const handleSendMessage = () => {
    if (!messageDraft.trim() && !diagnosisPhotoUri) return;
    sendJobMessage(messageDraft, diagnosisPhotoUri);
    setMessageDraft("");
    setDiagnosisPhotoUri(undefined);
  };
  const handleCallMechanic = async () => {
    const phone = mechanicAccount?.profile.phone?.trim();
    if (!phone) {
      Alert.alert("Phone unavailable", "The mechanic's phone number is not available.");
      return;
    }
    try {
      await Linking.openURL(`tel:${phone.replace(/[^+\d]/g, "")}`);
    } catch {
      Alert.alert("Call unavailable", "This device could not open the phone dialer.");
    }
  };

  return (
    <Screen>
      <DriverSideMenu />
      <View style={styles.titleRow}>
        <Text style={styles.title}>Live tracking</Text>
        <Pressable accessibilityLabel="Open job chat" onPress={() => navigation.navigate("Chat")} style={styles.openChatButton}>
          <Ionicons name="chatbubbles" size={21} color={palette.primaryDark} />
          <UnreadMessageBadge count={unreadJobMessageCount} />
        </Pressable>
      </View>
      <Text style={styles.subtitle}>Follow your chosen mechanic from accepted offer to arrival and completed repair.</Text>

      <MapPreview
        title={assignedMechanic ? `${assignedMechanic.name} is heading to you` : "Waiting for mechanic confirmation"}
        subtitle={
          assignedMechanic && liveDistanceInfo
            ? `${liveDistanceInfo.distanceKm} km away • ${liveDistanceInfo.etaMinutes} min ETA`
            : assignedMechanic ? `${assignedMechanic.etaMinutes} min ETA from ${activeRequest.locationLabel}`
            : activeRequest.locationLabel
        }
        mechanics={
          assignedMechanic
            ? [
                {
                  id: assignedMechanic.id,
                  name: assignedMechanic.name,
                  specialty: assignedMechanic.specialty,
                  etaMinutes: assignedMechanic.etaMinutes,
                  distanceKm: assignedMechanic.distanceKm,
                  rating: assignedMechanic.rating,
                  priceLabel: activeRequest.agreedPrice ? `${activeRequest.agreedPrice} accepted` : assignedMechanic.serviceFee,
                  latitude: assignedMechanic.latitude,
                  longitude: assignedMechanic.longitude,
                  profilePhoto: assignedMechanic.profilePhoto
                }
              ]
            : undefined
        }
        driverLatitude={activeRequest.latitude}
        driverLongitude={activeRequest.longitude}
      />

      <SectionCard style={styles.statusCard}>
        <Text style={styles.statusTitle}>{statusLabel[activeRequest.status]}</Text>
        <Text style={styles.issue}>{activeRequest.issue}</Text>
        <Text style={styles.meta}>{activeRequest.vehicle}</Text>
        <Text style={styles.meta}>{activeRequest.locationLabel}</Text>
        {activeRequest.agreedPrice ? <Text style={styles.meta}>{acceptedOfferLabel}</Text> : null}
        {assignedMechanic ? (
          <View style={styles.mechanicBox}>
            <Text style={styles.mechanicName}>{assignedMechanic.name}</Text>
            <Text style={styles.mechanicMeta}>
              {`${assignedMechanic.specialty} | Rated ${assignedMechanic.rating.toFixed(1)}/5`}
            </Text>
            {liveDistanceInfo ? (
              <Text style={styles.mechanicMeta} numberOfLines={1}>
                {`📍 ${liveDistanceInfo.distanceKm} km away • ⏱ ${liveDistanceInfo.etaMinutes} min`}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.pendingText}>Nearby mechanics are being notified now.</Text>
        )}
      </SectionCard>

      {activeRequest.status === "arriving" ? (
        <SectionCard style={styles.paymentCard}>
          <Text style={styles.paymentTitle}>Confirm final repair cost</Text>
          <Text style={styles.paymentSubtitle}>
            Enter the agreed final repair amount. Confirm it only after checking the completed work with your mechanic.
          </Text>
          <TextInput
            value={repairCost}
            onChangeText={setRepairCost}
            placeholder="Enter repair cost"
            placeholderTextColor={palette.inkSoft}
            keyboardType="decimal-pad"
            style={styles.repairCostInput}
          />
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Repair cost</Text>
            <Text style={styles.paymentValue}>{repairAmount > 0 ? formatCurrency(repairAmount) : "--"}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>FixNow fee (7%)</Text>
            <Text style={styles.paymentValue}>{repairAmount > 0 ? formatCurrency(platformFeePreview) : "--"}</Text>
          </View>
          <View style={[styles.paymentRow, styles.paymentRowTotal]}>
            <Text style={styles.paymentTotalLabel}>Total payment</Text>
            <Text style={styles.paymentTotalValue}>{repairAmount > 0 ? formatCurrency(totalPreview) : "--"}</Text>
          </View>
          <PrimaryButton
            label="Confirm Final Repair Cost"
            onPress={() => {
              if (repairAmount <= 0) {
                Alert.alert("Missing repair cost", "Enter a valid final repair cost before confirming.");
                return;
              }

              completeServiceWithCost(repairCost);
            }}
            style={styles.confirmCostButton}
          />
        </SectionCard>
      ) : null}

      {activeRequest.totalPaymentDue ? (
        <SectionCard style={styles.paymentCard}>
          <Text style={styles.paymentTitle}>Payment to FixNow</Text>
          <Text style={styles.paymentSubtitle}>
            You confirmed the final repair cost. FixNow adds a 7% system charge and records the payment summary.
          </Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Repair cost</Text>
            <Text style={styles.paymentValue}>{paymentRepairCostLabel}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>FixNow fee (7%)</Text>
            <Text style={styles.paymentValue}>{paymentPlatformFeeLabel}</Text>
          </View>
          <View style={[styles.paymentRow, styles.paymentRowTotal]}>
            <Text style={styles.paymentTotalLabel}>Pay through system</Text>
            <Text style={styles.paymentTotalValue}>{paymentTotalLabel}</Text>
          </View>
          <Text style={styles.paymentMethod}>{paymentMethodLabel}</Text>
        </SectionCard>
      ) : null}

      {activeRequest.status === "completed" && assignedMechanic ? (
        <SectionCard style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>Rate your mechanic</Text>
          <Text style={styles.ratingSubtitle}>Drivers rate completed jobs on a 5-star standard.</Text>
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
            placeholder="Optional comment about the service"
            placeholderTextColor={palette.inkSoft}
            style={styles.commentInput}
            multiline
          />
          {!hasSubmittedRating ? (
            <PrimaryButton
              label="Submit Driver Rating"
              onPress={() => {
                submitMechanicRating(selectedRating, ratingComment);
                setHasSubmittedRating(true);
              }}
              style={styles.ratingButton}
            />
          ) : (
            <Text style={styles.ratingSuccess}>Your {selectedRating}/5 rating was added for this mechanic.</Text>
          )}
        </SectionCard>
      ) : null}

      {activeRequest.status !== "reviewing" && activeRequest.status !== "arriving" ? (
        <PrimaryButton label={nextLabel} onPress={nextAction} style={styles.actionButton} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.ink
  },
  titleRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  openChatButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkSoft
  },
  statusCard: {
    marginTop: 18
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.primaryDark
  },
  issue: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: "800",
    color: palette.ink
  },
  meta: {
    marginTop: 6,
    fontSize: 14,
    color: palette.inkSoft
  },
  mechanicBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: palette.accentSoft
  },
  mechanicName: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.accent
  },
  mechanicMeta: {
    marginTop: 4,
    fontSize: 14,
    color: palette.inkSoft
  },
  pendingText: {
    marginTop: 16,
    fontSize: 14,
    color: palette.inkSoft
  },
  paymentCard: {
    marginTop: 18
  },
  chatCard: {
    marginTop: 18
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  chatHeaderCopy: {
    flex: 1
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.ink
  },
  chatSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSoft
  },
  chatCallButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.success
  },
  chatBubble: {
    alignSelf: "flex-start",
    maxWidth: "88%",
    marginTop: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: palette.accentSoft
  },
  chatBubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: "#E8F7EE"
  },
  chatSender: {
    fontSize: 10,
    fontWeight: "800",
    color: palette.primaryDark
  },
  chatText: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: palette.ink
  },
  chatPhoto: {
    width: 190,
    maxWidth: "100%",
    aspectRatio: 4 / 3,
    marginTop: 7,
    borderRadius: 10
  },
  chatPreview: {
    width: 96,
    height: 76,
    marginTop: 12,
    borderRadius: 10
  },
  chatComposer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 12
  },
  chatIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface
  },
  chatInput: {
    flex: 1,
    minHeight: 42,
    maxHeight: 92,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: palette.ink,
    backgroundColor: palette.surface
  },
  chatSendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary
  },
  repairCostInput: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 17,
    fontWeight: "700",
    color: palette.ink
  },
  confirmCostButton: {
    marginTop: 18
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.ink
  },
  paymentSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSoft
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    gap: 12
  },
  paymentRowTotal: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border
  },
  paymentLabel: {
    fontSize: 14,
    color: palette.inkSoft
  },
  paymentValue: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.ink
  },
  paymentTotalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: palette.ink
  },
  paymentTotalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.primaryDark
  },
  paymentMethod: {
    marginTop: 14,
    fontSize: 13,
    color: palette.inkSoft
  },
  ratingCard: {
    marginTop: 18
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.ink
  },
  ratingSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSoft
  },
  ratingRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14
  },
  ratingPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface
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
  commentInput: {
    marginTop: 14,
    minHeight: 96,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlignVertical: "top",
    fontSize: 15,
    color: palette.ink
  },
  ratingButton: {
    marginTop: 14
  },
  ratingSuccess: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: "700",
    color: palette.primaryDark
  },
  actionButton: {
    marginTop: 18
  }
});
