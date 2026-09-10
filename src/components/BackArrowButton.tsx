import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { palette } from "../theme/palette";

export function BackArrowButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.button}>
      <Ionicons name="arrow-back" size={22} color={palette.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: "flex-start",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3FAF5",
    borderWidth: 1,
    borderColor: palette.border,
    marginTop: 10
  }
});
