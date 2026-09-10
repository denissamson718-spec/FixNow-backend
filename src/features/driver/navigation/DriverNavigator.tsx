import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { ProfileScreen } from "../../../screens/ProfileScreen";
import { useAppContext } from "../../../state/AppContext";
import { palette } from "../../../theme/palette";
import { DriverHomeScreen } from "../screens/DriverHomeScreen";
import { NearbyMechanicsScreen } from "../screens/NearbyMechanicsScreen";
import { NearbyPlacesScreen } from "../screens/NearbyPlacesScreen";
import { OffersScreen } from "../screens/OffersScreen";
import { RequestScreen } from "../screens/RequestScreen";
import { RouteFinderScreen } from "../screens/RouteFinderScreen";
import { TrackingScreen } from "../screens/TrackingScreen";
import { DriverChatScreen } from "../screens/DriverChatScreen";
import { InAppCallScreen } from "../../../screens/InAppCallScreen";

type DriverStackParamList = {
  DriverTabs: undefined;
  Request: undefined;
  NearbyMechanics: undefined;
  Offers: undefined;
  RouteFinder: undefined;
  NearbyPlaces: undefined;
  Tracking: undefined;
  Chat: undefined;
  Call: { video?: boolean } | undefined;
};

type DriverTabParamList = {
  Home: undefined;
  Rescue: undefined;
  Profile: undefined;
};

const DriverStack = createNativeStackNavigator<DriverStackParamList>();
const DriverTab = createBottomTabNavigator<DriverTabParamList>();

function renderTabIcon(routeName: string, color: string, size: number) {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    Home: "home",
    Rescue: "car-sport",
    Profile: "person"
  };

  return <Ionicons name={icons[routeName]} size={size} color={color} />;
}

function sharedTabOptions(routeName: string) {
  return {
    headerShown: false,
    tabBarActiveTintColor: palette.primary,
    tabBarInactiveTintColor: palette.inkSoft,
    tabBarStyle: {
      display: "none" as const
    },
    tabBarIcon: ({ color, size }: { color: string; size: number }) => renderTabIcon(routeName, color, size)
  };
}

function DriverTabsNavigator() {
  const { activeRequest } = useAppContext();
  const homeScreen =
    activeRequest.status === "draft"
      ? RequestScreen
      : activeRequest.status === "reviewing" || activeRequest.status === "searching"
        ? NearbyMechanicsScreen
        : TrackingScreen;

  return (
    <DriverTab.Navigator screenOptions={({ route }) => sharedTabOptions(route.name)}>
      <DriverTab.Screen name="Home" component={homeScreen} options={{ title: "Home" }} />
      <DriverTab.Screen name="Rescue" component={DriverHomeScreen} options={{ title: "Rescue" }} />
      <DriverTab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
    </DriverTab.Navigator>
  );
}

export function DriverNavigator() {
  return (
    <DriverStack.Navigator screenOptions={{ headerShown: false }}>
      <DriverStack.Screen name="DriverTabs" component={DriverTabsNavigator} />
      <DriverStack.Screen name="Request" component={RequestScreen} />
      <DriverStack.Screen name="NearbyMechanics" component={NearbyMechanicsScreen} />
      <DriverStack.Screen name="Offers" component={OffersScreen} />
      <DriverStack.Screen name="RouteFinder" component={RouteFinderScreen} />
      <DriverStack.Screen name="NearbyPlaces" component={NearbyPlacesScreen} />
      <DriverStack.Screen name="Tracking" component={TrackingScreen} />
      <DriverStack.Screen name="Chat" component={DriverChatScreen} />
      <DriverStack.Screen name="Call" component={InAppCallScreen} />
    </DriverStack.Navigator>
  );
}
