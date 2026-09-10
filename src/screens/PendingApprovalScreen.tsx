import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useAppContext } from "../state/AppContext";
import { palette } from "../theme/palette";

export function PendingApprovalScreen() {
  const { clearPendingApproval, pendingApprovalAccount } = useAppContext();

  return (
    <Screen>
      <LinearGradient colors={["#F2F8F4", "#D8EFDF"]} style={styles.hero}>
        <Text style={styles.kicker}>Mechanic approval</Text>
        <Text style={styles.title}>Your signup is under review.</Text>
        <Text style={styles.subtitle}>
          Keep FixNow open while admin reviews your mechanic account. As soon as you are approved, the app will open your
          mechanic dashboard automatically.
        </Text>
      </LinearGradient>

      <View style={styles.card}>
        <Text style={styles.label}>Mechanic account</Text>
        <Text style={styles.value}>{pendingApprovalAccount?.profile.fullName ?? "Pending mechanic"}</Text>
        <Text style={styles.meta}>{pendingApprovalAccount?.profile.email ?? "Waiting for approval"}</Text>
        <Text style={styles.status}>Status: {pendingApprovalAccount?.approvalStatus === "approved" ? "Approved" : "Pending admin approval"}</Text>
      </View>

      <PrimaryButton label="Back To Start" tone="secondary" onPress={clearPendingApproval} style={styles.button} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: 14,
    borderRadius: 28,
    padding: 24
  },
  kicker: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: palette.primaryDark
  },
  title: {
    marginTop: 12,
    fontSize: 32,
    lineHeight: 39,
    fontWeight: "800",
    color: palette.ink
  },
  subtitle: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkSoft
  },
  card: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    borderRadius: 22,
    padding: 20
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: palette.primaryDark
  },
  value: {
    marginTop: 10,
    fontSize: 22,
    fontWeight: "800",
    color: palette.ink
  },
  meta: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkSoft
  },
  status: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: "700",
    color: palette.accent
  },
  button: {
    marginTop: 18
  }
});
