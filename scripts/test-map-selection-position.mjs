import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const source = parse(readFileSync(new URL('../src/views/MapView.vue', import.meta.url), 'utf8')).descriptor.scriptSetup.content
const ast = ts.createSourceFile('MapView.ts', source, ts.ScriptTarget.Latest, true)
const names = new Set(['selectVehicle', 'refreshSelectedVehiclePosition', 'focusVehicle'])
const code = ts.transpileModule(ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.has(node.name?.text)).map(node => node.getText(ast)).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const vehicle = (id, latitude = 52, longitude = 19) => ({ id, hasPosition: true, latitude, longitude })
const calls = [], focused = [], rendered = [], routeRefreshes = []
const state = {
  workspaceActive: { value: true }, activeMode: { value: 'list' }, selectedVehicleId: { value: null },
  vehicleDrawerTab: { value: 'info' }, vehicleDetailsDrawerOpen: { value: false },
  isRepairCreateModalOpen: { value: false }, vignetteDrawerOpen: { value: false },
  selectedVehiclePositionRequestId: 0, authStore: { activeCompanyId: 1 }, googleMap: { value: {} },
  mapSettings: { map: { zoomOnSelect: true } },
  fleetStore: {
    vehicles: [vehicle('1'), vehicle('2')],
    fetchLastPositions(options) { return new Promise((resolve, reject) => calls.push({ options, resolve, reject })) },
  },
  clearTodayRoute() {}, clearPositionHistoryData() {}, collapseVehiclePanelOnMobile() {},
  animatedMapCenter(point) { focused.push({ ...point }) },
  renderMarkers() { rendered.push(state.fleetStore.vehicles.map(item => ({ ...item }))) },
  renderTodayRoute(options) { routeRefreshes.push(options) },
}
vm.runInNewContext(code + '\nthis.api = { selectVehicle, refreshSelectedVehiclePosition }', state)
const settle = () => new Promise(setImmediate)
state.api.selectVehicle('1')
assert.equal(calls.length, 1, 'Clicking must request current positions immediately, before the next polling tick')
assert.equal(calls[0].options.silent, true)
assert.equal(state.selectedVehicleId.value, '1')
assert.equal(state.vehicleDetailsDrawerOpen.value, true)
state.fleetStore.vehicles = [vehicle('1', 53, 20), vehicle('2')]
calls[0].resolve()
await settle()
assert.equal(rendered.at(-1)[0].latitude, 53, 'Redraw the marker at the newly fetched position')
assert.deepEqual(focused.at(-1), { lat: 53, lng: 20 }, 'Center on the fresh position when zoom-on-select is enabled')
assert.equal(routeRefreshes.length, 1, 'Refresh the route together with the selected marker')
assert.equal(routeRefreshes[0].append, true, 'Append the new points without clearing the route')
assert.equal(routeRefreshes[0].queueIfLoading, true, 'Do not lose the route update if initial history is still loading')

state.api.selectVehicle('1')
const focusBeforeUnchanged = focused.length
calls.at(-1).resolve()
await settle()
assert.equal(focused.length, focusBeforeUnchanged, 'Avoid restarting the camera animation when the position is unchanged')

state.api.selectVehicle('1')
const oldSelection = calls.at(-1)
state.api.selectVehicle('2')
const currentSelection = calls.at(-1)
const beforeStale = focused.length
state.fleetStore.vehicles = [vehicle('1', 54), vehicle('2', 55, 21)]
oldSelection.resolve()
await settle()
assert.equal(focused.length, beforeStale, 'A previous click must not move the camera after selecting another vehicle')
currentSelection.resolve()
await settle()
assert.deepEqual(focused.at(-1), { lat: 55, lng: 21 })

state.mapSettings.map.zoomOnSelect = false
state.api.selectVehicle('2')
const beforeNoZoom = focused.length
const rendersBeforeNoZoom = rendered.length
state.fleetStore.vehicles = [vehicle('1'), vehicle('2', 56, 22)]
calls.at(-1).resolve()
await settle()
assert.equal(focused.length, beforeNoZoom)
assert.equal(rendered.length, rendersBeforeNoZoom + 1, 'Move the marker even when automatic centering is disabled')

for (const change of [() => { state.selectedVehicleId.value = null }, () => { state.workspaceActive.value = false }, () => { state.activeMode.value = 'history' }, () => { state.authStore.activeCompanyId++ }]) {
  state.selectedVehicleId.value = '2'; state.workspaceActive.value = true; state.activeMode.value = 'list'
  const pending = state.api.refreshSelectedVehiclePosition('2')
  const before = rendered.length
  change()
  calls.at(-1).resolve()
  await pending
  assert.equal(rendered.length, before, 'Ignore callbacks after closing the drawer, leaving the map, opening history or switching company')
}
state.activeMode.value = 'list'
state.workspaceActive.value = true
state.selectedVehicleId.value = '2'
const beforeError = rendered.length
const failed = state.api.refreshSelectedVehiclePosition('2')
calls.at(-1).reject(new Error('Offline'))
await failed
assert.equal(rendered.length, beforeError, 'Keep the existing marker on request failure')
console.log('PASS: immediate position fetch on selection, marker relocation, camera update, unchanged positions, rapid selections, zoom preference, stale callbacks and failed refresh.')
