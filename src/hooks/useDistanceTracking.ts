import { useEffect, useState, useMemo } from "react";
import { calculateDistanceMeters } from "../utils/mapTracking";

export type DistanceInfo = {
  distanceMeters: number;
  distanceKm: number;
  etaMinutes: number;
};

// Average mechanic speed in km/h (realistic urban speed)
const AVERAGE_MECHANIC_SPEED_KMH = 35;

function calculateETA(distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  // Calculate time in minutes: (distance in km / speed in km/h) * 60
  const minutes = (distanceKm / AVERAGE_MECHANIC_SPEED_KMH) * 60;
  // Round up to nearest minute
  return Math.ceil(minutes);
}

export function useDistanceTracking(
  startLatitude: number | undefined,
  startLongitude: number | undefined,
  endLatitude: number | undefined,
  endLongitude: number | undefined
): DistanceInfo | undefined {
  const [distanceInfo, setDistanceInfo] = useState<DistanceInfo | undefined>(undefined);

  const calculatedDistance = useMemo(() => {
    if (
      typeof startLatitude !== "number" ||
      typeof startLongitude !== "number" ||
      typeof endLatitude !== "number" ||
      typeof endLongitude !== "number"
    ) {
      return undefined;
    }

    const distanceMeters = calculateDistanceMeters(
      { latitude: startLatitude, longitude: startLongitude },
      { latitude: endLatitude, longitude: endLongitude }
    );

    const distanceKm = distanceMeters / 1000;
    const etaMinutes = calculateETA(distanceKm);

    return {
      distanceMeters,
      distanceKm: parseFloat(distanceKm.toFixed(2)),
      etaMinutes
    };
  }, [startLatitude, startLongitude, endLatitude, endLongitude]);

  useEffect(() => {
    setDistanceInfo(calculatedDistance);
  }, [calculatedDistance]);

  return distanceInfo;
}

export function useMultipleDistances(
  driverLatitude: number | undefined,
  driverLongitude: number | undefined,
  mechanics: Array<{ id: string; latitude: number; longitude: number }>
) {
  return useMemo(() => {
    if (typeof driverLatitude !== "number" || typeof driverLongitude !== "number") {
      return new Map();
    }

    const distanceMap = new Map<string, DistanceInfo>();

    mechanics.forEach((mechanic) => {
      const distanceMeters = calculateDistanceMeters(
        { latitude: driverLatitude, longitude: driverLongitude },
        { latitude: mechanic.latitude, longitude: mechanic.longitude }
      );

      const distanceKm = distanceMeters / 1000;
      const etaMinutes = calculateETA(distanceKm);

      distanceMap.set(mechanic.id, {
        distanceMeters,
        distanceKm: parseFloat(distanceKm.toFixed(2)),
        etaMinutes
      });
    });

    return distanceMap;
  }, [driverLatitude, driverLongitude, mechanics]);
}
