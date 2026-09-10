import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppContext } from "../../../state/AppContext";
import { palette } from "../../../theme/palette";

const menuItems = [
  { label: "Dashboard", route: "Dashboard", icon: "grid-outline" },
  { label: "Jobs", route: "Jobs", icon: "build-outline" },
  { label: "Profile", route: "Profile", icon: "person-outline" }
] as const;

export function MechanicSideMenu() {
  const navigation = useNavigation<any>();
  const { currentMechanic, userName } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);

  const openRoute = (route: string) => {
    setIsOpen(false);
    navigation.navigate(route);
  };

  return (
    <>
      <Pressable
        accessibilityLabel="Open mechanic menu"
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}
      >
        <Ionicons name="menu" size={27} color={palette.ink} />
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)} />
          <SafeAreaView style={styles.drawer} edges={["top", "bottom"]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open mechanic profile"
              onPress={() => openRoute("Profile")}
              style={({ pressed }) => [styles.profileRow, pressed && styles.profileRowPressed]}
            >
              <View style={styles.avatarFallback}>
                <Ionicons name="construct" size={26} color="#FFFFFF" />
              </View>
              <View style={styles.profileCopy}>
                <Text numberOfLines={1} style={styles.name}>{currentMechanic?.name || userName || "Mechanic"}</Text>
                <Text numberOfLines={1} style={styles.specialty}>{currentMechanic?.specialty ?? "Roadside support"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={21} color={palette.inkSoft} />
            </Pressable>

            <View style={styles.divider} />

            {menuItems.map((item) => (
              <Pressable
                key={item.route}
                onPress={() => openRoute(item.route)}
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              >
                <Ionicons name={item.icon} size={23} color={palette.inkSoft} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </Pressable>
            ))}

            <View style={styles.menuInfo}>
              <Ionicons name="shield-checkmark-outline" size={20} color={palette.success} />
              <Text style={styles.menuInfoText}>Dashboard, live jobs, and your mechanic profile are available from this menu.</Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  pressed: {
    opacity: 0.85
  },
  modalRoot: {
    flex: 1,
    flexDirection: "row"
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15,23,42,0.42)"
  },
  drawer: {
    width: "82%",
    maxWidth: 360,
    height: "100%",
    paddingHorizontal: 20,
    backgroundColor: palette.surface
  },
  profileRow: {
    minHeight: 108,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  avatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary
  },
  profileRowPressed: {
    opacity: 0.72
  },
  profileCopy: {
    flex: 1
  },
  name: {
    fontSize: 20,
    fontWeight: "800",
    color: palette.ink
  },
  specialty: {
    marginTop: 3,
    fontSize: 13,
    color: palette.inkSoft
  },
  divider: {
    height: 1,
    marginHorizontal: -20,
    marginBottom: 10,
    backgroundColor: palette.border
  },
  menuItem: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 16,
    paddingHorizontal: 12
  },
  menuItemPressed: {
    backgroundColor: palette.accentSoft
  },
  menuLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: palette.ink
  },
  menuInfo: {
    marginTop: "auto",
    marginBottom: 18,
    flexDirection: "row",
    gap: 10,
    borderRadius: 16,
    padding: 14,
    backgroundColor: palette.accentSoft
  },
  menuInfoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: palette.inkSoft
  }
});