import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import { parse, compileScript } from '@vue/compiler-sfc'

const require = createRequire(import.meta.url), vue = require('vue'), pinia = require('pinia')
const localStorage = { getItem: () => null, setItem() {}, removeItem() {} }
function evaluate(source, mocks, globals = {}) {
  const exports = {}
  const code = ts.transpileModule(source.replaceAll('import.meta.env.VITE_GOOGLE_MAPS_API_KEY', "'test-key'"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, console, localStorage, AbortController, ...globals, require: name => mocks[name] || require(name) })
  return exports
}
const source = filename => readFileSync(new URL('../' + filename, import.meta.url), 'utf8')
const markerUtils = evaluate(source('src/utils/fleetMarker.ts'), {})
let now = Date.parse('2026-10-20T12:00:00.000Z')
let resolvePositions, calls = 0
pinia.setActivePinia(pinia.createPinia())
const { useFleetStore } = evaluate(source('src/stores/fleetStore.ts'), {
  '@/services/positionService': { positionService: { getLastPositions: () => { calls++; return new Promise(resolve => { resolvePositions = resolve }) } } },
  '@/services/localPositionHistoryService': {}, '@/utils/historyTime': {}, '@/services/vehicleGroupService': {}, '@/services/vehicleService': {},
})
const fleet = useFleetStore()
const first = fleet.fetchLastPositions(), second = fleet.fetchLastPositions()
assert.equal(calls, 1, 'Concurrent previews share a request')
resolvePositions([{ vehicleId: 98, deviceId: 46, lat: 50, lon: 19 }]); await Promise.all([first, second])
assert.equal(fleet.positionByVehicleId.get('98').lat, 50)
const stale = fleet.fetchLastPositions(); fleet.resetApiState()
const oldResolve = resolvePositions, fresh = fleet.fetchLastPositions()
oldResolve([{ vehicleId: 98, lat: 1, lon: 1 }]); await stale
assert.equal(fleet.lastPositions.length, 0)
assert.equal(fleet.isPositionsLoading, true, 'Old completion cannot stop new loading state')
resolvePositions([{ vehicleId: 98, deviceId: 46, lat: 52, lon: 19, ts: new Date(now).toISOString() }]); await fresh
assert.equal(fleet.positionByVehicleId.get('98').lat, 52)

