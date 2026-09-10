import { useEffect, useRef } from "react";
import type { AppMapHandle } from "../components/AppMap";

export type TrackingTarget = {
  latitude: number;
  longitude: number;
};

export function useSmoothMapTracking(
  mapRef: React.RefObject<AppMapHandle | null>,
  target: TrackingTarget | undefined,
  enabled: boolean = true,
  options: {
    duration?: number;
    zoom?: number;
  } = {}
) {
  const lastTargetRef = useRef<TrackingTarget | undefined>(undefined);
  const animationFrameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  const { duration = 800, zoom = 16 } = options;

  useEffect(() => {
    if (!enabled || !mapRef.current || !target) {
      return;
    }

    // Check if target has actually changed (avoid updating on same coordinates)
    if (
      lastTargetRef.current &&
      Math.abs(lastTargetRef.current.latitude - target.latitude) < 0.00001 &&
      Math.abs(lastTargetRef.current.longitude - target.longitude) < 0.00001
    ) {
      return;
    }

    // Clear any pending animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    lastTargetRef.current = target;

    // Schedule the camera animation on the next frame to ensure smooth timing
    animationFrameRef.current = requestAnimationFrame(() => {
      mapRef.current?.animateCamera(
        {
          center: target,
          zoom
        },
        { duration }
      );
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [target, enabled, mapRef, duration, zoom]);
}
