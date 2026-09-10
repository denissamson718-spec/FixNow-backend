import React, { memo, forwardRef, useImperativeHandle, useRef } from "react";
import { WebView } from "react-native-webview";
import { mapDocument } from "./mapDocument";
const source = { html: mapDocument, baseUrl: "https://fixnow.app/" };
export type MapSurfaceHandle = { send: (message: unknown) => void };
export type MapSurfaceProps = { onMessage: (message: any) => void };
export default memo(forwardRef<MapSurfaceHandle, MapSurfaceProps>(function MapSurface({ onMessage }, ref) {
  const webview = useRef<WebView>(null);
  useImperativeHandle(ref, () => ({ send: message => {
    webview.current?.injectJavaScript(`window.fixNowMap && window.fixNowMap(${JSON.stringify(message)});true;`);
  }}), []);
  return <WebView ref={webview} source={source}
    userAgent="FixNow/1.0 (OpenStreetMap mobile viewer)" originWhitelist={["https://*"]}
    onLoadEnd={() => webview.current?.injectJavaScript(`window.fixNowMap && window.fixNowMap({type:"ping"});true;`)}
    javaScriptEnabled style={{ flex: 1 }} onMessage={event => {
      try { onMessage(JSON.parse(event.nativeEvent.data)); } catch {}
    }} />;
}));
