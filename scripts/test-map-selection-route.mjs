import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const require = createRequire(import.meta.url)
const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
const transpile = code => ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
function load(file, mocks = {}) {
  const exports = {}
  vm.runInNewContext(transpile(read(file)), { exports, require: name => mocks[name] || require(name) })
  return exports
}
const utils = load('src/utils/localPositionHistory.ts')
const { usePositionHistory } = load('src/composables/usePositionHistory.ts', { '@/utils/localPositionHistory': utils })
const ast = ts.createSourceFile('MapView.ts', parse(read('src/views/MapView.vue')).descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true)
const names = new Set(['renderTodayRoute', 'syncTodayRouteRender', 'syncRoutePolyline', 'clearTodayRoute'])
const code = transpile(ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.has(node.name?.text)).map(node => node.getText(ast)).join('\n'))
const first = { id: 1, deviceId: 1, provider: 'LOCAL', ts: '2026-10-28T08:00:00Z', lat: 52, lon: 19, positionValid: true }
const latest = { ...first, id: 2, ts: '2026-10-28T08:00:10Z', lat: 52.001, lon: 19.002 }
const range = { from: '2026-10-27T23:00:00.000Z', to: latest.ts }
const vehicle = { id: '1', backendId: 1 }
const settle = () => new Promise(setImmediate)

function scenario() {
  let release
  const gate = new Promise(resolve => { release = resolve })
  const appends = [], createdLines = []
  class Polyline {
    constructor() { this.points = []; createdLines.push(this) }
    getPath() { return { getLength: () => this.points.length, push: point => this.points.push(point) } }
    setMap() {}
  }
  const state = {
    workspaceActive: { value: true }, activeMode: { value: 'list' }, selectedVehicle: { value: vehicle }, selectedVehicleId: { value: '1' },
    canReadLocalHistory: { value: true }, mapSettings: { map: { todayRoute: true } }, googleMap: { value: {} },
    window: { google: { maps: { Polyline, LatLng: class { constructor(lat, lng) { this.lat = lat; this.lng = lng } } } } },
    positionHistory: usePositionHistory(), todayRouteRequestId: 0, queuedTodayRouteVehicleId: null,
    todayRoutePolylines: [], renderedRoutePositionCount: 0, isRouteRenderComplete: false, historyRenderProgress: { value: 0 },
    todayHistoryRange: () => range,
    syncFuelEventMarkers() {}, syncRoutePointMarkers() {}, cancelRouteAnimation() {}, clearRoutePointMarkers() {}, closeRouteInfoWindow() {},
    clearRoutePolyline() { state.todayRoutePolylines = [] },
    clearPositionHistoryData() { state.positionHistory.clear() },
    showRouteHistoryErrorToast(error) { throw error },
    fleetStore: {
      currentPositionHistoryMode: null, currentPositionHistoryVehicleId: null, currentPositionHistoryRange: null, isRouteHistoryLoading: false, currentPositionHistoryComplete: false,
      async fetchTodayRouteHistory(selected, { onPage }) {
        Object.assign(this, { currentPositionHistoryMode: 'today', currentPositionHistoryVehicleId: selected.id, currentPositionHistoryRange: range, isRouteHistoryLoading: true })
        onPage([first])
        await gate
        this.isRouteHistoryLoading = false; this.currentPositionHistoryComplete = true
      },
      async appendTodayRouteHistory(selected, from, { onPage }) {
        appends.push({ id: selected.id, from })
        this.isRouteHistoryLoading = true
        onPage([first, latest])
        this.isRouteHistoryLoading = false; this.currentPositionHistoryComplete = true
      },
    },
  }
  vm.runInNewContext(code + '\nthis.api = { renderTodayRoute, clearTodayRoute }', state)
  return { state, release, appends, createdLines }
}

const { state, release, appends, createdLines } = scenario()
const initial = state.api.renderTodayRoute()
assert.equal(state.positionHistory.records.value.length, 1)
assert.equal(createdLines.length, 1)
const originalLine = createdLines[0]
await state.api.renderTodayRoute({ append: true, queueIfLoading: true })
await state.api.renderTodayRoute({ append: true, queueIfLoading: true })
assert.equal(appends.length, 0, 'Wait for the initial frozen history request to finish')
assert.equal(state.queuedTodayRouteVehicleId, '1')
release()
await initial
await settle()
assert.equal(appends.length, 1, 'Combine queued clicks into one incremental history refresh')
assert.equal(appends[0].from, first.ts)
assert.equal(createdLines.length, 1, 'Keep the existing polyline attached')
assert.equal(state.todayRoutePolylines[0], originalLine)
assert.deepEqual(originalLine.points.map(point => [point.lat, point.lng]), [[52, 19], [52.001, 19.002]], 'Draw the segment from the previous point to the newest position')
assert.equal(state.positionHistory.records.value.length, 2, 'Deduplicate overlapping history pages')
assert.equal(state.queuedTodayRouteVehicleId, null)

const cancelled = scenario()
const pending = cancelled.state.api.renderTodayRoute()
await cancelled.state.api.renderTodayRoute({ append: true, queueIfLoading: true })
cancelled.state.selectedVehicleId.value = '2'
cancelled.state.api.clearTodayRoute()
cancelled.release()
await pending
await settle()
assert.equal(cancelled.appends.length, 0, 'Do not append a queued route after changing selection')
assert.equal(cancelled.state.queuedTodayRouteVehicleId, null)
console.log('PASS: queued selection refresh extends the existing polyline to the newest point, preserves earlier points, deduplicates pages and ignores cancelled selections.')
