import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { InfoPill } from "../../../components/InfoPill";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { SectionCard } from "../../../components/SectionCard";
import { palette } from "../../../theme/palette";
import { Mechanic, MechanicOffer } from "../../../types";
import { getTransportLabel } from "../../../utils/transport";

export function OfferCard({
  mechanic,
  offer,
  onSelect
}: {
  mechanic: Mechanic;
  offer: MechanicOffer;
  onSelect: () => void;
}) {
  return (
    <SectionCard style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{mechanic.name}</Text>
          <Text style={styles.specialty}>{mechanic.specialty}</Text>
        </View>
        <InfoPill label={`${offer.price} offer`} />
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>{offer.etaMinutes} min away</Text>
        <Text style={styles.meta}>{offer.distanceKm} km</Text>
        {offer.transportType ? <Text style={styles.meta}>By {getTransportLabel(offer.transportType)}</Text> : null}
        <Text style={styles.meta}>Rated {mechanic.rating.toFixed(1)}/5</Text>
      </View>

      <Text style={styles.message}>{offer.message}</Text>
      {offer.surcharge ? <Text style={styles.feeNote}>Includes 6% system charge.</Text> : null}
      <PrimaryButton label="Choose This Mechanic" onPress={onSelect} style={styles.button} />
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center"
  },
  name: {
    fontSize: 18,
    fontWeight: "800",
    color: palette.ink
  },
  specialty: {
    marginTop: 4,
    fontSize: 14,
    color: palette.inkSoft
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14
  },
  meta: {
    fontSize: 13,
    color: palette.inkSoft
  },
  message: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 20,
    color: palette.ink
  },
  feeNote: {
    marginTop: 10,
    fontSize: 13,
    color: palette.primaryDark,
    fontWeight: "600"
  },
  button: {
    marginTop: 16
  }
});
