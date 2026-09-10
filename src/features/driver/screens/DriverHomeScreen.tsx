import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

// @ts-ignore - project JSX settings are not configured for this TSX component import.
import { BackArrowButton } from "../../../components/BackArrowButton";
import { InfoPill } from "../../../components/InfoPill";
import { OnlineStatusPill } from "../../../components/OnlineStatusPill";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { Screen } from "../../../components/Screen";
import { SectionCard } from "../../../components/SectionCard";
import { useAppContext } from "../../../state/AppContext";
import { palette } from "../../../theme/palette";
import { DriverSideMenu } from "../components/DriverSideMenu";

export function DriverHomeScreen() {
  const navigation = useNavigation<any>();
  const { mechanics, activeRequest, offers } = useAppContext();
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("Home");
  };
  const availableMechanics = mechanics.filter((mechanic) => mechanic.isAvailable);
  const activeSummary =
    activeRequest.status === "draft"
      ? "No active rescue alert yet."
      : activeRequest.status === "reviewing"
        ? `${offers.length} rescue responses received from nearby mechanics.`
        : `Rescue mechanic confirmed at ${activeRequest.agreedPrice ?? "a confirmed rate"}.`;

  return (
    <Screen>
      <DriverSideMenu />
      <LinearGradient colors={["#F2F8F4", "#D8EFDF"]} style={styles.hero}>
        <Text style={styles.kicker}>Rescue hub</Text>
        <Text style={styles.title}>Get emergency roadside rescue fast and track nearby help in one place.</Text>
        <Text style={styles.subtitle}>
          Use this rescue center to monitor active roadside requests, see who is nearby, and send for help when you need support.
        </Text>
        <View style={styles.pillRow}>
          <OnlineStatusPill label={`${availableMechanics.length} rescue mechanics online`} />
          <InfoPill label={`${offers.length} rescue responses`} />
        </View>
        <PrimaryButton
          label={activeRequest.status === "reviewing" ? "Open Rescue Map" : "Start Rescue Request"}
          onPress={() => navigation.navigate(activeRequest.status === "reviewing" ? "NearbyMechanics" : "Request")}
          style={styles.heroButton}
        />
        <PrimaryButton
          label="Find a route to a mechanic"
          onPress={() => navigation.navigate("RouteFinder")}
          style={styles.routeFinderButton}
        />
      </LinearGradient>

      <SectionCard style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>Active rescue status</Text>
        <Text style={styles.summaryStatus}>{activeSummary}</Text>
        {activeRequest.status === "draft" ? (
          <Text style={styles.summaryMeta}>Fill your location, vehicle, and problem to start a live rescue request.</Text>
        ) : (
          <>
            <Text style={styles.summaryText}>{activeRequest.issue}</Text>
            <Text style={styles.summaryMeta}>{activeRequest.locationLabel}</Text>
            <Text style={styles.summaryMeta}>Vehicle {activeRequest.vehicle}</Text>
          </>
        )}
      </SectionCard>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nearby rescue mechanics</Text>
        <Text style={styles.sectionCaption}>Live approved mechanics</Text>
      </View>

      {availableMechanics.length ? (
        availableMechanics.map((mechanic) => (
          <SectionCard key={mechanic.id} style={styles.mechanicCard}>
            <View style={styles.mechanicHeader}>
              <View>
                <Text style={styles.mechanicName}>{mechanic.name}</Text>
                <Text style={styles.mechanicSpecialty}>{mechanic.specialty}</Text>
              </View>
              <InfoPill label={mechanic.rating > 0 ? `${mechanic.rating.toFixed(1)}/5` : "No ratings yet"} />
            </View>
            <View style={styles.mechanicMetaRow}>
              <Text style={styles.mechanicMeta}>{mechanic.etaMinutes || "--"} min away</Text>
              <Text style={styles.mechanicMeta}>{mechanic.distanceKm || "--"} km</Text>
              <Text style={styles.mechanicMeta}>{mechanic.serviceFee || "Sets price after offer"}</Text>
            </View>
          </SectionCard>
        ))
      ) : (
        <SectionCard style={styles.mechanicCard}>
          <Text style={styles.mechanicSpecialty}>No live mechanics are sharing location yet. Approved mechanics will appear here as soon as they come online.</Text>
        </SectionCard>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 28,
    padding: 22,
    marginTop: 12
  },
  kicker: {
    color: palette.primaryDark,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8
  },
  title: {
    marginTop: 10,
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "800",
    color: palette.ink
  },
  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkSoft
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16
  },
  heroButton: {
    marginTop: 20
  },
  routeFinderButton: {
    marginTop: 10
  },
  summaryCard: {
    marginTop: 18
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between"
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: palette.ink
  },
  sectionCaption: {
    fontSize: 13,
    color: palette.inkSoft
  },
  summaryStatus: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    color: palette.primaryDark
  },
  summaryText: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: "700",
    color: palette.ink
  },
  summaryMeta: {
    marginTop: 4,
    fontSize: 14,
    color: palette.inkSoft
  },
  mechanicCard: {
    marginBottom: 12
  },
  mechanicHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  mechanicName: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.ink
  },
  mechanicSpecialty: {
    marginTop: 4,
    fontSize: 14,
    color: palette.inkSoft
  },
  mechanicMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 14
  },
  mechanicMeta: {
    fontSize: 13,
    color: palette.inkSoft
  }
});
