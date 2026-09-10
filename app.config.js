module.exports = {
  name: "FixNow",
  slug: "fixnow",
  owner: "denissamson718",
  version: "1.0.0",
  icon: "./assets/fixnow-splash.png",
  orientation: "portrait",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/fixnow-splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#FFFFFF"
  },
  assetBundlePatterns: ["**/*"],
  ios: {
    supportsTablet: true,
    infoPlist: {
      NSCameraUsageDescription: "FixNow uses your camera for driver and mechanic video calls.",
      NSMicrophoneUsageDescription: "FixNow uses your microphone for driver and mechanic calls."
    }
  },
  android: {
    package: "com.fixnow.app",
    versionCode: 2,
    adaptiveIcon: {
      foregroundImage: "./assets/fixnow-splash.png",
      backgroundColor: "#176B43"
    },
    permissions: ["POST_NOTIFICATIONS", "ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION", "CAMERA", "RECORD_AUDIO"]
  },
  plugins: [
    "./plugins/withPreviewHttp",
    "expo-font",
    "expo-status-bar",
    [
      "expo-splash-screen",
      {
        image: "./assets/fixnow-splash-icon.png",
        imageWidth: 260,
        resizeMode: "contain",
        backgroundColor: "#FFFFFF"
      }
    ],
    "expo-location",
    "expo-document-picker",
    [
      "expo-notifications",
      {
        icon: "./assets/fixnow-icon-foreground.png",
        color: "#176B43"
      }
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "FixNow uses your photos so mechanics can upload ID and certificate images for verification."
      }
    ]
  ],
  extra: {
    eas: { projectId: "3b0ffe1f-3880-4fe1-854e-9eacccebc560" },
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL?.trim() || undefined
  }
};
