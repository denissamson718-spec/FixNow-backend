import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthScreen } from "../screens/AuthScreen";
import { DriverSignupScreen } from "../screens/DriverSignupScreen";
import { ForgotPasswordScreen } from "../screens/ForgotPasswordScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { MechanicSignupScreen } from "../screens/MechanicSignupScreen";
import { PendingApprovalScreen } from "../screens/PendingApprovalScreen";
import { DriverNavigator } from "../features/driver/navigation/DriverNavigator";
import { MechanicNavigator } from "../features/mechanic/navigation/MechanicNavigator";
import { useAppContext } from "../state/AppContext";

type RootStackParamList = {
  Auth: undefined;
  DriverSignup: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  MechanicSignup: undefined;
  PendingApproval: undefined;
  DriverApp: undefined;
  MechanicApp: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { isAuthenticated, pendingApprovalAccount, role } = useAppContext();

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated && pendingApprovalAccount ? (
        <RootStack.Screen name="PendingApproval" component={PendingApprovalScreen} />
      ) : !isAuthenticated ? (
        <>
          <RootStack.Screen name="Auth" component={AuthScreen} />
          <RootStack.Screen name="DriverSignup" component={DriverSignupScreen} />
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <RootStack.Screen name="MechanicSignup" component={MechanicSignupScreen} />
          <RootStack.Screen name="PendingApproval" component={PendingApprovalScreen} />
        </>
      ) : role === "driver" ? (
        <RootStack.Screen name="DriverApp" component={DriverNavigator} />
      ) : (
        <RootStack.Screen name="MechanicApp" component={MechanicNavigator} />
      )}
    </RootStack.Navigator>
  );
}
