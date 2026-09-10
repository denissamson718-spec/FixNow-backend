import { leafletScript, leafletStyles } from "../vendor/leafletAssets";

// Leaflet runs in a WebView on mobile and an isolated iframe on web.
export const mapDocument = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="preconnect" href="https://tile.openstreetmap.org">
<link rel="preconnect" href="https://services.arcgisonline.com">
<style>${leafletStyles}</style>
<style>html,body,#map{height:100%;margin:0}body{background:#eef2f6;font-family:sans-serif}#error{padding:20px}.leaflet-control-attribution{font-size:10px}</style>
</head><body><div id="map"></div><script>${leafletScript}</script><script>
const send = data => { const message=JSON.stringify(data); if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(message); else parent.postMessage(message,'*'); };
if(!window.L){document.getElementById('map').textContent='Map could not load. Check your internet connection.';}else{
const map=L.map('map',{zoomControl:false,maxZoom:20,fadeAnimation:false});
map.attributionControl.setPosition('topright');
const streetLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxNativeZoom:19,maxZoom:20,updateWhenIdle:true,updateWhenZooming:false,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>'});
const satelliteLayer=L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxNativeZoom:19,maxZoom:20,updateWhenIdle:true,updateWhenZooming:false,attribution:'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'});
let activeLayer=null,bootstrapping=false,pendingSource;
function setSource(source){
if(bootstrapping){pendingSource=source;return;}
const next=source==='satellite'?satelliteLayer:streetLayer;
if(next===activeLayer)return;
if(activeLayer)map.removeLayer(activeLayer);
activeLayer=next;next.addTo(map);
}
let markers={},lines={},user=null,gesture=false;
const latlng=p=>[p.latitude,p.longitude];
let positionFrame=null;
function positions(){if(positionFrame!==null)return;positionFrame=requestAnimationFrame(()=>{positionFrame=null;publishPositions();});}
let lastPositions="";
function publishPositions(){if(!map._loaded)return;const points={};Object.entries(markers).forEach(([id,p])=>{const point=map.latLngToContainerPoint(latlng(p));points[id]={x:point.x,y:point.y};});const serialized=JSON.stringify(points);if(serialized===lastPositions)return;lastPositions=serialized;send({type:'positions',points});}
window.fixNowMap = message => {
const {type,payload:p}=message;
if(type==='bootstrap'){
bootstrapping=true;
try{p.forEach(item=>window.fixNowMap(item.type==='camera'?{...item,payload:{...item.payload,options:{...item.payload.options,duration:0}}}:item.type==='fit'?{...item,payload:{...item.payload,options:{...item.payload.options,animated:false}}}:item));}
finally{bootstrapping=false;setSource(pendingSource);}
return;
}
if(type==='ping'){send({type:'ready'});return;}
if(type==='source'){setSource(p);}
if(type==='init'){setSource(p.mapType);map.setMinZoom(p.minZoomLevel||5);map.setMaxZoom(p.maxZoomLevel||20);const r=p.initialRegion;map.fitBounds([[r.latitude-r.latitudeDelta/2,r.longitude-r.longitudeDelta/2],[r.latitude+r.latitudeDelta/2,r.longitude+r.longitudeDelta/2]],{animate:false});if(p.showsScale)L.control.scale().addTo(map);if(p.showsMyLocationButton){const Locate=L.Control.extend({options:{position:'bottomleft'},onAdd:()=>{const button=L.DomUtil.create('button','leaflet-bar');button.textContent='◎';button.title='My location';button.style.cssText='width:34px;height:34px;background:white;font-size:24px;cursor:pointer';L.DomEvent.disableClickPropagation(button);L.DomEvent.on(button,'click',()=>{if(user)map.setView(user.getLatLng(),16);});return button;}});new Locate().addTo(map);}if(p.zoomControlEnabled)L.control.zoom({position:'bottomleft'}).addTo(map);if(p.scrollEnabled===false)map.dragging.disable();if(p.zoomEnabled===false){map.touchZoom.disable();map.scrollWheelZoom.disable();map.doubleClickZoom.disable();}}
if(type==='camera'){map.setView(latlng(p.camera.center),p.camera.zoom??map.getZoom(),{animate:(p.options?.duration??0)>0,duration:(p.options?.duration??0)/1000});}
if(type==='fit'&&p.coordinates.length){const pad=p.options.edgePadding;map.fitBounds(p.coordinates.map(latlng),{paddingTopLeft:[pad.left,pad.top],paddingBottomRight:[pad.right,pad.bottom],animate:p.options.animated,maxZoom:17});}
if(type==='marker'){markers[p.id]=p.coordinate;positions();}
if(type==='removeMarker'){delete markers[p.id];positions();}
if(type==='line'){if(lines[p.id])map.removeLayer(lines[p.id]);lines[p.id]=L.polyline(p.coordinates.map(latlng),{color:p.strokeColor||'#16A05D',weight:p.strokeWidth||3,dashArray:p.lineDashPattern?.join(' '),lineCap:p.lineCap||'round',lineJoin:p.lineJoin||'round'}).addTo(map);}
if(type==='removeLine'){if(lines[p.id])map.removeLayer(lines[p.id]);delete lines[p.id];}
if(type==='location'){if(user)user.setLatLng(latlng(p));else user=L.circleMarker(latlng(p),{radius:7,color:'white',weight:3,fillColor:'#2684ff',fillOpacity:1}).addTo(map);}
};
window.addEventListener('message',e=>{if(e.source!==parent)return;try{window.fixNowMap(typeof e.data==='string'?JSON.parse(e.data):e.data);}catch{}});
map.on('click',()=>send({type:'press'}));
map.on('dragstart',()=>{gesture=true;send({type:'gesture'});});
map.on('zoomstart',()=>{if(!programmatic){gesture=true;send({type:'gesture'});}});
let programmatic=false;const receive=window.fixNowMap;window.fixNowMap=m=>{programmatic=true;try{receive(m);}finally{programmatic=false;}};
map.on('move zoom resize',positions);
map.on('moveend',()=>{positions();const c=map.getCenter(),b=map.getBounds();send({type:'region',region:{latitude:c.lat,longitude:c.lng,latitudeDelta:b.getNorth()-b.getSouth(),longitudeDelta:b.getEast()-b.getWest()},isGesture:gesture});gesture=false;});
new ResizeObserver(()=>map.invalidateSize()).observe(document.getElementById('map'));
send({type:'ready'});
}
</script></body></html>`;
