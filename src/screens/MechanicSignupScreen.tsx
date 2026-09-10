import React, { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import { BackArrowButton } from "../components/BackArrowButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { Screen } from "../components/Screen";
import { useAppContext } from "../state/AppContext";
import { palette } from "../theme/palette";
import { CredentialAsset, MechanicIdType, MechanicTransportMode } from "../types";
import { compressImageForUpload, isImageAsset } from "../utils/imageCompression";
import { getPasswordValidationMessage } from "../utils/passwordValidation";

const idOptions: MechanicIdType[] = ["NIDA", "Voter's ID", "Driver's License"];

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Failed to read document for web preview."));
    };

    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Could not convert document to a web preview format."));
    };

    reader.readAsDataURL(blob);
  });
}

async function toWebViewableAsset(asset?: CredentialAsset) {
  if (!asset?.uri) {
    return asset;
  }

  if (asset.uri.startsWith("data:")) {
    return {
      ...asset,
      webUri: asset.uri
    };
  }

  try {
    const response = await fetch(asset.uri);

    if (!response.ok) {
      throw new Error("Could not load the selected file from your device.");
    }

    const blob = await response.blob();
    const webUri = await blobToDataUrl(blob);

    return {
      ...asset,
      webUri
    };
  } catch (error) {
    throw new Error(`Could not prepare ${asset.fileName ?? "this file"} for admin review.`);
  }
}

