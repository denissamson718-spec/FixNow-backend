import React from "react";
import { StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { BackArrowButton } from "../../../components/BackArrowButton";
import { MapPreview } from "../../../components/MapPreview";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { Screen } from "../../../components/Screen";
import { SectionCard } from "../../../components/SectionCard";
import { useAppContext } from "../../../state/AppContext";
import { palette } from "../../../theme/palette";
import { OfferCard } from "../components/OfferCard";

export function OffersScreen() {
  const navigation = useNavigation<any>();
  const { activeRequest, mechanics, offers, resetRequest, selectOffer } = useAppContext();
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("DriverTabs");
  };
  const nearbyOfferMechanics = offers
    .map((offer) => {
      const mechanic = mechanics.find((item) => item.id === offer.mechanicId);

      if (!mechanic) {
        return null;
      }

      return {
        id: mechanic.id,
        name: mechanic.name,
        specialty: mechanic.specialty,
        etaMinutes: offer.etaMinutes,
        distanceKm: offer.distanceKm,
        rating: mechanic.rating,
        priceLabel: `${offer.price} offer`,
        latitude: mechanic.latitude,
        longitude: mechanic.longitude,
        profilePhoto: mechanic.profilePhoto
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <Screen>
      <BackArrowButton onPress={handleBack} />
      <Text style={styles.title}>Nearby mechanic offers</Text>
      <Text style={styles.subtitle}>
        Your request is live. Compare price, ETA, and mechanic reputation before choosing who should come.
      </Text>

      <MapPreview
        title={`${offers.length} mechanics responded nearby`}
        subtitle={`Budget ${activeRequest.budget} from ${activeRequest.locationLabel}`}
        mechanics={nearbyOfferMechanics}
        driverLatitude={activeRequest.latitude}
        driverLongitude={activeRequest.longitude}
      />

      <SectionCard style={styles.summaryCard}>
        <Text style={styles.sectionTitle}>{activeRequest.issue}</Text>
        <Text style={styles.meta}>{activeRequest.vehicle}</Text>
        <Text style={styles.meta}>{activeRequest.locationLabel}</Text>
        <Text style={styles.meta}>Preferred budget: {activeRequest.budget}</Text>
      </SectionCard>

      {offers.map((offer) => {
        const mechanic = mechanics.find((item) => item.id === offer.mechanicId);

        if (!mechanic) {
          return null;
        }

        return (
          <OfferCard
            key={offer.id}
            mechanic={mechanic}
            offer={offer}
            onSelect={() => {
              selectOffer(offer.id);
              navigation.navigate("Tracking");
            }}
          />
        );
      })}

      <PrimaryButton label="Start Over" tone="secondary" onPress={resetRequest} style={styles.resetButton} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginTop: 16,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    color: palette.ink
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 18,
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkSoft
  },
  summaryCard: {
    marginTop: 18
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: palette.ink
  },
  meta: {
    marginTop: 8,
    fontSize: 14,
    color: palette.inkSoft
  },
  resetButton: {
    marginTop: 18
  }
});
