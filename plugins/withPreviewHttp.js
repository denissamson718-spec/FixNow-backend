const { withAndroidManifest } = require("expo/config-plugins");

// Personal APK builds can reach the development backend on the same Wi-Fi.
module.exports = function withPreviewHttp(config) {
  return withAndroidManifest(config, (config) => {
    if (process.env.EAS_BUILD_PROFILE === "preview" && process.env.EXPO_PUBLIC_BACKEND_URL?.startsWith("http://")) {
      const app = config.modResults.manifest.application?.[0];
      if (app) app.$["android:usesCleartextTraffic"] = "true";
    }
    return config;
  });
};
