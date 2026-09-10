import React, { useEffect, useMemo, useRef } from "react";
import { Platform, Animated, Image, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { palette } from "../theme/palette";

export function HighlightedLocationMarker({
  accentColor = palette.primary,
  badgeLabel = "You",
  fallbackLabel,
  iconName = "navigate",
  iconOnly = false,
  materialIconName,
  profilePhotoUri
}: {
  accentColor?: string;
  badgeLabel?: string;
  fallbackLabel: string;
  iconName?: React.ComponentProps<typeof Ionicons>["name"];
  iconOnly?: boolean;
  materialIconName?: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  profilePhotoUri?: string;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          useNativeDriver: Platform.OS !== "web"
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: Platform.OS !== "web"
        })
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [pulse]);

  const initials = useMemo(
    () =>
      fallbackLabel
        .split(" ")
        .map((part) => part[0]?.toUpperCase())
        .join("")
        .slice(0, 2) || "YO",
    [fallbackLabel]
  );

  if (iconOnly) {
    return (
      <View collapsable={false} renderToHardwareTextureAndroid style={styles.iconOnlyWrap}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>
        <View style={styles.mapIconCanvas}>
          {materialIconName ? (
            <MaterialCommunityIcons name={materialIconName} size={40} color={accentColor} />
          ) : (
            <Ionicons name={iconName} size={36} color={accentColor} />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={[
          styles.pulse,
          {
            backgroundColor: accentColor,
            opacity: pulse.interpolate({
              inputRange: [0, 1],
              outputRange: [0.22, 0]
            }),
            transform: [
              {
                scale: pulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.9]
                })
              }
            ]
          }
        ]}
      />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badgeLabel}</Text>
      </View>
      <View style={[styles.avatarShell, { borderColor: accentColor }]}>
        {profilePhotoUri ? (
          <Image source={{ uri: profilePhotoUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: accentColor }]}>
            {initials ? (
              <Text style={styles.avatarFallbackText}>{initials}</Text>
            ) : (
              <Ionicons name={iconName} size={16} color="#FFFFFF" />
            )}
          </View>
        )}
      </View>
      <View style={[styles.stem, { backgroundColor: accentColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconOnlyWrap: {
    width: 104,
    height: 98,
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "visible"
  },
  mapIconCanvas: {
    width: 58,
    height: 54,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(15,23,42,0.12)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    elevation: 6
  },
  wrap: {
    alignItems: "center",
    justifyContent: "center"
  },
  pulse: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    top: 24
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(16, 24, 40, 0.92)",
    marginBottom: 6,
    zIndex: 20,
    elevation: 10
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  avatarShell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4
    },
    elevation: 5
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14
  },
  avatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarFallbackText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF"
  },
  stem: {
    width: 5,
    height: 18,
    borderRadius: 999,
    marginTop: -2
  }
});
