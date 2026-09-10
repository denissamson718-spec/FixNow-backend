import React, { useEffect, useRef } from "react";
import { Platform, Animated, StyleSheet, Text, View } from "react-native";

export function OnlineStatusPill({ label, compact = false }: { label: string; compact?: boolean }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 850, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(pulse, { toValue: 0, duration: 850, useNativeDriver: Platform.OS !== "web" })
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={[styles.pill, compact && styles.pillCompact]}>
      <Animated.View
        style={[
          styles.dot,
          compact && styles.dotCompact,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.25] }) }]
          }
        ]}
      />
      <Text style={[styles.label, compact && styles.labelCompact]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 2,
    paddingVertical: 4
  },
  pillCompact: {
    gap: 5,
    paddingHorizontal: 1,
    paddingVertical: 2
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16A05D",
    borderWidth: 0
  },
  dotCompact: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 0
  },
  label: {
    fontSize: 13,
    fontWeight: "900",
    color: "#176B43"
  },
  labelCompact: {
    fontSize: 11
  }
});
