import React, { createContext, forwardRef, useCallback, useContext, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Image, ImageSourcePropType, Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import * as Location from "expo-location";
import MapSurface, { MapSurfaceHandle } from "./MapSurface";

export type MapCoordinate = { latitude: number; longitude: number };
export type MapRegion = MapCoordinate & { latitudeDelta: number; longitudeDelta: number };
export type AppMapProvider = undefined;
export type AppMapType = "standard" | "satellite";
export type AppMapHandle = {
  animateCamera: (camera: { center: MapCoordinate; zoom?: number; heading?: number; pitch?: number; altitude?: number }, options?: { duration?: number }) => void;
  fitToCoordinates: (coordinates: MapCoordinate[], options: { edgePadding: { top: number; right: number; bottom: number; left: number }; animated: boolean }) => void;
};
type AppMapProps = {
  initialRegion: MapRegion; children?: React.ReactNode; style?: StyleProp<ViewStyle>;
  onPress?: () => void; showsUserLocation?: boolean; onPanDrag?: () => void;
  onRegionChangeComplete?: (region: MapRegion, details: { isGesture: boolean }) => void;
  provider?: AppMapProvider; mapType?: AppMapType;
  loadingEnabled?: boolean; loadingBackgroundColor?: string; loadingIndicatorColor?: string;
  moveOnMarkerPress?: boolean; rotateEnabled?: boolean; pitchEnabled?: boolean; scrollEnabled?: boolean;
  scrollDuringRotateOrZoomEnabled?: boolean; zoomEnabled?: boolean; zoomTapEnabled?: boolean;
  zoomControlEnabled?: boolean; toolbarEnabled?: boolean; showsCompass?: boolean; showsScale?: boolean;
  showsBuildings?: boolean; minZoomLevel?: number; maxZoomLevel?: number; showsMyLocationButton?: boolean;
};
type Message = { type: string; payload: unknown };
const Context = createContext<{ send: (message: Message) => void; points: Record<string, { x: number; y: number }> } | null>(null);

const AppMap = forwardRef<AppMapHandle, AppMapProps>(function AppMap(props, ref) {
  const surface = useRef<MapSurfaceHandle>(null);
  const ready = useRef(false);
  const pending = useRef<Message[]>([]);
  const latest = useRef(props); latest.current = props;
  const [points, setPoints] = useState<Record<string, { x: number; y: number }>>({});
  const send = useCallback((message: Message) => {
    if (ready.current) surface.current?.send(message); else pending.current.push(message);
  }, []);
  useImperativeHandle(ref, () => ({
    animateCamera: (camera, options) => send({ type: "camera", payload: { camera, options } }),
    fitToCoordinates: (coordinates, options) => send({ type: "fit", payload: { coordinates, options } })
  }), [send]);
  useEffect(() => {
    send({ type: "source", payload: props.mapType ?? "standard" });
  }, [props.mapType, send]);
  const onMessage = useCallback((message: any) => {
    if (message.type === "ready") {
      if (ready.current) return;
      ready.current = true;
      const { children, style, ...settings } = latest.current;
      surface.current?.send({
        type: "bootstrap",
        payload: [{ type: "init", payload: settings }, ...pending.current.splice(0)]
      });
    } else if (message.type === "positions") setPoints(message.points);
    else if (message.type === "press") latest.current.onPress?.();
    else if (message.type === "gesture") latest.current.onPanDrag?.();
    else if (message.type === "region") latest.current.onRegionChangeComplete?.(message.region, { isGesture: message.isGesture });
  }, []);
  useEffect(() => {
    if (!props.showsUserLocation) return;
    let stopped = false;
    let subscription: Location.LocationSubscription | undefined;
    void (async () => {
      const permission = await Location.getForegroundPermissionsAsync();
      if (stopped || permission.status !== "granted") return;
      subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 5 }, location => {
        if (!stopped) send({ type: "location", payload: location.coords });
      });
      if (stopped) subscription.remove();
    })().catch(() => {});
    return () => { stopped = true; subscription?.remove(); };
  }, [props.showsUserLocation, send]);
  const context = useMemo(() => ({ send, points }), [send, points]);
  return <View style={[{ overflow: "hidden" }, props.style]}>
    <MapSurface ref={surface} onMessage={onMessage} />
    <Context.Provider value={context}><View pointerEvents="box-none" style={StyleSheet.absoluteFill}>{props.children}</View></Context.Provider>
  </View>;
});
export default AppMap;

export function AppMapMarker({ coordinate, children, pinColor = "#16A05D", anchor = { x: 0.5, y: 1 }, rotation = 0, zIndex, title, description, image, onPress }: {
  coordinate: MapCoordinate; children?: React.ReactNode; pinColor?: string; anchor?: { x: number; y: number };
  image?: ImageSourcePropType; onPress?: () => void; rotation?: number; zIndex?: number; title?: string; description?: string; [key: string]: unknown;
}) {
  const context = useContext(Context), id = useId(), send = context?.send;
  const [size, setSize] = useState({ width: 20, height: 20 });
  useEffect(() => { send?.({ type: "marker", payload: { id, coordinate } }); }, [send, id, coordinate.latitude, coordinate.longitude]);
  useEffect(() => () => send?.({ type: "removeMarker", payload: { id } }), [send, id]);
  const point = context?.points[id];
  return <Pressable onPress={onPress} pointerEvents={onPress ? "auto" : "none"} accessibilityLabel={[title, description].filter(Boolean).join(": ")}
    onLayout={event => { const { width, height } = event.nativeEvent.layout; setSize(current => current.width === width && current.height === height ? current : { width, height }); }}
    style={{ position: "absolute", left: (point?.x ?? 0) - size.width * anchor.x, top: (point?.y ?? 0) - size.height * anchor.y, opacity: point ? 1 : 0, zIndex, transform: [{ rotate: `${rotation}deg` }] }}>
    {children ?? (image ? <Image source={image} style={{ width: 44, height: 44 }} resizeMode="contain" /> : <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: "white", backgroundColor: pinColor }} />)}
  </Pressable>;
}
export function AppMapPolyline(props: { coordinates: MapCoordinate[]; strokeColor?: string; strokeWidth?: number; lineDashPattern?: number[]; lineCap?: string; lineJoin?: string; [key: string]: unknown }) {
  const send = useContext(Context)?.send, id = useId();
  const serialized = JSON.stringify(props);
  useEffect(() => { send?.({ type: "line", payload: { ...JSON.parse(serialized), id } }); }, [send, id, serialized]);
  useEffect(() => () => send?.({ type: "removeLine", payload: { id } }), [send, id]);
  return null;
}