const mounts = [], unmounts = [], timers = new Map(), handlers = new Map(), maps = [], markers = []
const active = vue.ref(true), auth = vue.reactive({ user: { id: 2 }, canManageCompany: false, hasActiveCompanyPermission: () => true }), ui = vue.reactive({ theme: 'light' })
let timerId = 0, refreshCalls = 0, resizeDisconnected = false
const copied = [], toasts = []
ui.addToast = toast => toasts.push(toast)
fleet.fetchLastPositions = async () => { refreshCalls++ }
const google = { maps: {
  Map: class { constructor(element, options) { this.options = options; this.center = options.center; maps.push(this) } getZoom() { return this.options.zoom } setZoom(value) { this.options.zoom = value } setCenter(value) { this.center = value } setOptions(value) { Object.assign(this.options, value) } },
  OverlayView: class {
    constructor() { markers.push(this); this.layer = makeNode() }
    setMap(value) { this.map = value; if (value) { this.onAdd(); this.node = this.layer.children.at(-1); this.draw() } else this.onRemove() }
    getPanes() { return { overlayLayer: this.layer } }
    getProjection() { return { fromLatLngToDivPixel: value => ({ x: value.lat * 10, y: value.lng * 10 }) } }
  },
  LatLng: class { constructor(lat, lng) { this.lat = lat; this.lng = lng } },
  event: { clearInstanceListeners() {}, trigger() {} },
} }
function makeNode() { return { innerHTML: '', children: [], style: { setProperty(key, value) { this[key] = value } }, appendChild(child) { this.children.push(child) }, replaceChildren(...children) { this.children = children }, remove() { this.removed = true } } }
const document = { hidden: false, createElement: makeNode, addEventListener: (name, fn) => handlers.set(name, fn), removeEventListener: name => handlers.delete(name) }
const descriptor = parse(source('src/components/vehicles/VehicleLocationPreview.vue')).descriptor
const component = evaluate(compileScript(descriptor, { id: 'location-test' }).content, {
  '@/components/ui/AppButton.vue': {}, '@/components/ui/AppIconButton.vue': {}, '@/components/ui/AppModal.vue': {},
  vue: { ...vue, onMounted: fn => mounts.push(fn), onBeforeUnmount: fn => unmounts.push(fn), render() {} },
  '@/composables/useWorkspace': { useWorkspaceActive: () => active },
  '@/services/googleMapsLoader': { loadGoogleMaps: async () => google }, '@/services/googleMapStyles': { DARK_STYLES: ['dark'] },
  '@/stores/authStore': { useAuthStore: () => auth }, '@/stores/fleetStore': { useFleetStore: () => fleet }, '@/stores/uiStore': { useUiStore: () => ui },
  '@/utils/localPositionHistory': { validHistoryPosition: p => Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180 },
  '@/utils/fleetMarker': markerUtils,
}, {
  Date: class extends Date { static now() { return now } },
  navigator: { clipboard: { writeText: async value => copied.push(value) } },
  document, window: { setInterval(fn, ms) { timers.set(++timerId, { fn, ms }); return timerId }, clearInterval: id => timers.delete(id) },
  ResizeObserver: class { observe() {} disconnect() { resizeDisconnected = true } }, getComputedStyle: () => ({ getPropertyValue: () => '255 255 255' }),
}).default
const scope = vue.effectScope()
const props = vue.reactive({ vehicle: { id: 98, licensePlate: 'QA123', type: 'TRAILER', assignedDeviceId: 46 } })
const preview = scope.run(() => component.setup(props, { expose() {} }))
preview.element.value = {}
mounts.forEach(fn => fn()); await vue.nextTick(); await new Promise(resolve => setImmediate(resolve))
assert.equal(maps.length, 1, JSON.stringify({ coordinate: preview.coordinate.value, permission: preview.canRead.value, error: preview.mapError.value, mounts: mounts.length, position: preview.position.value }))
assert.equal(maps[0].options.gestureHandling, 'none')
for (const key of ['draggable', 'scrollwheel', 'keyboardShortcuts', 'clickableIcons']) assert.equal(maps[0].options[key], false)
assert.equal(maps[0].options.disableDoubleClickZoom, true)
assert.equal(timers.size, 1)
assert.equal([...timers.values()][0].ms, 10000)
assert.equal(markers.length, 1)
assert.equal(maps[0].options.styles, null, 'Preview always uses the main map light style')
assert.match(markers[0].node.className, /rw-fleet-vehicle-marker-trailer/)
assert.equal(markers[0].node.children[1].className, 'rw-fleet-marker-plate')
assert.equal(markers[0].node.children[1].children[0].textContent, 'QA123')
assert.equal(markers[0].node.children[0].innerHTML, markerUtils.fleetMarkerIconSvg('idle', 'trailer'))
fleet.lastPositions = [{ vehicleId: 98, deviceId: 46, lat: 53, lon: 20, ts: new Date(now).toISOString(), speedKph: 40, heading: 120 }]; await vue.nextTick()
assert.equal(markers.length, 1, 'Update marker, do not accumulate markers')
assert.equal(markers[0].node.style.left, '530px')
assert.match(markers[0].node.children[0].className, /rw-fleet-marker-idle/)
assert.equal(markers[0].node.children[0].innerHTML, markerUtils.fleetMarkerIconSvg('idle', 'trailer'), 'Moving vehicle keeps the default stationary icon')
await preview.copyLocation()
assert.equal(copied.at(-1), '53.00000, 20.00000')
assert.equal(toasts.at(-1).type, 'success')
assert.equal(markers[0].node.children[0].style['--rw-marker-heading'], '120deg')
assert.equal(maps[0].center.lat, 53)
await [...timers.values()][0].fn()
assert.equal(refreshCalls, 2)
// The same map canvas supports mini zoom and fullscreen-only panning.
preview.zoomBy(1); assert.equal(maps[0].options.zoom, 15)
let wheelPrevented = false
preview.handleWheelZoom({ deltaY: 100, preventDefault() { wheelPrevented = true } })
assert.equal(wheelPrevented, true); assert.equal(maps[0].options.zoom, 14)
const callsBeforeFullscreen = refreshCalls
preview.openFullscreen(); await vue.nextTick(); await vue.nextTick()
assert.equal(preview.isFullscreen.value, true)
assert.equal(maps[0].options.gestureHandling, 'greedy')
assert.equal(maps[0].options.draggable, true); assert.equal(maps[0].options.scrollwheel, true)
assert.equal(maps[0].options.keyboardShortcuts, true); assert.equal(maps[0].options.disableDoubleClickZoom, false)
assert.equal(maps.length, 1, 'Fullscreen reuses the existing map')
assert.equal(refreshCalls, callsBeforeFullscreen, 'Opening fullscreen adds no position requests')
assert.equal(timers.size, 1, 'Fullscreen does not create a second polling timer')
maps[0].setCenter({ lat: 1, lng: 2 }); maps[0].setZoom(8)
fleet.lastPositions = [{ ...fleet.lastPositions[0], speedKph: 42 }]; await vue.nextTick()
assert.equal(maps[0].center.lat, 1, 'Position refresh must not override user panning in fullscreen')
let fullscreenWheelPrevented = false
preview.handleWheelZoom({ deltaY: 100, preventDefault() { fullscreenWheelPrevented = true } })
assert.equal(fullscreenWheelPrevented, false, 'Fullscreen leaves normal map wheel gestures enabled')
preview.closeFullscreen(); await vue.nextTick(); await vue.nextTick()
assert.equal(preview.isFullscreen.value, false)
assert.equal(maps[0].options.draggable, false); assert.equal(maps[0].options.gestureHandling, 'none')
assert.equal(maps[0].options.zoom, 14, 'Closing fullscreen restores the mini-map zoom')
assert.equal(maps[0].center.lat, 53, 'Mini-map remains centered on the vehicle')
preview.zoomBy(100); assert.equal(maps[0].options.zoom, 21)
preview.zoomBy(-100); assert.equal(maps[0].options.zoom, 2)
preview.zoomBy(12)
const latestPosition = fleet.lastPositions[0]
for (const [age, label, stale] of [
  [0, 'przed chwilą', false],
  [59_999, 'przed chwilą', false],
  [60_000, '1 min temu', false],
  [3_600_000, '1 godz. temu', false],
  [86_399_999, '23 godz. temu', false],
  [86_400_000, '1 dzień temu', false],
  [86_400_001, '1 dzień temu', true],
  [90_000_000, '1 dzień i 1 godz. temu', true],
  [172_800_000, '2 dni temu', true],
]) {
  fleet.lastPositions = [{ ...latestPosition, ts: new Date(now - age).toISOString() }]
  await vue.nextTick()
  assert.equal(preview.positionAgeLabel.value, label, 'Human readable GPS age for ' + age + ' ms')
  assert.equal(preview.isPositionStale.value, stale, 'Only positions older than 24h use the red alert')
}
fleet.lastPositions = [{ ...latestPosition, ts: new Date(now - 86_400_000).toISOString() }]
await vue.nextTick()
const unchangedPosition = fleet.lastPositions[0]
assert.equal(preview.isPositionStale.value, false)
now += 10_000
await [...timers.values()][0].fn(); await vue.nextTick()
assert.equal(fleet.lastPositions[0], unchangedPosition, 'Polling can return the exact same position')
assert.equal(preview.isPositionStale.value, true, 'The alert ages past 24h even when polling returns unchanged GPS data')
now += 86_400_000
await [...timers.values()][0].fn(); await vue.nextTick()
assert.equal(preview.positionAgeLabel.value, '2 dni temu', 'Relative age advances with the polling clock')
for (const timestamp of [undefined, '', 'not-a-date']) {
  fleet.lastPositions = [{ ...latestPosition, ts: timestamp }]
  await vue.nextTick()
  assert.equal(preview.positionTimestamp.value, null)
  assert.equal(preview.positionAgeLabel.value, 'brak czasu odczytu')
  assert.equal(preview.isPositionStale.value, false, 'Missing/invalid read times cannot produce a stale GPS warning')
}
fleet.lastPositions = [{ ...latestPosition, ts: new Date(now + 86_400_000).toISOString() }]
await vue.nextTick()
assert.equal(preview.positionAgeLabel.value, 'przed chwilą', 'Future GPS timestamps never show a negative age')
assert.equal(preview.isPositionStale.value, false)
preview.openFullscreen(); await vue.nextTick(); await vue.nextTick()
active.value = false; await vue.nextTick(); assert.equal(timers.size, 0); assert.equal(preview.isFullscreen.value, false, 'Switching workspaces closes fullscreen')
active.value = true; await vue.nextTick(); assert.equal(timers.size, 1)
document.hidden = true; handlers.get('visibilitychange')(); assert.equal(timers.size, 0)
document.hidden = false; handlers.get('visibilitychange')(); assert.equal(timers.size, 1)
fleet.lastPositions = [{ vehicleId: 98, deviceId: 46, lat: null, lon: null }]; await vue.nextTick()
assert.equal(markers[0].map, null)
assert.match(preview.message.value, /Brak lokalizacji/)
fleet.lastPositions = [{ vehicleId: null, deviceId: 46, lat: 0, lon: 0 }]; await vue.nextTick()
assert.equal(preview.coordinate.value.lat, 0, 'Internal device fallback preserves valid zero coordinates')
ui.theme = 'dark'; await vue.nextTick(); assert.equal(maps[0].options.styles, null)
fleet.lastPositions = [{ vehicleId: 98, deviceId: 46, lat: 0, lon: 0, ts: new Date(now).toISOString(), speedKph: 0 }]; props.hasRepair = true; await vue.nextTick()
assert.match(markers.at(-1).node.children[0].className, /rw-fleet-marker-idle/, 'Repairs keep the stationary marker')
await preview.copyLocation()
assert.equal(copied.at(-1), '0.00000, 0.00000', 'Zero coordinates can be copied')
fleet.lastPositions = [{ vehicleId: 98, deviceId: 46, lat: 0, lon: 0, ts: '2020-01-01T00:00:00Z', speedKph: 80 }]; await vue.nextTick()
assert.match(markers.at(-1).node.children[0].className, /rw-fleet-marker-idle/, 'Stale GPS keeps the stationary marker')
const clipboardCount = copied.length
auth.user = null; await vue.nextTick(); assert.equal(timers.size, 0)
assert.match(preview.message.value, /dostępu/)
await preview.copyLocation()
assert.equal(copied.length, clipboardCount, 'Copy respects GPS permissions')
unmounts.forEach(fn => fn()); scope.stop()
assert.equal(timers.size, 0)
assert.equal(handlers.size, 0)
assert.equal(resizeDisconnected, true)
assert.ok(markers.every(marker => marker.map === null))
console.log('Vehicle location preview: single-flight/session isolation, mini zoom, fullscreen-only panning, shared canvas/timer, fullscreen cleanup, 10s polling, centering, stationary marker, relative GPS age and strict 24h alert, unchanged-data aging, copy coordinates, null/zero GPS, visibility, permissions, theme and cleanup OK.')
