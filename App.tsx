import "react-native-gesture-handler";
import React, { useState } from "react";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppNavigator } from "./src/navigation/AppNavigator";
import { WelcomeScreen } from "./src/screens/WelcomeScreen";
import { AppProvider } from "./src/state/AppContext";
import { palette } from "./src/theme/palette";

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.canvas,
    card: palette.surface,
    text: palette.ink,
    primary: palette.primary,
    border: "transparent"
  }
};

// Icon fonts need a glyph they actually contain for browser load verification.
const iconFonts = Object.fromEntries(
  [Ionicons, MaterialCommunityIcons].flatMap((icons) =>
    Object.entries(icons.font).map(([family, uri]) => [
      family,
      Platform.OS === "web"
        ? { uri, testString: String.fromCodePoint(Number(Object.values(icons.glyphMap)[0])) }
        : uri
    ])
  )
);

export default function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [fontsLoaded, fontError] = useFonts(iconFonts);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {fontError ? (
          <Text>Unable to load app icons. Check your connection and reload the page.</Text>
        ) : (
          <ActivityIndicator accessibilityLabel="Loading app" />
        )}
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="dark" />
          {showWelcome ? <WelcomeScreen onFinish={() => setShowWelcome(false)} /> : <AppNavigator />}
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}
