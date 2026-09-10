import React, { useState } from "react";
import { Alert, Linking, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

import { BackArrowButton } from "../components/BackArrowButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { requestPasswordReset } from "../services/backend";
import { palette } from "../theme/palette";

export function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    const targetEmail = email.trim();

    if (!targetEmail) {
      Alert.alert("Missing email", "Please enter your email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset(targetEmail);

      if (!result.success) {
        Alert.alert("Reset failed", result.message ?? "Could not start password reset.");
        return;
      }

      if (result.resetLink) {
        Alert.alert(
          "Reset link sent",
          result.message ?? "Reset link created. Open it to choose a new password.",
          [
            {
              text: "Open Link",
              onPress: () => {
                void Linking.openURL(result.resetLink!);
              }
            },
            {
              text: "OK",
              style: "cancel",
              onPress: () => navigation.goBack()
            }
          ]
        );
        return;
      }

      Alert.alert("Reset link sent", result.message ?? "Check your email for the reset link.", [
        {
          text: "OK",
          onPress: () => navigation.goBack()
        }
      ]);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Reset failed", error.message);
        return;
      }

      Alert.alert("Reset failed", "Could not start password reset. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <BackArrowButton onPress={() => navigation.goBack()} />

      <LinearGradient colors={["#F2F8F4", "#D8EFDF"]} style={styles.hero}>
        <Text style={styles.kicker}>Password recovery</Text>
        <Text style={styles.title}>Forgot password?</Text>
        <Text style={styles.subtitle}>
          Enter your email. If it exists, we send a reset link with a token so you can set a new password.
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

        <PrimaryButton
          label={isSubmitting ? "Submitting..." : "Submit"}
          onPress={handleSubmit}
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
  }
});
