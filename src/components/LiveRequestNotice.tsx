import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { palette } from "../theme/palette";

export function LiveRequestNotice({
  title,
  message,
  onDismiss
}: {
  title: string;
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Ionicons name="notifications" size={16} color="#FFFFFF" />
        </View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>Live request alert</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        {onDismiss ? (
          <Pressable onPress={onDismiss} hitSlop={10} style={({ pressed }) => [styles.dismiss, pressed && styles.dismissPressed]}>
            <Ionicons name="close" size={18} color={palette.inkSoft} />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 15,
    backgroundColor: "#ECF8F0",
    borderWidth: 1,
    borderColor: "#B9DEC7"
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary
  },
  copy: {
    flex: 1
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.primaryDark,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  title: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: "800",
    color: palette.ink
  },
  dismiss: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  dismissPressed: {
    opacity: 0.8
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSoft
  }
});
