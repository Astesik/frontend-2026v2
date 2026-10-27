import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import { parse, compileScript } from '@vue/compiler-sfc'
const require = createRequire(import.meta.url), vue = require('vue'), pinia = require('pinia')
const source = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8')
function load(code, mocks = {}) {
  const exports = {}
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, console, localStorage: { getItem: () => null, setItem() {} }, require: name => mocks[name] || require(name) })
  return exports
}
pinia.setActivePinia(pinia.createPinia())
let requests = 0
const { useFleetStore } = load(source('src/stores/fleetStore.ts'), {
  '@/services/positionService': { positionService: { getLastPositions() { requests++; return Promise.resolve([]) } } },
  '@/services/localPositionHistoryService': {}, '@/utils/historyTime': {}, '@/services/vehicleGroupService': {}, '@/services/vehicleService': {},
})
const fleet = useFleetStore()
const vehicle = { id: 1, licensePlate: 'QA123', description: null, make: null, technicalInspection: null, tachographInspection: null, assignedDeviceId: 46, batteryLevel: 100 }
fleet.apiVehicles = [vehicle, { ...vehicle, id: 2, batteryLevel: null }]
assert.equal(fleet.vehicles[0].batteryLevel, 100, 'Vehicle endpoint supplies battery without GPS')
assert.equal(fleet.vehicles[1].batteryLevel, null, 'Missing battery is unknown')
fleet.lastPositions = [{ vehicleId: 1, deviceId: 46, lat: null, lon: null, batteryLevel: 0 }]
assert.equal(fleet.vehicles[0].batteryLevel, 0, 'Zero battery is preserved, even without coordinates')
assert.equal(fleet.vehicles[1].batteryLevel, null, 'Battery cannot leak to another vehicle')
fleet.lastPositions[0].batteryLevel = 60
assert.equal(fleet.vehicles[0].batteryLevel, 60, 'Existing position refresh updates the reading')
fleet.lastPositions[0].batteryLevel = null
assert.equal(fleet.vehicles[0].batteryLevel, 100, 'Missing position reading falls back to vehicle data')
fleet.lastPositions[0].batteryLevel = 60
fleet.upsertApiVehicle({ ...vehicle, assignedDeviceId: 47, batteryLevel: 42 })
assert.equal(fleet.vehicles[0].batteryLevel, 42, 'Assignment ignores battery from a previously assigned device')
fleet.upsertApiVehicle({ ...vehicle, assignedDeviceId: null, batteryLevel: null })
assert.equal(fleet.vehicles[0].batteryLevel, null, 'Unassignment clears the old device battery')
fleet.lastPositions = []
fleet.upsertApiVehicle({ ...vehicle, batteryLevel: 42 })
assert.equal(fleet.vehicles[0].batteryLevel, 42, 'Vehicle write/assignment response updates the reading')
fleet.upsertApiVehicle({ ...vehicle, batteryLevel: undefined })
assert.equal(fleet.vehicles[0].batteryLevel, null, 'Legacy responses remain supported')
assert.equal(requests, 0, 'Reading battery adds no requests')
const descriptor = parse(source('src/components/vehicles/VehicleBatteryLevel.vue')).descriptor
const component = load(compileScript(descriptor, { id: 'battery-test' }).content).default
const props = vue.reactive({ level: 100 })
const scope = vue.effectScope()
const indicator = scope.run(() => component.setup(props, { expose() {} }))
for (const [value, expected] of [[100, 100], [60, 60], [0, 0], [null, null], [undefined, null], [NaN, null], [Infinity, null], [-1, null], [101, null]]) {
  props.level = value
  assert.equal(indicator.batteryLevel.value, expected, 'Display battery: ' + value)
}
props.level = 100
assert.equal(indicator.batteryIcon.value, require('lucide-vue-next').BatteryFull)
props.level = 0
assert.equal(indicator.batteryIcon.value, require('lucide-vue-next').Battery)
scope.stop()
console.log('PASS: battery API fallback, live position updates, zero/unknown, isolated vehicles, assignment responses, validation and no extra requests.')
