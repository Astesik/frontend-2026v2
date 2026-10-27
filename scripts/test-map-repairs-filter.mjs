import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'
import { computed, reactive, ref } from 'vue'

const source = readFileSync(new URL('../src/views/MapView.vue', import.meta.url), 'utf8')
const script = parse(source).descriptor.scriptSetup.content
const ast = ts.createSourceFile('MapView.ts', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const names = new Set(['REPAIRS_FLEET_ID', 'visibleVehicleTypeGroups', 'vehiclesWithRepairsCount', 'fleetSelectOptions', 'mapFleetSelectOptions', 'filteredVehicles', 'mapMarkerVehicles', 'activeRepairsByVehicleId'])
const nodes = ast.statements.filter(node =>
  ts.isVariableStatement(node) && node.declarationList.declarations.some(item => names.has(item.name.getText(ast))) ||
  ts.isFunctionDeclaration(node) && node.name?.text === 'vehicleHasActiveRepair')
const code = ts.transpileModule(nodes.map(node => node.getText(ast)).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const vehicle = (id, hasPosition = true) => ({ id: String(id), backendId: id, plateNumber: `TEST ${id}`, name: 'Pojazd', model: 'Model', hasPosition })
const repairs = ref([
  { id: 1, vehicleId: 1, status: 'new' },
  { id: 2, vehicle: { id: 1 }, status: 'planned' },
  { id: 3, vehicleId: 2, status: 'done' },
  { id: 4, vehicleId: 3, status: 'cancelled' },
  { id: 5, vehicleId: 4, status: 'in_field' },
  { id: 6, vehicleId: 999, status: 'new' },
])
const fetched = []
const state = {
  computed, repairs, selectedFleetId: ref('status:repairs'), vehicleSearch: ref(''), activeMode: ref('list'),
  fleetStore: reactive({
    vehicles: [vehicle(1), vehicle(2), vehicle(3), vehicle(4, false), vehicle(5)],
    vehicleTypeGroups: [{ id: 'type:truck', name: 'Ciągniki', vehiclesCount: 3 }, { id: 'type:trailer', name: 'Naczepy', vehiclesCount: 2 }, { id: 'status:inspection-due', name: 'Do przeglądu', vehiclesCount: 1 }],
    vehicleGroups: [{ id: '10', name: 'Flota', vehiclesCount: 1 }],
    isVehicleInGroup: (group, id) => group === '10' && id === '5',
    fetchVehicleGroup: id => fetched.push(id),
  }),
  vehicleDriverLabel: () => '', sortVehicles: values => values, localStorage: { setItem() {} }, selectedFleetStorageKey: () => 'fleet',
}
vm.runInNewContext(code + '\nthis.result = { filteredVehicles, mapMarkerVehicles, mapFleetSelectOptions }', state)
const ids = () => Array.from(state.result.filteredVehicles.value, item => item.id)
assert.deepEqual(ids(), ['1', '4'], 'Include active repairs once per known vehicle, including vehicles without GPS')
assert.deepEqual(Array.from(state.result.mapMarkerVehicles.value, item => item.id), ['1'])
assert.equal(state.result.mapFleetSelectOptions.value[4].label, 'Naprawy (2)')
state.vehicleSearch.value = 'TEST 4'
assert.deepEqual(ids(), ['4'])
state.vehicleSearch.value = ''
repairs.value[0].status = 'done'
repairs.value[1].status = 'cancelled'
assert.deepEqual(ids(), ['4'], 'React to repair status changes')
assert.equal(state.result.mapFleetSelectOptions.value[4].label, 'Naprawy (1)')
state.selectedFleetId.value = 'all'
assert.equal(ids().length, 5)
state.selectedFleetId.value = '10'
assert.deepEqual(ids(), ['5'], 'Keep existing custom fleet filtering')
const watcher = ast.statements.find(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText(ast) === 'watch' && node.expression.arguments[0]?.getText(ast) === 'selectedFleetId')
const callback = ts.transpileModule('const onFleetChange = ' + watcher.expression.arguments[1].getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
vm.runInNewContext(callback + '\nthis.onFleetChange = onFleetChange', state)
state.onFleetChange('status:repairs')
assert.deepEqual(fetched, [], 'The local repairs filter must not request a server fleet')
state.onFleetChange('10')
assert.deepEqual(fetched, ['10'])
console.log('PASS: repairs filter, unique vehicle count, status updates, search, GPS markers, existing fleets and no synthetic fleet request.')

state.fleetStore.vehicleTypeGroups[0].vehiclesCount = 0
state.fleetStore.vehicleTypeGroups[2].vehiclesCount = 0
assert.deepEqual(Array.from(state.result.mapFleetSelectOptions.value, option => option.value), ['all', 'type:trailer', 'status:repairs', '10'], 'Hide empty categories while retaining the repairs option and custom fleets')
repairs.value[4].status = 'done'
assert.deepEqual(Array.from(state.result.mapFleetSelectOptions.value, option => option.value), ['all', 'type:trailer', '10'], 'Hide repairs when no known vehicle has an active repair')
state.fleetStore.vehicleTypeGroups[1].vehiclesCount = 0
assert.deepEqual(Array.from(state.result.mapFleetSelectOptions.value, option => option.value), ['all', '10'])
state.fleetStore.vehicleTypeGroups[0].vehiclesCount = 1
assert.ok(state.result.mapFleetSelectOptions.value.some(option => option.value === 'type:truck'), 'Show categories again when vehicles become available')
const categoryWatcher = ast.statements.find(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText(ast) === 'watch' && node.expression.arguments[0]?.getText(ast) === 'mapFleetSelectOptions')
const categoryCallback = ts.transpileModule('const onCategoryChange = ' + categoryWatcher.expression.arguments[1].getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
vm.runInNewContext(categoryCallback + '\nthis.onCategoryChange = onCategoryChange', state)
state.selectedFleetId.value = 'status:repairs'
state.onCategoryChange([{ value: 'all' }], [{ value: 'all' }, { value: 'status:repairs' }])
assert.equal(state.selectedFleetId.value, 'all', 'Return to all vehicles when the selected category becomes empty')
console.log('PASS: hide/show empty categories and restore all vehicles when the active category disappears.')
