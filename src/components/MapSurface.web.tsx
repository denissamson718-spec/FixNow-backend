import React, { memo, forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { mapDocument } from "./mapDocument";
import type { MapSurfaceHandle, MapSurfaceProps } from "./MapSurface";
export default memo(forwardRef<MapSurfaceHandle, MapSurfaceProps>(function MapSurface({ onMessage }, ref) {
  const frame = useRef<HTMLIFrameElement>(null);
  useImperativeHandle(ref, () => ({ send: message => frame.current?.contentWindow?.postMessage(JSON.stringify(message), "*") }), []);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      try { onMessage(typeof event.data === "string" ? JSON.parse(event.data) : event.data); } catch {}
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onMessage]);
  return <iframe ref={frame} onLoad={() => frame.current?.contentWindow?.postMessage(JSON.stringify({ type: "ping" }), "*")} title="OpenStreetMap" srcDoc={mapDocument} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" style={{ width: "100%", height: "100%", border: 0 }} />;
}));
