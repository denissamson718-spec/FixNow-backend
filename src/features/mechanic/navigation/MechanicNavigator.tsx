import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { ProfileScreen } from "../../../screens/ProfileScreen";
import { palette } from "../../../theme/palette";
import { MechanicDashboardScreen } from "../screens/MechanicDashboardScreen";
import { MechanicJobsScreen } from "../screens/MechanicJobsScreen";
import { MechanicChatScreen } from "../screens/MechanicChatScreen";
import { InAppCallScreen } from "../../../screens/InAppCallScreen";

type MechanicTabParamList = {
  Dashboard: undefined;
  Jobs: undefined;
  Profile: undefined;
  Chat: undefined;
  Call: { video?: boolean } | undefined;
};

const MechanicTab = createBottomTabNavigator<MechanicTabParamList>();

function renderTabIcon(routeName: string, color: string, size: number) {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    Dashboard: "grid",
    Jobs: "build",
    Profile: "person"
  };

  return <Ionicons name={icons[routeName]} size={size} color={color} />;
}

function sharedTabOptions(routeName: string) {
  return {
    headerShown: false,
    tabBarActiveTintColor: palette.primary,
    tabBarInactiveTintColor: palette.inkSoft,
    tabBarStyle: { display: "none" as const },
    tabBarIcon: ({ color, size }: { color: string; size: number }) => renderTabIcon(routeName, color, size)
  };
}

export function MechanicNavigator() {
  return (
    <MechanicTab.Navigator initialRouteName="Jobs" screenOptions={({ route }) => sharedTabOptions(route.name)}>
      <MechanicTab.Screen
        name="Dashboard"
        component={MechanicDashboardScreen}
        options={{
          title: "Dashboard"
        }}
      />
      <MechanicTab.Screen name="Jobs" component={MechanicJobsScreen} options={{ title: "Jobs" }} />
      <MechanicTab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
      <MechanicTab.Screen name="Chat" component={MechanicChatScreen} options={{ title: "Chat" }} />
      <MechanicTab.Screen name="Call" component={InAppCallScreen} options={{ title: "Call" }} />
    </MechanicTab.Navigator>
  );
}
