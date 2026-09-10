import type { MapSource } from "./MapSourceSwitch";

export function getMapProvider(_: MapSource) { return undefined; }
export function getMapType(source: MapSource) { return source === "satellite" ? "satellite" as const : "standard" as const; }
// Tiles are rendered by the shared OpenStreetMap surface.
export function OpenStreetMapTiles(_: { source: MapSource }) { return null; }
