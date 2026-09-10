# Build an APK for your Android phone

1. Create an account at https://expo.dev/signup.
2. Open a terminal in this FixNow folder and run `npx eas-cli@latest login`. Enter your account details in the terminal.
3. Run `npx eas-cli@latest init` to create/link the Expo project. This project uses `app.config.js`; if EAS asks you to add `extra.eas.projectId`, add the ID it provides inside the existing `extra` object.
4. For a hosted backend, remove the local URL override from `build.preview.env` in `eas.json`, then configure `EXPO_PUBLIC_BACKEND_URL` in the Expo project’s **preview** environment. Use your backend’s reachable HTTPS URL. You can run `npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_BACKEND_URL --visibility plaintext` and enter the URL when prompted. This public URL is included in the app; it must not contain passwords.
5. Run `npx eas-cli@latest build --platform android --profile preview`. Allow Expo to generate an Android signing key when prompted. If EAS reports no Git repository, use `EAS_NO_VCS=1 npx eas-cli@latest build --platform android --profile preview` instead.
6. When the build finishes, open its download link on your Android phone. Download the APK, open it, and allow installation from that browser if Android asks.

The preview APK runs without Expo Go or the development server. Online features still require the backend. The preview profile includes the current local backend address. The preview-only Android configuration allows HTTP for this backend. Keep the phone on the same Wi-Fi network with the backend computer running; use hosted HTTPS for an app that works away from your computer. Update the preview profile’s EXPO_PUBLIC_BACKEND_URL in eas.json if the backend address changes.

Build configuration: `eas.json`. Android application ID: `com.fixnow.app`. Keep this ID and the same signing key for future updates.

Expo APK instructions: https://docs.expo.dev/build-reference/apk/
