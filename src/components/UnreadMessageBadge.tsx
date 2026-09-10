import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function UnreadMessageBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.label}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  label: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF"
  }
});
