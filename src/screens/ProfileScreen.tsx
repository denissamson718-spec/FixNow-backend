import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { InfoPill } from "../components/InfoPill";
import { Screen } from "../components/Screen";
import { SectionCard } from "../components/SectionCard";
import { useAppContext } from "../state/AppContext";
import { palette } from "../theme/palette";
import { DriverSideMenu } from "../features/driver/components/DriverSideMenu";
import { MechanicSideMenu } from "../features/mechanic/components/MechanicSideMenu";
export function ProfileScreen() {
  const { paymentMethods, ratings, role, signOut, userName } = useAppContext();
  const initials = userName
    .split(" ")
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
  return (
    <Screen>
      {role === "driver" ? <DriverSideMenu /> : <MechanicSideMenu />}
      <Text style={styles.title}>Profile and trust</Text>
      <Text style={styles.subtitle}>Manage payments, service reputation, and your current FixNow session.</Text>

      <SectionCard style={styles.card}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>{initials || "FN"}</Text>
          </View>
          <View style={styles.profileHeaderText}>
            <Text style={styles.sectionTitle}>{userName}</Text>
            <Text style={styles.caption}>Signed in and ready to request support or accept rescue jobs.</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard style={styles.card}>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.sectionTitle}>Current interface</Text>
            <Text style={styles.caption}>Driver and mechanic experiences are now separated at sign-in.</Text>
          </View>
          <InfoPill label={role === "mechanic" ? "Mechanic" : "Driver"} />
        </View>
      </SectionCard>

      <SectionCard style={styles.card}>
        <Text style={styles.sectionTitle}>Payment methods</Text>
        {paymentMethods.length ? (
          paymentMethods.map((method) => (
            <View key={method.id} style={styles.row}>
              <Text style={styles.rowTitle}>{method.label}</Text>
              <Text style={styles.rowMeta}>{method.isDefault ? "Default" : method.brand}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No saved payment methods yet.</Text>
        )}
      </SectionCard>

      <SectionCard style={styles.card}>
        <Text style={styles.sectionTitle}>Recent ratings</Text>
        {ratings.length ? (
          ratings.map((rating) => (
            <View key={rating.id} style={styles.ratingItem}>
              <View style={styles.row}>
                <Text style={styles.rowTitle}>{rating.mechanicName}</Text>
                <Text style={styles.rowMeta}>Rated {rating.score}/5</Text>
              </View>
              <Text style={styles.comment}>{rating.comment}</Text>
              <Text style={styles.date}>{rating.date}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Ratings will appear here after completed real rescue jobs.</Text>
        )}
      </SectionCard>

      <SectionCard style={styles.card}>
        <Text style={styles.sectionTitle}>Session</Text>
        <Text style={styles.caption}>Use this to return to the authentication screen.</Text>
        <View style={styles.signOutWrap}>
          <Text style={styles.signOutText} onPress={signOut}>
            Sign out
          </Text>
        </View>
      </SectionCard>
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
  card: {
    marginTop: 18
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  profileHeaderText: {
    flex: 1
  },
  avatarFallback: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F7EE",
    borderWidth: 1,
    borderColor: palette.border
  },
  avatarFallbackText: {
    fontSize: 22,
    fontWeight: "800",
    color: palette.primaryDark
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 18,
    alignItems: "center"
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: palette.ink
  },
  caption: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSoft,
    maxWidth: 240
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.ink
  },
  rowMeta: {
    fontSize: 13,
    color: palette.inkSoft
  },
  ratingItem: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: palette.border
  },
  comment: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSoft
  },
  date: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: palette.primaryDark
  },
  emptyText: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSoft
  },
  signOutWrap: {
    marginTop: 14,
    paddingVertical: 12
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "800",
    color: palette.danger
  }
});
