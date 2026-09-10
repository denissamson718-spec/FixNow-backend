import React from "react";
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";

import { palette } from "../theme/palette";

export function PrimaryButton({
  label,
  onPress,
  tone = "primary",
  style,
  disabled = false
}: {
  label: string;
  onPress: () => void;
  tone?: "primary" | "secondary";
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        tone === "secondary" ? styles.secondary : styles.primary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style
      ]}
    >
      <Text style={[styles.label, tone === "secondary" && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20
  },
  primary: {
    backgroundColor: palette.primary
  },
  secondary: {
    backgroundColor: palette.accentSoft
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }]
  },
  disabled: {
    opacity: 0.6
  },
  label: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700"
  },
  secondaryLabel: {
    color: palette.accent
  }
});
