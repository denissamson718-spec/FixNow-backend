import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type MapSource = "openstreetmap" | "satellite";

const mapSourceLabels: Record<MapSource, string> = {
  openstreetmap: "OpenStreetMap",
  satellite: "Satellite"
};

export function MapSourceSwitch({
  value,
  onChange
}: {
  value: MapSource;
  onChange: (nextValue: MapSource) => void;
}) {
  return (
    <View style={styles.wrap}>
      {(Object.keys(mapSourceLabels) as MapSource[]).map((source) => {
        const isActive = source === value;

        return (
          <Pressable
            key={source}
            onPress={() => onChange(source)}
            style={[styles.option, isActive && styles.optionActive]}
          >
            <Text style={[styles.optionText, isActive && styles.optionTextActive]}>{mapSourceLabels[source]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    borderRadius: 999,
    padding: 4,
    backgroundColor: "rgba(255,255,255,0.94)"
  },
  option: {
    minWidth: 76,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  optionActive: {
    backgroundColor: "#101828"
  },
  optionText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475467"
  },
  optionTextActive: {
    color: "#FFFFFF"
  }
});
