import React, { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";

import { BackArrowButton } from "../components/BackArrowButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useAppContext } from "../state/AppContext";
import { palette } from "../theme/palette";
import { CredentialAsset } from "../types";
import { compressImageForUpload } from "../utils/imageCompression";
import { getPasswordValidationMessage } from "../utils/passwordValidation";

export function DriverSignupScreen() {
  const navigation = useNavigation<any>();
  const { signUp } = useAppContext();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<CredentialAsset | undefined>(undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const pickProfilePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required", "Allow photo library access so you can upload your profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const asset = result.assets[0];
    const profileAsset: CredentialAsset = {
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType
    };
    const compressedProfile = await compressImageForUpload(profileAsset, {
      maxLongEdge: 1280,
      quality: 0.6
    });

    setProfilePhoto(compressedProfile);
  };

  const handleContinue = async () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      Alert.alert("Missing account details", "Please add your first name, last name, email address, and phone number.");
      return;
    }

    const passwordMessage = getPasswordValidationMessage({
      password,
      confirmPassword,
      fullName,
      email
    });

    if (passwordMessage) {
      Alert.alert("Password requirements", passwordMessage);
      return;
    }

    const result = await signUp(
      {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        profilePhoto
      },
      "driver",
      password.trim()
    );

    if (!result.success) {
      Alert.alert("Account not created", result.message ?? "Please try again.");
      return;
    }

    // AppNavigator switches to the driver flow automatically once signup succeeds.
  };

  return (
    <Screen>
      <BackArrowButton onPress={() => navigation.goBack()} />

      <LinearGradient colors={["#F2F8F4", "#D8EFDF"]} style={styles.hero}>
        <Text style={styles.kicker}>Driver signup</Text>
        <Text style={styles.title}>Create your driver account.</Text>
        <Text style={styles.subtitle}>Add your contact details so you can request nearby mechanics any time you need help.</Text>
      </LinearGradient>

      <View style={styles.form}>
        <Text style={styles.label}>First name</Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Enter your first name"
          placeholderTextColor={palette.inkSoft}
          style={styles.input}
        />

        <Text style={styles.label}>Last name</Text>
        <TextInput
          value={lastName}
          onChangeText={setLastName}
          placeholder="Enter your last name"
          placeholderTextColor={palette.inkSoft}
          style={styles.input}
        />

        <Text style={styles.label}>Phone number</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+255 7XX XXX XXX"
          placeholderTextColor={palette.inkSoft}
          style={styles.input}
          keyboardType="phone-pad"
        />

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
        <View style={styles.passwordWrap}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Create a strong password"
            placeholderTextColor={palette.inkSoft}
            style={styles.passwordInput}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <Pressable onPress={() => setShowPassword((current) => !current)} style={styles.eyeButton}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={palette.inkSoft} />
          </Pressable>
        </View>

        <Text style={styles.label}>Confirm password</Text>
        <View style={styles.passwordWrap}>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter your password"
            placeholderTextColor={palette.inkSoft}
            style={styles.passwordInput}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
          />
          <Pressable onPress={() => setShowConfirmPassword((current) => !current)} style={styles.eyeButton}>
            <Ionicons
              name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={palette.inkSoft}
            />
          </Pressable>
        </View>

        <Text style={styles.passwordHint}>
          Use at least 10 characters with uppercase, lowercase, a number, and a special character.
        </Text>

        <Text style={styles.label}>Profile photo (optional)</Text>
        <Pressable style={styles.uploadCard} onPress={pickProfilePhoto}>
          {profilePhoto ? (
            <>
              <Image source={{ uri: profilePhoto.uri }} style={styles.previewImage} />
              <Text style={styles.uploadTitle}>Profile photo selected</Text>
              <Text style={styles.uploadMeta}>{profilePhoto.fileName ?? "Image selected"}</Text>
            </>
          ) : (
            <>
              <Text style={styles.uploadTitle}>Upload profile photo</Text>
              <Text style={styles.uploadMeta}>Optional. Add a clear photo up to 5 MB.</Text>
            </>
          )}
        </Pressable>

        <PrimaryButton label="Create Driver Account" onPress={handleContinue} style={styles.button} />
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
  passwordWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    borderRadius: 16,
    marginBottom: 16,
    paddingLeft: 14
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 15,
    color: palette.ink
  },
  eyeButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center"
  },
  uploadCard: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: palette.primary,
    backgroundColor: "#FFFFFF"
  },
  previewImage: {
    width: "100%",
    height: 148,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: "#E7F1EA"
  },
  uploadTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: palette.ink
  },
  uploadMeta: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: palette.inkSoft
  },
  passwordHint: {
    marginTop: -4,
    marginBottom: 8,
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSoft
  },
  button: {
    marginTop: 6
  }
});
