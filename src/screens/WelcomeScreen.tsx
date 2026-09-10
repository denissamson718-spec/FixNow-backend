import React, { useEffect, useRef } from "react";
import { Platform, ActivityIndicator, Animated, Easing, Image, StyleSheet, Text, View } from "react-native";

import { palette } from "../theme/palette";

export function WelcomeScreen({ onFinish }: { onFinish: () => void }) {
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.72)).current;
  const welcomeOpacity = useRef(new Animated.Value(0)).current;
  const welcomeOffset = useRef(new Animated.Value(18)).current;
  const letterOpacities = useRef("FixNow".split("").map(() => new Animated.Value(0))).current;
  const letterScales = useRef("FixNow".split("").map(() => new Animated.Value(0.55))).current;
  const lineScale = useRef(new Animated.Value(0)).current;
  const loadingOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(iconOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== "web"
        }),
        Animated.spring(iconScale, {
          toValue: 1,
          damping: 12,
          stiffness: 115,
          mass: 0.8,
          useNativeDriver: Platform.OS !== "web"
        })
      ]),
      Animated.parallel([
        Animated.timing(welcomeOpacity, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== "web"
        }),
        Animated.timing(welcomeOffset, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== "web"
        })
      ]),
      Animated.stagger(
        280,
        letterOpacities.map((opacity, index) =>
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 1,
              duration: 340,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: Platform.OS !== "web"
            }),
            Animated.spring(letterScales[index], {
              toValue: 1,
              damping: 11,
              stiffness: 105,
              mass: 0.7,
              useNativeDriver: Platform.OS !== "web"
            })
          ])
        )
      ),
      Animated.timing(lineScale, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web"
      }),
      Animated.timing(loadingOpacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.ease),
        useNativeDriver: Platform.OS !== "web"
      }),
      Animated.delay(1300),
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 360,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: Platform.OS !== "web"
      })
    ]);

    animation.start(({ finished }) => {
      if (finished) onFinish();
    });

    return () => animation.stop();
  }, [
    iconOpacity,
    iconScale,
    letterOpacities,
    letterScales,
    lineScale,
    loadingOpacity,
    onFinish,
    screenOpacity,
    welcomeOffset,
    welcomeOpacity
  ]);

  return (
    <Animated.View style={[styles.screen, { opacity: screenOpacity }]}>
      <View style={styles.content}>
        <Animated.View style={{ opacity: iconOpacity, transform: [{ scale: iconScale }] }}>
          <Image
            source={require("../../assets/fixnow-splash-icon.png")}
            style={styles.icon}
            resizeMode="contain"
          />
        </Animated.View>

        <View style={styles.titleRow}>
          <Animated.Text
            style={[
              styles.title,
              {
                opacity: welcomeOpacity,
                transform: [{ translateY: welcomeOffset }]
              }
            ]}
          >
            Welcome to
          </Animated.Text>
          <View style={styles.brandRow}>
            {"FixNow".split("").map((letter, index) => (
            <Animated.Text
              key={`${letter}-${index}`}
              style={[
                styles.title,
                styles.brand,
                {
                  opacity: letterOpacities[index],
                  transform: [{ scale: letterScales[index] }]
                }
              ]}
            >
              {letter}
            </Animated.Text>
            ))}
          </View>
        </View>

        <Animated.View style={[styles.line, { transform: [{ scaleX: lineScale }] }]} />
        <Animated.View style={[styles.loading, { opacity: loadingOpacity }]}>
          <ActivityIndicator size="small" color={palette.primaryDark} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  content: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 28
  },
  icon: {
    width: 190,
    height: 190
  },
  titleRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7
  },
  title: {
    fontSize: 27,
    lineHeight: 35,
    fontWeight: "800",
    color: palette.ink,
    textAlign: "center",
    letterSpacing: 0
  },
  brand: {
    color: palette.primaryDark,
    fontWeight: "900"
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  line: {
    width: 76,
    height: 4,
    marginTop: 18,
    borderRadius: 2,
    backgroundColor: palette.primary,
    transformOrigin: "center"
  },
  loading: {
    height: 28,
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center"
  }
});
