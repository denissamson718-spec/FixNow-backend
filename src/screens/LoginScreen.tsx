import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

import { BackArrowButton } from "../components/BackArrowButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useAppContext } from "../state/AppContext";
import { palette } from "../theme/palette";

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login } = useAppContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    if (isSubmitting) {
      return;
    }

    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing login details", "Please enter the email and password you used to create your account.");
      return;
    }

    setIsSubmitting(true);
    const result = await login(email.trim(), password.trim());
    setIsSubmitting(false);

    if (!result.success) {
      Alert.alert("Login failed", result.message ?? "Please try again.");
    }
  };

  return (
    <Screen>
      <BackArrowButton onPress={() => navigation.goBack()} />

      <LinearGradient colors={["#F2F8F4", "#D8EFDF"]} style={styles.hero}>
        <Text style={styles.kicker}>FixNow login</Text>
        <Text style={styles.title}>Log in with your account details.</Text>
        <Text style={styles.subtitle}>
          Use the same email and password from signup. FixNow will detect whether the account belongs to a driver or a mechanic.
        </Text>
      </LinearGradient>

      <View style={styles.form}>
        <Text style={styles.label}>Email address</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={palette.inkSoft}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Enter your password"
          placeholderTextColor={palette.inkSoft}
          style={styles.input}
          secureTextEntry
          autoCapitalize="none"
        />

        <Pressable onPress={() => navigation.navigate("ForgotPassword")} style={styles.forgotWrap}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>

        <PrimaryButton
          label={isSubmitting ? "Logging In..." : "Log In"}
          onPress={handleLogin}
          style={styles.button}
          disabled={isSubmitting}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: 14,
    borderRadius: 28,
    padding: 24
  },
  kicker: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: palette.primaryDark
  },
  title: {
    marginTop: 12,
    fontSize: 32,
    lineHeight: 39,
    fontWeight: "800",
    color: palette.ink
  },
  subtitle: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: palette.inkSoft
  },
  form: {
    marginTop: 22
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "700",
    color: palette.ink
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 15,
    marginBottom: 16,
    fontSize: 15,
    color: palette.ink
  },
  button: {
    marginTop: 6
  },
  forgotWrap: {
    alignSelf: "flex-end",
    marginTop: -4,
    marginBottom: 10
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.primaryDark
  }
});
