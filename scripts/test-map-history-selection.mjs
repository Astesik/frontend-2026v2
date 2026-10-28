import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'
import { computed, effectScope, nextTick, reactive, ref, watch } from 'vue'

const source = parse(readFileSync(new URL('../src/views/MapView.vue', import.meta.url), 'utf8')).descriptor.scriptSetup.content
const ast = ts.createSourceFile('MapView.ts', source, ts.ScriptTarget.Latest, true)
const nodes = ast.statements.filter(node => {
  if (ts.isVariableStatement(node)) return node.declarationList.declarations.some(item => item.name.getText(ast) === 'mapMarkerVehicles')
  if (ts.isFunctionDeclaration(node)) return ['selectVehicle', 'searchPositionHistory'].includes(node.name?.text)
  if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText(ast) === 'watch') {
    const watched = node.expression.arguments[0]?.getText(ast)
    return ['mapMarkerVehicles', 'activeMode', 'selectedVehicleId', '[() => historyFilters.vehicleId, () => historyFilters.dateFrom, () => historyFilters.dateTo]'].includes(watched)
  }
  return false
})
const code = ts.transpileModule(nodes.map(node => node.getText(ast)).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const vehicles = [{ id: '1', hasPosition: true }, { id: '2', hasPosition: true }, { id: '3', hasPosition: false }]
const renders = [], focused = [], fetches = []
let resolveHistory
let liveRefreshes = 0
const state = {
  computed, watch, activeMode: ref('list'), selectedVehicleId: ref('1'),
  filteredVehicles: ref([vehicles[0]]), historyFilters: reactive({ fleetId: 'all', vehicleId: 'all', preset: '', dateFrom: '2026-10-28T00:00', dateTo: '2026-10-28T12:00' }),
  vehicleDetailsDrawerOpen: ref(true), vehicleDrawerTab: ref('info'), vehiclePanelCollapsed: ref(true), vignetteDrawerOpen: ref(false),
  isRepairCreateModalOpen: ref(false), isPlacePlacementMode: ref(false), historyFormError: ref(''), canReadLocalHistory: ref(true),
  positionHistory: { records: ref([]), clear() { this.records.value = [] }, append(points) { this.records.value = [...this.records.value, ...points] } },
  fleetStore: reactive({
    vehicles, currentPositionHistoryMode: null, currentPositionHistoryVehicleId: null, currentPositionHistoryRange: null,
    currentPositionHistoryComplete: false, isRouteHistoryLoading: false,
    isVehicleInGroup: (group, id) => group === '10' && id === '2',
    clearPositionHistory() { this.currentPositionHistoryMode = null; this.currentPositionHistoryVehicleId = null; this.currentPositionHistoryComplete = false; this.isRouteHistoryLoading = false },
    async fetchPositionHistory(vehicle, from, to, options) {
      fetches.push(vehicle.id)
      this.currentPositionHistoryMode = 'custom'; this.currentPositionHistoryVehicleId = vehicle.id; this.isRouteHistoryLoading = true
      await new Promise(resolve => { resolveHistory = resolve })
      options.onPage([{ id: 1, vehicleId: vehicle.id }])
      this.isRouteHistoryLoading = false; this.currentPositionHistoryComplete = true
    },
  }),
  todayRouteRequestId: 0,
  clearTodayRoute() { state.todayRouteRequestId++ },
  clearPositionHistoryData() { state.positionHistory.clear(); state.fleetStore.clearPositionHistory() },
  renderMarkers() { renders.push(Array.from(state.api.mapMarkerVehicles.value, vehicle => vehicle.id)) },
  renderPlaceOverlays() {}, applyPlacePlacementCursor() {}, collapseVehiclePanelOnMobile() {}, animateHistoryRouteRender() {}, focusPositionHistory() {},
  focusVehicle(vehicle) { focused.push(vehicle.id) }, renderTodayRoute() { liveRefreshes++ }, refreshSelectedVehiclePosition() { liveRefreshes++ },
  historyLocalInstant: value => new Date(value), validateHistoryRange() {}, historyRangeForPreset() {},
  routeHistoryErrorMessage: error => error.message, showRouteHistoryErrorToast(error) { throw error },
}
const scope = effectScope()
scope.run(() => vm.runInNewContext(code + '\nthis.api = { mapMarkerVehicles, selectVehicle, searchPositionHistory }', state))
const ids = () => Array.from(state.api.mapMarkerVehicles.value, vehicle => vehicle.id)
assert.deepEqual(ids(), ['1'], 'Keep regular list filters outside history')
state.activeMode.value = 'history'
await nextTick()
assert.deepEqual(ids(), ['1', '2'], 'Show vehicles with GPS before generating history')
assert.equal(state.vehicleDetailsDrawerOpen.value, false)
state.api.selectVehicle('2')
await nextTick()
assert.equal(state.historyFilters.vehicleId, '2', 'Marker click must select the history vehicle')
assert.equal(state.selectedVehicleId.value, '2')
assert.equal(state.vehicleDetailsDrawerOpen.value, false, 'Never open the live vehicle drawer from history')
assert.equal(state.vehiclePanelCollapsed.value, false, 'Expose the history form after choosing a marker on mobile')
assert.equal(liveRefreshes, 0, 'Do not load a live route or live drawer on history selection')
assert.deepEqual(ids(), ['1', '2'], 'Choosing a vehicle must not hide other markers before generating')

const generating = state.api.searchPositionHistory()
await nextTick()
assert.deepEqual(ids(), ['2'], 'Hide other vehicles when generating the selected route')
assert.deepEqual(renders.at(-1), ['2'], 'Redraw markers immediately even if the selected vehicle ID did not change')
assert.deepEqual(fetches, ['2'])
resolveHistory()
await generating
await nextTick()
assert.deepEqual(ids(), ['2'], 'Keep other vehicles hidden after history completes')
state.fleetStore.vehicles = vehicles.map(vehicle => ({ ...vehicle }))
await nextTick()
assert.deepEqual(ids(), ['2'], 'Polling must not restore other vehicles over the generated route')

state.historyFilters.dateFrom = '2026-10-27T00:00'
await nextTick()
assert.deepEqual(ids(), ['1', '2'], 'Editing the history range resets the route and restores selectable markers')
state.historyFilters.fleetId = '10'
await nextTick()
assert.deepEqual(ids(), ['2'], 'Use the history fleet filter for selectable markers')
state.activeMode.value = 'list'
await nextTick()
assert.deepEqual(ids(), ['1'], 'Restore regular fleet/list filters when leaving history')
assert.equal(state.selectedVehicleId.value, null)
scope.stop()
console.log('PASS: visible history vehicles, marker-to-select interaction without a drawer, mobile form, route generation hiding others, polling, range reset, history fleet filters and returning to the live list.')
