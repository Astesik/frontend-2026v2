import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'
import { parse, compileScript, compileStyle } from '@vue/compiler-sfc'

const require = createRequire(import.meta.url)
function load(filename, mocks = {}) {
  const source = readFileSync(new URL('../' + filename, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, console, require: name => mocks[name] || require(name) })
  return exports
}
const utils = load('src/utils/vehicleMaintenance.ts')
const readings = utils.mockWheelReadings(new Date('2026-10-19T12:00:00Z'))
assert.equal(readings.length, 6)
assert.equal(new Set(readings.map(wheel => wheel.id)).size, 6)
assert.equal(utils.normalizeWheelReadings([]).length, 6)
assert.ok(utils.normalizeWheelReadings([]).every(wheel => wheel.pressureBar === null && wheel.liningRemainingPct === null))
assert.equal(utils.liningPercentLabel(0), '0%')
assert.equal(utils.liningPercentLabel(100), '100%')
assert.equal(utils.liningPercentLabel(22), '22%')
assert.equal(utils.liningPercentLabel(null), '—')
assert.equal(utils.liningStatus(null), 'unknown')
assert.equal(utils.liningStatus(15), 'alarm')
assert.equal(utils.liningStatus(16), 'warning')
assert.equal(utils.liningStatus(30), 'warning')
assert.equal(utils.liningStatus(31), 'ok')
assert.equal(utils.pressureLabel(null), '- bar')
assert.equal(utils.pressureLabel(0), '0,0 bar')
const invalid = utils.normalizeWheelReadings([{ ...readings[0], id: 'bad', liningRemainingPct: 101, pressureBar: -1, lastReadAt: 'invalid' }])[0]
assert.equal(invalid.id, '1-left')
assert.equal(invalid.liningRemainingPct, null)
assert.equal(invalid.pressureBar, null)
assert.equal(invalid.lastReadAt, null)
assert.equal(utils.serviceIntervalRemaining(utils.mockServiceSchedule(), utils.mockServiceSchedule().intervals[1]), 1650)

const { createPinia, setActivePinia } = require('pinia')
setActivePinia(createPinia())
const { useVehicleMaintenanceStore } = load('src/stores/vehicleMaintenanceStore.ts', { '@/utils/vehicleMaintenance': utils })
const store = useVehicleMaintenanceStore()
store.ensureMock('98', true)
store.ensureMock('99', false)
assert.equal(store.telemetryByVehicleId['98'].source, 'mock')
assert.equal(store.telemetryByVehicleId['99'], undefined, 'No trailer data for trucks')
assert.ok(store.schedulesByVehicleId['99'])
store.selectWheel('98', '2-right')
store.setWheelReadings('98', [{ ...readings[3], liningRemainingPct: 0, pressureBar: 0 }])
assert.equal(store.selectedWheelByVehicleId['98'], '2-right')
assert.equal(store.telemetryByVehicleId['98'].source, 'api')
assert.equal(store.telemetryByVehicleId['98'].wheels[3].liningRemainingPct, 0)
let resolveOld
const old = store.loadWheelReadings('98', () => new Promise(resolve => { resolveOld = resolve }))
await store.loadWheelReadings('98', async () => readings)
resolveOld([]); await old
assert.equal(store.telemetryByVehicleId['98'].wheels[0].liningRemainingPct, 78, 'Latest response wins')
await store.loadWheelReadings('98', async () => { throw new Error('offline') })
assert.ok(store.errorsByVehicleId['98'])
assert.equal(store.telemetryByVehicleId['98'].wheels[0].liningRemainingPct, 78, 'Keep last snapshot on failure')
const pending = store.loadWheelReadings('98', () => new Promise(resolve => { resolveOld = resolve }))
store.resetApiState(); resolveOld(readings); await pending
assert.equal(Object.keys(store.telemetryByVehicleId).length, 0, 'No stale response after session reset')
assert.equal(Object.keys(store.schedulesByVehicleId).length, 0)
assert.equal(Object.keys(store.selectedWheelByVehicleId).length, 0)
const view = readFileSync(new URL('../src/views/VehicleDetailView.vue', import.meta.url), 'utf8')
assert.match(view, /vehicle.type === 'TRAILER' && wheelTelemetry/)
assert.match(view, /AppIconLink class="md:hidden"[^>]*label="Wróć do listy pojazdów"/)
assert.match(view, /<RepairCreateModal[^>]*lock-vehicle quick-report/)
const diagram = parse(readFileSync(new URL('../src/components/vehicles/TrailerAxleDiagram.vue', import.meta.url), 'utf8')).descriptor
const css = compileStyle({ source: diagram.styles[0].content, filename: 'TrailerAxleDiagram.vue', id: 'data-v-test', scoped: true }).code
assert.match(css, /\.dark \.wheel-ok\s*\{/)
assert.match(css, /\.dark \.wheel-warning\s*\{/)
assert.match(css, /\.dark \.wheel-alarm\s*\{/)
assert.doesNotMatch(css, /\.dark\s*\{/, 'Do not put wheel colors on the root dark selector')
const vue = require('vue'), emitted = [], focused = []
const componentCode = ts.transpileModule(compileScript(diagram, { id: 'wheel-test' }).content, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const componentExports = {}
vm.runInNewContext(componentCode, { exports: componentExports, require: name => name === 'vue' ? { ...vue, useId: () => 'wheel-test' } : name === '@/utils/vehicleMaintenance' ? utils : name.endsWith('.vue') ? {} : require(name) })
const props = vue.reactive({ wheels: readings, selectedWheelId: '1-left' })
const component = componentExports.default.setup(props, { expose() {}, emit: (...args) => emitted.push(args) })
assert.equal(component.selected.value.liningRemainingPct, 78)
const event = key => ({ key, preventDefault() {}, currentTarget: { ownerSVGElement: { querySelectorAll: () => Array.from({ length: 6 }, (_, index) => ({ focus: () => focused.push(index) })) } } })
component.handleWheelKey(event('ArrowDown'), 0)
assert.equal(emitted.at(-1)[1], '2-left')
assert.equal(focused.at(-1), 2)
component.handleWheelKey(event('End'), 0)
assert.equal(emitted.at(-1)[1], '3-right')
component.handleWheelKey(event('Enter'), 3)
assert.equal(emitted.at(-1)[1], '2-right')
props.selectedWheelId = '2-right'
assert.equal(component.selectedStatus.value, 'alarm')
props.wheels = [{ ...readings[3], liningRemainingPct: 90, pressureBar: 0 }]
assert.equal(component.selectedStatus.value, 'ok', 'Props update selected details without remounting')
assert.equal(component.selected.value.pressureBar, 0)
assert.equal(component.normalizedWheels.value.length, 6)
const diagramTemplate = diagram.template.content
assert.match(diagramTemplate, /liningPercentLabel\(wheel.liningRemainingPct\)/)
assert.match(diagramTemplate, /liningPercentLabel\(selected.liningRemainingPct\)/)
assert.doesNotMatch(diagramTemplate, /Zużycie|liningWearPct/)
console.log('Vehicle maintenance: six wheels, missing/zero/invalid readings, thresholds, mock/API updates, truck exclusion, race and session reset guards OK.')
