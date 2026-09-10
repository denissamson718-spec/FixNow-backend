import React, { useEffect, useRef } from "react";
import { Platform, Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { Screen } from "../components/Screen";
import { palette } from "../theme/palette";

export function AuthScreen() {
  const navigation = useNavigation<any>();
  const { height, width } = useWindowDimensions();
  const carFloat = useRef(new Animated.Value(0)).current;
  const compactLayout = height < 760;
  const narrowLayout = width < 360;

  const heroStyle = {
    padding: compactLayout ? 20 : 24,
    borderRadius: compactLayout ? 24 : 28
  };

  const titleStyle = {
    fontSize: narrowLayout ? 28 : compactLayout ? 30 : 32,
    lineHeight: narrowLayout ? 34 : compactLayout ? 36 : 39
  };

  const subtitleStyle = {
    fontSize: narrowLayout ? 14 : 15,
    lineHeight: narrowLayout ? 20 : 22
  };

  const roleGroupStyle = {
    marginTop: compactLayout ? 18 : 22,
    gap: compactLayout ? 8 : 10
  };

  const roleCardStyle = {
    minHeight: compactLayout ? 66 : 78,
    paddingHorizontal: narrowLayout ? 12 : 16,
    paddingVertical: compactLayout ? 6 : 8,
    borderRadius: compactLayout ? 18 : 22
  };

  const iconBadgeStyle = {
    width: compactLayout ? 24 : 30,
    height: compactLayout ? 24 : 30,
    borderRadius: compactLayout ? 8 : 10,
    marginBottom: compactLayout ? 2 : 4
  };

  const iconSize = compactLayout ? 18 : 20;

  const roleTitleStyle = {
    fontSize: compactLayout ? 14 : 16
  };

  const loginCardStyle = {
    padding: compactLayout ? 16 : 18,
    borderRadius: compactLayout ? 18 : 22
  };

  const heroColors: [string, string] = narrowLayout ? ["#F2F8F4", "#D8EFDF"] : ["#F5FAF7", "#D4ECDC"];
  const roleCardColors: [string, string] = compactLayout ? ["#2F8F5B", "#176B43"] : ["#16A05D", "#176B43"];
  const loginColors: [string, string] = compactLayout ? ["#2F8F5B", "#176B43"] : ["#16A05D", "#176B43"];

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(carFloat, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web"
        }),
        Animated.timing(carFloat, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web"
        })
      ])
    );

    loop.start();

    return () => {
      loop.stop();
    };
  }, [carFloat]);

  const carAnimatedStyle = {
    transform: [
      {
        translateY: carFloat.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -6]
        })
      }
    ]
  };

  return (
    <Screen>
      <View style={[styles.hero, heroStyle]}>
        <Text style={[styles.title, titleStyle]}>Welcome to FixNow</Text>
        <View style={styles.brandIconWrap}>
          <Animated.View style={[styles.brandIconBadge, carAnimatedStyle]}>
            <Ionicons name="car-sport" size={32} color="#176B43" />
            <View style={styles.brandToolBadge}>
              <Ionicons name="construct" size={14} color="#FFFFFF" />
            </View>
          </Animated.View>
        </View>
      </View>

      <View style={[styles.roleGroup, roleGroupStyle]}>
        <Text style={styles.kicker}>FixNow</Text>
        <Pressable onPress={() => navigation.navigate("DriverSignup")} style={styles.roleCardShell}>
          <LinearGradient
            colors={roleCardColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.roleCard, roleCardStyle]}
          >
            <View style={[styles.iconBadge, iconBadgeStyle]}>
              <Ionicons name="car-sport-outline" size={iconSize} color="#176B43" />
            </View>
            <Text style={[styles.roleTitle, roleTitleStyle]}>Sign up as Driver</Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => navigation.navigate("MechanicSignup")} style={styles.roleCardShell}>
          <LinearGradient
            colors={roleCardColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.roleCard, roleCardStyle]}
          >
            <View style={[styles.iconBadge, styles.iconBadgeAccent, iconBadgeStyle]}>
              <Ionicons name="construct-outline" size={iconSize} color="#176B43" />
            </View>
            <Text style={[styles.roleTitle, roleTitleStyle]}>Sign up as Mechanic</Text>
          </LinearGradient>
        </Pressable>

        <Pressable onPress={() => navigation.navigate("Login")} style={styles.loginCardShell}>
          <LinearGradient
            colors={loginColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.loginCard, loginCardStyle]}
          >
            <View style={styles.loginCardTop}>
              <View style={styles.loginIconBadge}>
                <Ionicons name="person-circle-outline" size={22} color="#FFFFFF" />
              </View>
              <Text style={styles.loginTitle}>Login for existing account</Text>
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: 14
  },
  kicker: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#176B43"
  },
  title: {
    marginTop: 12,
    fontSize: 32,
    lineHeight: 39,
    fontWeight: "900",
    textAlign: "center",
    color: "#1F2933"
  },
  subtitle: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: "#52606D"
  },
  roleGroup: {
    marginTop: 22,
    gap: 10
  },
  brandIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10
  },
  brandIconBadge: {
    width: 74,
    height: 74,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F8F4",
    borderWidth: 1,
    borderColor: "#B9DEC7",
    position: "relative"
  },
  brandToolBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#176B43"
  },
  roleCardShell: {
    borderWidth: 1,
    borderColor: "#176B43",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#176B43",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3
  },
  roleCard: {
    alignItems: "center",
    justifyContent: "center"
  },
  iconBadge: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244, 248, 255, 0.95)",
    alignSelf: "center"
  },
  iconBadgeAccent: {
    backgroundColor: "rgba(255, 255, 255, 0.82)"
  },
  loginCard: {
    borderRadius: 22
  },
  loginCardShell: {
    borderWidth: 1,
    borderColor: "#176B43",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#176B43",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 2
  },
  loginCardTop: {
    flexDirection: "row",
    alignItems: "center"
  },
  loginIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)"
  },
  loginCopy: {
    flex: 1,
    marginLeft: 12
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFF7F8",
    textAlign: "center"
  },
  loginTitle: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF"
  }
});
