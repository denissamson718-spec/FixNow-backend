import React, { useEffect, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";

import { Screen } from "../../../components/Screen";
import { useAppContext } from "../../../state/AppContext";
import { palette } from "../../../theme/palette";

export function DriverChatScreen() {
  const navigation = useNavigation<any>();
  const { activeRequest, markJobMessagesRead, mechanics, registeredAccounts, sendJobMessage } = useAppContext();
  const mechanic = mechanics.find((item) => item.id === activeRequest.assignedMechanicId);
  const [messageDraft, setMessageDraft] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);

  useEffect(() => {
    markJobMessagesRead();
  }, [activeRequest.messages, markJobMessagesRead]);

  const handleCall = () => navigation.navigate("Call", { video: false });

  const handleVideoCall = () => navigation.navigate("Call", { video: true });

  const handlePickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Allow photo access to send a diagnosis image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 0.6, base64: true });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setPhotoUri(asset.base64 ? `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}` : asset.uri);
    }
  };

  const handleSend = () => {
    if (!messageDraft.trim() && !photoUri) return;
    sendJobMessage(messageDraft, photoUri);
    setMessageDraft("");
    setPhotoUri(undefined);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Close chat" onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="close" size={24} color={palette.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.title}>{mechanic?.name || "Mechanic"}</Text>
          <Text numberOfLines={1} style={styles.subtitle}>{activeRequest.vehicle || activeRequest.issue || "Active job"}</Text>
        </View>
        <Pressable accessibilityLabel="Video call mechanic" onPress={handleVideoCall} style={styles.videoButton}>
          <Ionicons name="videocam" size={20} color={palette.primaryDark} />
        </Pressable>
        <Pressable accessibilityLabel="Call mechanic" onPress={handleCall} style={styles.callButton}>
          <Ionicons name="call" size={19} color="#FFFFFF" />
        </Pressable>
      </View>
      <View style={styles.thread}>
        {(activeRequest.messages ?? []).length ? (activeRequest.messages ?? []).map((message) => (
          <View key={message.id} style={[styles.bubble, message.senderRole === "driver" && styles.bubbleMine]}>
            <Text style={styles.sender}>{message.senderRole === "driver" ? "You" : message.senderName}</Text>
            {message.photoUri ? <Image source={{ uri: message.photoUri }} style={styles.messagePhoto} /> : null}
            {message.text ? <Text style={styles.messageText}>{message.text}</Text> : null}
          </View>
        )) : (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={34} color={palette.inkSoft} />
            <Text style={styles.emptyText}>No messages yet</Text>
          </View>
        )}
      </View>
      {photoUri ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: photoUri }} style={styles.preview} />
          <Pressable accessibilityLabel="Remove photo" onPress={() => setPhotoUri(undefined)} style={styles.removeButton}>
            <Ionicons name="close" size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.composer}>
        <Pressable accessibilityLabel="Attach diagnosis photo" onPress={handlePickPhoto} style={styles.iconButton}>
          <Ionicons name="camera" size={21} color={palette.primaryDark} />
        </Pressable>
        <TextInput value={messageDraft} onChangeText={setMessageDraft} style={styles.input} placeholder="Message mechanic" placeholderTextColor={palette.inkSoft} multiline />
        <Pressable accessibilityLabel="Send message" onPress={handleSend} style={styles.sendButton}>
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: palette.border },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { fontSize: 18, fontWeight: "800", color: palette.ink },
  subtitle: { marginTop: 3, fontSize: 12, color: palette.inkSoft },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border },
  callButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: palette.success },
  videoButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#E8F7EE", borderWidth: 1, borderColor: palette.border },
  thread: { flex: 1, minHeight: 360, paddingVertical: 14, gap: 9 },
  bubble: { alignSelf: "flex-start", maxWidth: "86%", padding: 11, borderRadius: 14, backgroundColor: palette.accentSoft },
  bubbleMine: { alignSelf: "flex-end", backgroundColor: "#E8F7EE" },
  sender: { fontSize: 10, fontWeight: "800", color: palette.primaryDark },
  messageText: { marginTop: 4, fontSize: 14, lineHeight: 20, color: palette.ink },
  messagePhoto: { width: 220, maxWidth: "100%", aspectRatio: 4 / 3, marginTop: 7, borderRadius: 10 },
  emptyState: { flex: 1, minHeight: 300, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyText: { fontSize: 14, fontWeight: "700", color: palette.inkSoft },
  previewWrap: { width: 100, height: 78, marginBottom: 10 },
  preview: { width: 100, height: 78, borderRadius: 10 },
  removeButton: { position: "absolute", top: 4, right: 4, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,0.78)" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: palette.border },
  input: { flex: 1, minHeight: 42, maxHeight: 96, borderWidth: 1, borderColor: palette.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, color: palette.ink, backgroundColor: palette.surface },
  sendButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: palette.primary }
});
