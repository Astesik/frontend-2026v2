import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'
const source = readFileSync(new URL('../src/views/MapView.vue', import.meta.url), 'utf8')
const script = parse(source).descriptor.scriptSetup.content
const ast = ts.createSourceFile('MapView.ts', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const functions = new Set(['routeMarkerInterval', 'syncRoutePointMarkers', 'hideVehicleDetailsDrawer', 'showVehicleDetailsDrawer'])
const nodes = ast.statements.filter(node => ts.isFunctionDeclaration(node) && functions.has(node.name?.text) || ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => declaration.name.getText(ast) === 'ROUTE_DETAIL_POINT_INTERVAL'))
assert.equal(nodes.length, 5)
const code = ts.transpileModule(nodes.map(node => node.getText(ast)).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
function scenario(count, mode) {
  const state = {
    fleetStore: { currentPositionHistorySummary: { sampleCount: count }, currentPositionHistoryComplete: true },
    positionHistory: { records: { value: Array.from({ length: count }, (_, index) => ({ id: index })) }, path: { value: Array.from({ length: count }, (_, index) => ({ lat: 52, lng: 19 + index / 1000 })) }, pathRecordIndexes: { value: Array.from({ length: count }, (_, index) => index) } },
    activeMode: { value: mode }, vehicleDetailsDrawerOpen: { value: true }, selectedVehicleId: { value: '99' },
    renderedRoutePositionCount: count, isRouteRenderComplete: true, todayRoutePointMarkers: new Map(), destroyed: [], api: {},
    createRoutePointMarker(position, recordIndex, kind) { return { position, recordIndex, kind, destroy() { state.destroyed.push(recordIndex) } } },
    clearTodayRoute() { assert.fail('Collapsing details must retain the route') }, clearPositionHistoryData() { assert.fail('Collapsing details must retain the history') },
  }
  vm.runInNewContext(code + '\napi = { routeMarkerInterval, syncRoutePointMarkers, hideVehicleDetailsDrawer, showVehicleDetailsDrawer }', state)
  return state
}
for (const mode of ['list', 'history']) for (const count of [0, 1, 99, 100, 101, 400]) {
  const state = scenario(count, mode)
  state.api.syncRoutePointMarkers()
  const actual = [...state.todayRoutePointMarkers.values()].map(marker => marker.recordIndex)
  const expected = Array.from({ length: count }, (_, index) => index).filter(index => count < 100 || index === 0 || index === count - 1 || index % 3 === 0)
  assert.deepEqual(actual, expected, mode + ' route with ' + count + ' points')
  const last = [...state.todayRoutePointMarkers.values()].at(-1)
  if (count > 1) assert.equal(last.kind, mode === 'history' ? 'end' : 'point')
}
const incomplete = scenario(101, 'history')
incomplete.fleetStore.currentPositionHistoryComplete = false
incomplete.api.syncRoutePointMarkers()
assert.equal([...incomplete.todayRoutePointMarkers.values()].some(marker => marker.recordIndex === 100), false, 'Do not mark an unfinished page as the final route point')
const changing = scenario(99, 'list')
changing.api.syncRoutePointMarkers()
changing.fleetStore.currentPositionHistorySummary.sampleCount = 100
changing.api.syncRoutePointMarkers()
assert.ok(changing.destroyed.length > 0, 'Remove obsolete dense markers when the history reaches 100 points')
const mobile = scenario(101, 'list')
mobile.api.syncRoutePointMarkers()
const points = mobile.positionHistory.records.value, markers = [...mobile.todayRoutePointMarkers.keys()]
mobile.api.hideVehicleDetailsDrawer()
assert.equal(mobile.vehicleDetailsDrawerOpen.value, false)
assert.equal(mobile.selectedVehicleId.value, '99')
assert.equal(mobile.positionHistory.records.value, points)
assert.deepEqual([...mobile.todayRoutePointMarkers.keys()], markers)
mobile.api.showVehicleDetailsDrawer()
assert.equal(mobile.vehicleDetailsDrawerOpen.value, true)
assert.equal(mobile.selectedVehicleId.value, '99')
console.log('PASS: today/history route sampling at 0/1/99/100/101/400 points, endpoints, incomplete pages, dense marker cleanup, mobile collapse/reopen preserving selection and history.')

const live = scenario(101, 'list')
live.fleetStore.currentPositionHistoryMode = 'today'
live.api.syncRoutePointMarkers()
const existingMarkers = new Map(live.todayRoutePointMarkers)
live.fleetStore.isRouteHistoryLoading = true
live.fleetStore.currentPositionHistoryComplete = false
live.api.syncRoutePointMarkers()
for (const [key, marker] of existingMarkers) assert.equal(live.todayRoutePointMarkers.get(key), marker, 'Retain existing route points while new data loads')
live.fleetStore.isRouteHistoryLoading = false
live.fleetStore.currentPositionHistoryComplete = true
live.api.syncRoutePointMarkers()
for (const [key, marker] of existingMarkers) assert.equal(live.todayRoutePointMarkers.get(key), marker, 'Reuse markers after the incremental refresh completes')
assert.deepEqual(live.destroyed, [])
console.log('PASS: today route points remain attached throughout incremental loading and completion.')