export function MechanicSignupScreen() {
  const navigation = useNavigation<any>();
  const { signUp } = useAppContext();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [identificationType, setIdentificationType] = useState<MechanicIdType>("NIDA");
  const [identificationNumber, setIdentificationNumber] = useState("");
  const [identificationImage, setIdentificationImage] = useState<CredentialAsset | undefined>(undefined);
  const [certificateDocument, setCertificateDocument] = useState<CredentialAsset | undefined>(undefined);
  const [experienceYears, setExperienceYears] = useState("");
  const [transportMode] = useState<MechanicTransportMode>("car");
  const [workingGarage, setWorkingGarage] = useState("");
  const [garageLocation, setGarageLocation] = useState("");
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

  const pickCredentialImage = async (onSelect: (asset: CredentialAsset) => void) => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission required", "Allow photo library access so you can upload your document image.");
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
    const credentialAsset: CredentialAsset = {
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType
    };
    const compressedCredential = await compressImageForUpload(credentialAsset, {
      maxLongEdge: 1600,
      quality: 0.62
    });

    onSelect(compressedCredential);
  };

  const pickCertificateDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
      multiple: false
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const pickedAsset = result.assets[0];
    const certificateAsset: CredentialAsset = {
      uri: pickedAsset.uri,
      fileName: pickedAsset.name,
      mimeType: pickedAsset.mimeType
    };

    const preparedCertificate = isImageAsset(certificateAsset)
      ? await compressImageForUpload(certificateAsset, {
          maxLongEdge: 1800,
          quality: 0.65
        })
      : certificateAsset;

    setCertificateDocument(preparedCertificate);
  };

  const handleContinue = async () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      Alert.alert("Missing account details", "Please add your first name, last name, email address, and phone number.");
      return;
    }

    if (!experienceYears.trim()) {
      Alert.alert("Missing mechanic credentials", "Please add your job experience before continuing.");
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

    let identificationImageForWeb: CredentialAsset | undefined;
    let certificateDocumentForWeb: CredentialAsset | undefined;

    try {
      [identificationImageForWeb, certificateDocumentForWeb] = await Promise.all([
        toWebViewableAsset(identificationImage),
        toWebViewableAsset(certificateDocument)
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not prepare your credential files.";
      Alert.alert("Document upload failed", `${message} Please re-select your document and try again.`);
      return;
    }

    const result = await signUp(
      {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        profilePhoto
      },
      "mechanic",
      password.trim(),
      {
        identificationType,
        identificationNumber: identificationNumber.trim() || undefined,
        identificationImage: identificationImageForWeb,
        certificateDocument: certificateDocumentForWeb,
        experienceYears: experienceYears.trim(),
        transportMode,
        workingGarage: workingGarage.trim() || undefined,
        garageLocation: garageLocation.trim() || undefined
      }
    );

    if (!result.success) {
      Alert.alert("Account not created", result.message ?? "Please try again.");
      return;
    }

    Alert.alert("Signup request sent", result.message ?? "Your mechanic account is now waiting for admin approval.", [
      {
        text: "OK",
        onPress: () => navigation.navigate("PendingApproval")
      }
    ]);
  };

  return (
    <Screen>
      <BackArrowButton onPress={() => navigation.goBack()} />

      <LinearGradient colors={["#F2F8F4", "#D8EFDF"]} style={styles.hero}>
        <Text style={styles.kicker}>Mechanic signup</Text>
        <Text style={styles.title}>Create your mechanic account.</Text>
        <Text style={styles.subtitle}>Add your contact details and professional credentials so FixNow can verify your account.</Text>
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

        <View style={styles.credentialCard}>
          <Text style={styles.credentialTitle}>Mechanic credentials</Text>
          <Text style={styles.credentialText}>FixNow verifies professional mechanics before they can receive breakdown jobs.</Text>

          <Text style={styles.label}>Choose ID type</Text>
          <View style={styles.optionRow}>
            {idOptions.map((option) => (
              <Pressable
                key={option}
                onPress={() => setIdentificationType(option)}
                style={[styles.optionChip, identificationType === option && styles.optionChipActive]}
              >
                <Text style={[styles.optionLabel, identificationType === option && styles.optionLabelActive]}>{option}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>{identificationType} number (optional)</Text>
          <TextInput
            value={identificationNumber}
            onChangeText={setIdentificationNumber}
            placeholder={`Enter your ${identificationType.toLowerCase()} number`}
            placeholderTextColor={palette.inkSoft}
            style={styles.input}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>{identificationType} image</Text>
          <Pressable style={styles.uploadCard} onPress={() => pickCredentialImage(setIdentificationImage)}>
            {identificationImage ? (
              <>
                <Image source={{ uri: identificationImage.uri }} style={styles.previewImage} />
                <Text style={styles.uploadTitle}>Uploaded {identificationType}</Text>
                <Text style={styles.uploadMeta}>{identificationImage.fileName ?? "Document image selected"}</Text>
              </>
            ) : (
              <>
                <Text style={styles.uploadTitle}>Upload {identificationType} photo</Text>
                <Text style={styles.uploadMeta}>Optional. Tap to choose a clear image from your phone.</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.label}>Certificate image or PDF</Text>
          <Pressable style={styles.uploadCard} onPress={pickCertificateDocument}>
            {certificateDocument ? (
              <>
                {certificateDocument.mimeType?.startsWith("image/") ? (
                  <Image source={{ uri: certificateDocument.uri }} style={styles.previewImage} />
                ) : (
                  <View style={styles.documentBadge}>
                    <Text style={styles.documentBadgeText}>PDF</Text>
                  </View>
                )}
                <Text style={styles.uploadTitle}>Uploaded certificate file</Text>
                <Text style={styles.uploadMeta}>{certificateDocument.fileName ?? "Certificate file selected"}</Text>
              </>
            ) : (
              <>
                <Text style={styles.uploadTitle}>Upload certificate image or PDF</Text>
                <Text style={styles.uploadMeta}>Optional. Add your award or certificate as a photo or PDF file.</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.label}>Job experience</Text>
          <TextInput
            value={experienceYears}
            onChangeText={setExperienceYears}
            placeholder="5 years"
            placeholderTextColor={palette.inkSoft}
            style={styles.input}
          />

          <Text style={styles.label}>Working garage (optional)</Text>
          <TextInput
            value={workingGarage}
            onChangeText={setWorkingGarage}
            placeholder="Mikocheni Auto Garage"
            placeholderTextColor={palette.inkSoft}
            style={styles.input}
          />

          <Text style={styles.label}>Garage location (optional)</Text>
          <TextInput
            value={garageLocation}
            onChangeText={setGarageLocation}
            placeholder="Mikocheni, Dar es Salaam"
            placeholderTextColor={palette.inkSoft}
            style={styles.input}
          />
        </View>

        <PrimaryButton label="Create Mechanic Account" onPress={handleContinue} style={styles.button} />
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
  credentialCard: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#F3FAF5",
    borderWidth: 1,
    borderColor: palette.border
  },
  credentialTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: palette.ink
  },
  credentialText: {
    marginTop: 6,
    marginBottom: 14,
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSoft
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16
  },
  optionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface
  },
  optionChipActive: {
    borderColor: palette.primary,
    backgroundColor: "#E8F7EE"
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: palette.ink
  },
  optionLabelActive: {
    color: palette.primaryDark
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
  documentBadge: {
    width: "100%",
    minHeight: 110,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: "#EDF7F0",
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center"
  },
  documentBadgeText: {
    fontSize: 26,
    fontWeight: "800",
    color: palette.primaryDark
  },
  passwordHint: {
    marginTop: -4,
    fontSize: 13,
    lineHeight: 19,
    color: palette.inkSoft
  },
  button: {
    marginTop: 6
  }
});
