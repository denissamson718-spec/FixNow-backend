const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function setup() {
  const source = readFileSync('src/components/mapDocument.ts', 'utf8');
  const script = source.split('<script>').at(-1).split('</script>')[0];
  const messages = [], frames = [], layers = new Set();
  let fits = 0;
  const views = [];
  const map = {
    _loaded: true, attributionControl: { setPosition() {} },
    setMinZoom() {}, setMaxZoom() {}, fitBounds(bounds, options) { fits++; views.push({ layers: layers.size, options }); },
    setView(center, zoom, options) { views.push({ layers: layers.size, options }); },
    removeLayer(layer) { layers.delete(layer); }, on() {},
    latLngToContainerPoint: ([latitude, longitude]) => ({ x: longitude, y: latitude })
  };
  const context = {
    window: { ReactNativeWebView: { postMessage: data => messages.push(JSON.parse(data)) }, addEventListener() {} },
    L: { map: () => map, tileLayer: url => ({ url, addTo() { layers.add(this); return this; } }) },
    document: { getElementById() { return {}; } },
    ResizeObserver: class { observe() {} },
    requestAnimationFrame: callback => { frames.push(callback); return frames.length; }
  };
  context.window.L = context.L;
  vm.runInNewContext(script, context);
  return { messages, frames, layers, views, fits: () => fits, send: (type, payload) => context.window.fixNowMap({ type, payload }) };
}

test('satellite starts without street tiles and switching preserves the camera', () => {
  const map = setup();
  map.send('init', { mapType: 'satellite', initialRegion: { latitude: 0, longitude: 0, latitudeDelta: 1, longitudeDelta: 1 } });
  assert.equal(map.layers.size, 1);
  assert.match([...map.layers][0].url, /World_Imagery/);
  map.send('source', 'standard');
  assert.equal(map.layers.size, 1);
  assert.match([...map.layers][0].url, /openstreetmap/);
  map.send('source', 'satellite');
  assert.equal(map.layers.size, 1);
  assert.equal(map.fits(), 1);
});

test('many marker updates publish once per animation frame with latest coordinates', () => {
  const map = setup();
  for (let i = 0; i < 100; i++) map.send('marker', { id: String(i), coordinate: { latitude: i, longitude: i } });
  map.send('marker', { id: '0', coordinate: { latitude: 200, longitude: 300 } });
  assert.equal(map.frames.length, 1);
  map.frames.shift()();
  const positions = map.messages.filter(message => message.type === 'positions');
  assert.equal(positions.length, 1);
  assert.equal(Object.keys(positions[0].points).length, 100);
  assert.deepEqual(positions[0].points['0'], { x: 300, y: 200 });
});


test('load handshake recovers a missed ready event', () => {
  const map = setup();
  map.messages.length = 0;
  map.send('ping');
  assert.deepEqual(map.messages, [{ type: 'ready' }]);
});

test('unchanged marker positions do not cause another render', () => {
  const map = setup();
  const marker = { id: 'driver', coordinate: { latitude: 1, longitude: 2 } };
  map.send('marker', marker);
  map.frames.shift()();
  map.send('marker', marker);
  map.frames.shift()();
  assert.equal(map.messages.filter(message => message.type === 'positions').length, 1);
});


test('bootstrap loads tiles only after the final camera and skips startup animations', () => {
  const map = setup();
  map.send('bootstrap', [
    { type: 'init', payload: { mapType: 'standard', initialRegion: { latitude: 0, longitude: 0, latitudeDelta: 1, longitudeDelta: 1 } } },
    { type: 'camera', payload: { camera: { center: { latitude: 1, longitude: 2 }, zoom: 15 }, options: { duration: 900 } } },
    { type: 'source', payload: 'satellite' },
    { type: 'fit', payload: { coordinates: [{ latitude: 1, longitude: 2 }], options: { animated: true, edgePadding: { top: 0, left: 0, right: 0, bottom: 0 } } } }
  ]);
  assert.equal(map.views.length, 3);
  for (const view of map.views) {
    assert.equal(view.layers, 0);
    assert.equal(view.options.animate, false);
  }
  assert.equal(map.layers.size, 1);
  assert.match([...map.layers][0].url, /World_Imagery/);
  map.send('camera', { camera: { center: { latitude: 3, longitude: 4 }, zoom: 15 }, options: { duration: 900 } });
  assert.equal(map.views.at(-1).options.animate, true);
});
