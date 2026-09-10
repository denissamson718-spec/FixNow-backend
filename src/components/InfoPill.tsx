import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { palette } from "../theme/palette";

export function InfoPill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: palette.surfaceMuted,
    alignSelf: "flex-start"
  },
  label: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "600"
  }
});
