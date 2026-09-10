import { MechanicTransportMode } from "../types";

export type MechanicTransportType = MechanicTransportMode;

export const mechanicTransportOptions: Array<{
  id: MechanicTransportType;
  label: string;
  speedKmh: number;
}> = [
  { id: "walking", label: "Walking", speedKmh: 5 },
  { id: "bicycle", label: "Bicycle", speedKmh: 15 },
  { id: "motorcycle", label: "Motorcycle", speedKmh: 34 },
  { id: "car", label: "Car", speedKmh: 28 },
  { id: "tow-truck", label: "Tow truck", speedKmh: 20 }
];

export function getTransportLabel(transportType?: MechanicTransportType) {
  return mechanicTransportOptions.find((option) => option.id === transportType)?.label ?? "Transport";
}

export function getTransportIconName(transportType?: MechanicTransportType) {
  switch (transportType) {
    case "walking":
      return "walk-outline" as const;
    case "bicycle":
      return "bicycle-outline" as const;
    case "motorcycle":
      return "speedometer-outline" as const;
    case "tow-truck":
      return "build-outline" as const;
    case "car":
    default:
      return "car-sport-outline" as const;
  }
}

export function getTransportMapIconName(transportType?: MechanicTransportType) {
  switch (transportType) {
    case "walking":
      return "walk" as const;
    case "bicycle":
      return "bike" as const;
    case "motorcycle":
      return "motorbike" as const;
    case "tow-truck":
      return "tow-truck" as const;
    case "car":
    default:
      return "car" as const;
  }
}

export function estimateTransportEtaMinutes(distanceKm: number, transportType: MechanicTransportType) {
  const speedKmh = mechanicTransportOptions.find((option) => option.id === transportType)?.speedKmh ?? 24;

  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil((distanceKm / speedKmh) * 60));
}
