import { Platform } from "react-native";

export function getRideMapInteractionProps({ showsUserLocation = false }: { showsUserLocation?: boolean } = {}) {
  return {
    loadingEnabled: true,
    loadingBackgroundColor: "#EEF2F6",
    loadingIndicatorColor: "#16A05D",
    moveOnMarkerPress: false,
    rotateEnabled: true,
    pitchEnabled: true,
    scrollEnabled: true,
    scrollDuringRotateOrZoomEnabled: true,
    zoomEnabled: true,
    zoomTapEnabled: true,
    zoomControlEnabled: Platform.OS === "android",
    toolbarEnabled: Platform.OS === "android",
    showsCompass: true,
    showsScale: true,
    showsBuildings: true,
    minZoomLevel: 5,
    maxZoomLevel: 20,
    showsMyLocationButton: showsUserLocation && Platform.OS === "android",
    showsUserLocation
  } as const;
}
