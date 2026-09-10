import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { useAppContext } from "../state/AppContext";
import { palette } from "../theme/palette";

export function InAppCallScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { activeRequest, role } = useAppContext();
  const isVideoCall = route.params?.video === true;
  const room = encodeURIComponent(activeRequest.videoRoomId ?? "");
  const callUrl = `https://meet.jit.si/${room}#config.startWithVideoMuted=${isVideoCall ? "false" : "true"}&config.prejoinPageEnabled=false`;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="End call" onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{isVideoCall ? "Video call" : "Voice call"}</Text>
          <Text style={styles.subtitle}>{role === "mechanic" ? "Driver" : "Mechanic"}</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name={isVideoCall ? "videocam" : "call"} size={21} color="#FFFFFF" />
        </View>
      </View>
      {room ? (
        Platform.OS === "web" ? (
          <View style={styles.webView}>
            {React.createElement("iframe", {
              src: callUrl,
              title: isVideoCall ? "FixNow video call" : "FixNow voice call",
              allow: "camera; microphone; fullscreen; display-capture; autoplay",
              allowFullScreen: true,
              style: {
                width: "100%",
                height: "100%",
                border: 0,
                backgroundColor: "#111827"
              }
            })}
          </View>
        ) : (
          <WebView
            source={{ uri: callUrl }}
            style={styles.webView}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            setSupportMultipleWindows={false}
            startInLoadingState
          />
        )
      ) : (
        <View style={styles.unavailable}>
          <Ionicons name="alert-circle-outline" size={42} color={palette.inkSoft} />
          <Text style={styles.unavailableTitle}>Call room unavailable</Text>
          <Text style={styles.unavailableText}>Submit a new roadside request, then open the call again.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111827" },
  header: { height: 64, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#111827" },
  closeButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#374151" },
  headerCopy: { flex: 1 },
  title: { fontSize: 17, fontWeight: "800", color: "#FFFFFF" },
  subtitle: { marginTop: 2, fontSize: 12, color: "#D1D5DB" },
  headerIcon: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: palette.success },
  webView: { flex: 1, backgroundColor: "#111827" },
  unavailable: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  unavailableTitle: { marginTop: 14, fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  unavailableText: { marginTop: 7, maxWidth: 280, textAlign: "center", fontSize: 14, lineHeight: 20, color: "#D1D5DB" }
});
