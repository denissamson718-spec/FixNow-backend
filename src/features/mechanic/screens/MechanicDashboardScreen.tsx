import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { InfoPill } from "../../../components/InfoPill";
import { LiveRequestNotice } from "../../../components/LiveRequestNotice";
import { Screen } from "../../../components/Screen";
import { SectionCard } from "../../../components/SectionCard";
import { useAppContext } from "../../../state/AppContext";
import { palette } from "../../../theme/palette";
import { MechanicSideMenu } from "../components/MechanicSideMenu";
export function MechanicDashboardScreen() {
  const {
    activeRequest,
    currentMechanic,
    dismissMechanicNotification,
    mechanicNotification,
    openServiceRequests,
    ratings
  } = useAppContext();
  const hasOpenRequest = openServiceRequests.length > 0 && activeRequest.status !== "draft";
  const openJobs = openServiceRequests.length;
  const iWonTheJob = activeRequest.assignedMechanicId === currentMechanic?.id;
  const mechanicRatings = ratings.filter((rating) => rating.mechanicId === currentMechanic?.id);
  const completedJobs = mechanicRatings.length;

  return (
    <Screen>
      <MechanicSideMenu />
      <Text style={styles.title}>Mechanic dashboard</Text>
      <Text style={styles.subtitle}>Review live driver requests, confirmed repair costs, and your service activity.</Text>

      {mechanicNotification ? (
        <View style={styles.noticeWrap}>
          <LiveRequestNotice
            title={mechanicNotification.title}
            message={mechanicNotification.message}
            onDismiss={dismissMechanicNotification}
          />
        </View>
      ) : null}

      <SectionCard style={styles.highlight}>
        <View style={styles.headerRow}>
          <Text style={styles.label}>Incoming breakdown alert</Text>
          <InfoPill label={`${openJobs} open ${openJobs === 1 ? "job" : "jobs"}`} />
        </View>
        <Text style={styles.issue}>{hasOpenRequest ? activeRequest.issue : "Waiting for live driver requests"}</Text>
        <Text style={styles.meta}>
          {hasOpenRequest ? activeRequest.vehicle : "Stay available and approved drivers will appear here automatically."}
        </Text>
        <Text style={styles.meta}>
          {hasOpenRequest
            ? activeRequest.locationLabel
            : currentMechanic?.specialty ?? "Roadside support"}
        </Text>
        <Text style={styles.liveHint}>
          {hasOpenRequest
            ? "This request came from a real driver flow and is available in the Jobs map."
            : "No live request yet. A driver must request roadside help before a job appears."}
        </Text>
      </SectionCard>

      {iWonTheJob && activeRequest.status === "arriving" ? (
        <SectionCard style={styles.composerCard}>
          <Text style={styles.sectionTitle}>Final repair amount</Text>
          <Text style={styles.helperText}>
            Only the driver can enter and confirm the final repair cost. The confirmed amount and payment summary will appear here automatically.
          </Text>
          <Text style={styles.meta}>Waiting for driver confirmation</Text>
        </SectionCard>
      ) : null}

      {activeRequest.totalPaymentDue && iWonTheJob ? (
        <SectionCard style={styles.composerCard}>
          <Text style={styles.sectionTitle}>Driver confirmed final cost</Text>
          <Text style={styles.helperText}>
            The driver confirmed the repair amount. The 7% FixNow fee and total payment are shown below.
          </Text>
          <Text style={styles.meta}>Repair cost: {activeRequest.repairCost}</Text>
          <Text style={styles.meta}>FixNow fee: {activeRequest.platformFee}</Text>
          <Text style={styles.meta}>Driver pays: {activeRequest.totalPaymentDue}</Text>
        </SectionCard>
      ) : null}

      <View style={styles.statsRow}>
        <SectionCard style={styles.statCard}>
          <Text style={styles.statValue}>{completedJobs}</Text>
          <Text style={styles.statLabel}>Jobs completed</Text>
        </SectionCard>
        <SectionCard style={styles.statCard}>
          <Text style={styles.statValue}>{currentMechanic?.rating ? currentMechanic.rating.toFixed(1) : "--"}</Text>
          <Text style={styles.statLabel}>Average rating</Text>
        </SectionCard>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: "800",
    color: palette.ink
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkSoft
  },
  highlight: {
    marginTop: 20
  },
  noticeWrap: {
    marginTop: 18
  },
  composerCard: {
    marginTop: 18
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.8
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
  liveHint: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSoft
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.ink
  },
  helperText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSoft
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  feePreview: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: palette.border
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginTop: 8
  },
  previewLabel: {
    fontSize: 14,
    color: palette.inkSoft
  },
  previewValue: {
    fontSize: 14,
    fontWeight: "700",
    color: palette.ink
  },
  previewTotalRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border
  },
  previewTotalLabel: {
    fontSize: 15,
    fontWeight: "800",
    color: palette.ink
  },
  previewTotalValue: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.primaryDark
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18
  },
  statCard: {
    flex: 1
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.accent
  },
  statLabel: {
    marginTop: 6,
    fontSize: 14,
    color: palette.inkSoft
  }
});
