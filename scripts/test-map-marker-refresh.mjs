import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const source = parse(readFileSync(new URL('../src/views/MapView.vue', import.meta.url), 'utf8')).descriptor.scriptSetup.content
const ast = ts.createSourceFile('MapView.ts', source, ts.ScriptTarget.Latest, true)
const names = new Set(['createVehicleMarker', 'renderMarkers', 'syncFuelEventMarkers'])
const nodes = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.has(node.name?.text))
const code = ts.transpileModule(nodes.map(node => node.getText(ast)).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
let overlayAdds = 0, overlayRemoves = 0, fuelAdds = 0, fuelRemoves = 0
class Overlay {
  setMap(map) { if (map) { overlayAdds++; this.onAdd(); this.draw() } else { overlayRemoves++; this.onRemove() } }
  getPanes() { return { overlayMouseTarget: { appendChild() {} } } }
  getProjection() { return { fromLatLngToDivPixel: point => ({ x: point.lng, y: point.lat }) } }
}
class FuelMarker {
  constructor(options) { fuelAdds++; Object.assign(this, options) }
  addListener() {}
  setMap(map) { if (!map) fuelRemoves++ }
}
const elements = []
const state = {
  window: { google: { maps: { OverlayView: Overlay, Marker: FuelMarker, LatLng: class { constructor(lat, lng) { this.lat = lat; this.lng = lng } }, Size: class {}, Point: class {}, event: { clearInstanceListeners() {} } } } },
  document: { createElement: () => { const element = { style: {}, innerHTML: '', addEventListener() {}, remove() {} }; elements.push(element); return element } },
  googleMap: { value: {} }, googleMarkers: { value: [] }, mapMarkerVehicles: { value: [] }, workspaceActive: { value: true },
  markerHtml: vehicle => `<button>${vehicle.plateNumber}:${vehicle.speed}</button>`, markRaw: value => value, selectVehicle() {},
  fleetStore: { currentPositionHistorySummary: { fuelEvents: [] } }, fuelEventMarkers: [], renderedFuelEvents: null,
  validHistoryPosition: point => point.lat != null && point.lon != null, render() {}, h() {}, Fuel: {}, TriangleAlert: {}, fuelEventLabel: () => 'Tankowanie', showFuelEvent() {},
}
vm.runInNewContext(code + '\nthis.api = { renderMarkers, syncFuelEventMarkers }', state)
const vehicle = (id, latitude = 52) => ({ id, latitude, longitude: 19, plateNumber: id, vehicleType: 'truck', speed: 0 })
state.mapMarkerVehicles.value = [vehicle('1'), vehicle('2')]
state.api.renderMarkers()
const original = [...state.googleMarkers.value]
for (let tick = 0; tick < 3; tick++) {
  state.mapMarkerVehicles.value = [vehicle('1', 53 + tick), vehicle('2')]
  state.api.renderMarkers()
  assert.equal(state.googleMarkers.value[0], original[0])
  assert.equal(state.googleMarkers.value[1], original[1])
  assert.equal(elements[0].style.top, `${53 + tick}px`)
}
assert.equal(overlayAdds, 2)
assert.equal(overlayRemoves, 0, 'Do not detach vehicle overlays during polling')
state.mapMarkerVehicles.value = [vehicle('2'), vehicle('3')]
state.api.renderMarkers()
assert.equal(state.googleMarkers.value[0], original[1])
assert.equal(overlayAdds, 3)
assert.equal(overlayRemoves, 1, 'Remove only vehicles that leave the current map filter')
const event = { type: 'POSSIBLE_REFUEL', detectedAt: '2026-10-27T10:00:00Z', lat: 52, lng: 19 }
state.fleetStore.currentPositionHistorySummary.fuelEvents = [event]
state.api.syncFuelEventMarkers()
const originalFuel = state.fuelEventMarkers[0]
for (let tick = 0; tick < 3; tick++) {
  state.fleetStore.currentPositionHistorySummary.fuelEvents = [{ ...event }]
  state.api.syncFuelEventMarkers()
  assert.equal(state.fuelEventMarkers[0], originalFuel)
}
assert.equal(fuelAdds, 1)
assert.equal(fuelRemoves, 0, 'Identical fuel events from a new response retain their markers')
state.fleetStore.currentPositionHistorySummary.fuelEvents = [{ ...event }, { ...event, detectedAt: '2026-10-27T11:00:00Z' }]
state.api.syncFuelEventMarkers()
assert.equal(fuelAdds, 2)
assert.equal(fuelRemoves, 0)
assert.equal(state.fuelEventMarkers[0], originalFuel)
console.log('PASS: repeated polling preserves vehicle overlays and fuel markers, updates positions and only adds/removes changed entries.')
