import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'
import { computed, reactive, ref } from 'vue'

const source = readFileSync(new URL('../src/views/MapView.vue', import.meta.url), 'utf8')
const { scriptSetup, template } = parse(source).descriptor
const script = scriptSetup.content
const ast = ts.createSourceFile('MapView.ts', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const names = new Set(['REPAIRS_FLEET_ID', 'NO_SIGNAL_FLEET_ID', 'NO_POSITION_FLEET_ID', 'NO_SIGNAL_AGE_MS', 'POSITION_REFRESH_INTERVAL_MS', 'visibleVehicleTypeGroups', 'vehiclesWithRepairsCount', 'vehiclesWithoutSignalIds', 'vehiclesWithoutPositionIds', 'systemFleetSelectOptions', 'customFleetSelectOptions', 'fleetSelectOptions', 'mapFleetSelectOptions', 'filteredVehicles', 'mapMarkerVehicles', 'activeRepairsByVehicleId', 'lastSeenDrivers', 'selectedVehicleLastSeenDriver', 'ukVignetteRows', 'luxembourgToday', 'luVignetteRows', 'vignetteSections', 'selectedVehicleLifecycleItems'])
const nodes = ast.statements.filter(node =>
  ts.isVariableStatement(node) && node.declarationList.declarations.some(item => names.has(item.name.getText(ast))) ||
  ts.isFunctionDeclaration(node) && ['vehicleHasActiveRepair', 'vehicleDriverLabel', 'vehicleLastSeenDriver', 'formatDateTimeLabel', 'escapeHtml', 'markerLabelHtml', 'vehicleAlertItems', 'positionAgeHours', 'formatSignalAge', 'vehicleUpdateAgeBadge', 'daysUntilDate', 'parseDate', 'formatDateLabel', 'formatDaysLeft', 'resolveDaysVariant'].includes(node.name?.text))
const code = ts.transpileModule(nodes.map(node => node.getText(ast)).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
const vehicle = (id, hasPosition = true, positionTimestamp = null, assignedDeviceId = id) => ({
  id: String(id), backendId: id, plateNumber: `TEST ${id}`, name: 'Pojazd', model: 'Model', rawType: 'TRUCK',
  hasPosition, positionTimestamp, assignedDeviceId,
})
const repairs = ref([
  { id: 1, vehicleId: 1, status: 'new' },
  { id: 2, vehicle: { id: 1 }, status: 'planned' },
  { id: 3, vehicleId: 2, status: 'done' },
  { id: 4, vehicleId: 3, status: 'cancelled' },
  { id: 5, vehicleId: 4, status: 'in_field' },
  { id: 6, vehicleId: 999, status: 'new' },
])
const vignetteExports = {}
const dateExports = {}
function loadUtil(name, exports, dependencies = {}) {
  const file = readFileSync(new URL(`../src/utils/${name}.ts`, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(file, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(compiled, { exports, require: name => dependencies[name] })
}
loadUtil('date', dateExports)
loadUtil('vignette', vignetteExports, { './date': dateExports })
const fetched = []
const now = Date.parse('2026-11-06T12:00:00Z')
const state = {
  ...vignetteExports, computed, repairs, selectedFleetId: ref('status:repairs'), vehicleSearch: ref(''), activeMode: ref('list'),
  positionRefreshNextAt: ref(now + 10_000),
  Date: class extends Date { static now() { return now } },
  fleetStore: reactive({
    vehicles: [
      vehicle(1, true, '2026-10-30T11:59:59Z'), vehicle(2, true, '2026-10-30T12:00:00Z'),
      vehicle(3, false, null, null), vehicle(4, false), vehicle(5, true, '2026-11-06T11:00:00Z'),
    ],
    vehicleTypeGroups: [{ id: 'type:truck', name: 'Ciągniki', vehiclesCount: 3 }, { id: 'type:trailer', name: 'Naczepy', vehiclesCount: 2 }, { id: 'status:inspection-due', name: 'Do przeglądu', vehiclesCount: 1 }],
    vehicleGroups: [{ id: '10', name: 'Flota', vehiclesCount: 1 }],
    isVehicleInGroup: (group, id) => group === '10' && id === '5',
    fetchVehicleGroup: id => fetched.push(id),
  }),
  selectedVehicle: ref(null),
  mapSettings: { map: { showMarkerLabels: true, showMarkerDriver: true, showVehicleDescriptions: false } },
  lastDriverInfoIconSvg: '<svg class="icon-tabler-history" aria-hidden="true"></svg>',
  sortVehicles: values => values, localStorage: { setItem() {} }, selectedFleetStorageKey: () => 'fleet',
}
vm.runInNewContext(code + '\nthis.result = { filteredVehicles, mapMarkerVehicles, fleetSelectOptions, mapFleetSelectOptions, vehicleAlertItems, vehicleUpdateAgeBadge, selectedVehicleLastSeenDriver, markerLabelHtml, vignetteSections, selectedVehicleLifecycleItems }', state)
const ids = () => Array.from(state.result.filteredVehicles.value, item => item.id)
assert.deepEqual(ids(), ['1', '4'], 'Include active repairs once per known vehicle, including vehicles without GPS')
assert.deepEqual(Array.from(state.result.mapMarkerVehicles.value, item => item.id), ['1'])
assert.equal(state.result.mapFleetSelectOptions.value[4].label, 'Naprawy (2)')
const menuLabels = () => Array.from(state.result.mapFleetSelectOptions.value, option => option.menuLabel ?? option.label)
assert.deepEqual(menuLabels(), [
  '1. Wszystkie pojazdy', '2. Ciągniki (3)', '3. Naczepy (2)', '4. Do przeglądu (1)',
  '5. Naprawy (2)', '6. Brak sygnału >7 dni (1)', '7. Brak urządzenia lub pozycji (2)', 'Flota (1)',
])
assert.equal(state.result.mapFleetSelectOptions.value[0].label, 'Wszystkie pojazdy')
assert.equal(state.result.fleetSelectOptions.value[0].label, 'Wszystkie pojazdy')
assert.ok(state.result.fleetSelectOptions.value.every(option => option.menuLabel === undefined))
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
state.onFleetChange('status:no-signal-7d')
state.onFleetChange('status:no-position')
state.onFleetChange('type:truck')
assert.deepEqual(fetched, [], 'Local status filters must not request a server fleet')
state.onFleetChange('10')
assert.deepEqual(fetched, ['10'])
console.log('PASS: repairs filter, unique vehicle count, status updates, search, GPS markers, existing fleets and no synthetic fleet request.')

state.fleetStore.vehicleTypeGroups[0].vehiclesCount = 0
state.fleetStore.vehicleTypeGroups[2].vehiclesCount = 0
assert.deepEqual(Array.from(state.result.mapFleetSelectOptions.value, option => option.value), ['all', 'type:trailer', 'status:repairs', 'status:no-signal-7d', 'status:no-position', '10'])
assert.deepEqual(menuLabels(), ['1. Wszystkie pojazdy', '2. Naczepy (2)', '3. Naprawy (1)', '4. Brak sygnału >7 dni (1)', '5. Brak urządzenia lub pozycji (2)', 'Flota (1)'])
repairs.value[4].status = 'done'
assert.deepEqual(Array.from(state.result.mapFleetSelectOptions.value, option => option.value), ['all', 'type:trailer', 'status:no-signal-7d', 'status:no-position', '10'], 'Hide repairs when no known vehicle has an active repair')
state.fleetStore.vehicleTypeGroups[1].vehiclesCount = 0
assert.deepEqual(Array.from(state.result.mapFleetSelectOptions.value, option => option.value), ['all', 'status:no-signal-7d', 'status:no-position', '10'])
state.fleetStore.vehicleTypeGroups[0].vehiclesCount = 1
assert.ok(state.result.mapFleetSelectOptions.value.some(option => option.value === 'type:truck'), 'Show categories again when vehicles become available')
const categoryWatcher = ast.statements.find(node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) && node.expression.expression.getText(ast) === 'watch' && node.expression.arguments[0]?.getText(ast) === 'mapFleetSelectOptions')
const categoryCallback = ts.transpileModule('const onCategoryChange = ' + categoryWatcher.expression.arguments[1].getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
vm.runInNewContext(categoryCallback + '\nthis.onCategoryChange = onCategoryChange', state)
state.selectedFleetId.value = 'status:repairs'
state.onCategoryChange([{ value: 'all' }], [{ value: 'all' }, { value: 'status:repairs' }])
assert.equal(state.selectedFleetId.value, 'all', 'Return to all vehicles when the selected category becomes empty')
console.log('PASS: hide/show empty categories and restore all vehicles when the active category disappears.')

const noSignalLabel = () => state.result.mapFleetSelectOptions.value.find(option => option.value === 'status:no-signal-7d').label
state.selectedFleetId.value = 'status:no-signal-7d'
assert.equal(noSignalLabel(), 'Brak sygnału >7 dni (1)')
assert.deepEqual(ids(), ['1'], 'Require a valid last position strictly older than seven days')
assert.deepEqual(Array.from(state.result.mapMarkerVehicles.value, item => item.id), ['1'])
state.positionRefreshNextAt.value += 10_000
assert.deepEqual(ids(), ['1', '2'], 'Recheck the age on every map refresh')
assert.equal(noSignalLabel(), 'Brak sygnału >7 dni (2)')
state.vehicleSearch.value = 'TEST 2'
assert.deepEqual(ids(), ['2'], 'The search still applies inside the no-signal list')
state.vehicleSearch.value = ''
for (const item of state.fleetStore.vehicles.slice(0, 2)) item.positionTimestamp = '2026-11-06T12:00:00Z'
assert.deepEqual(ids(), [], 'A recent reading removes the vehicle from the list')
assert.equal(noSignalLabel(), 'Brak sygnału >7 dni (0)')
console.log('PASS: live no-signal list, strict seven-day threshold, unknown dates, polling, search and count.')

state.selectedFleetId.value = 'status:no-position'
assert.deepEqual(ids(), ['3', '4'], 'Include both unassigned vehicles and devices without a position')
assert.deepEqual(Array.from(state.result.mapMarkerVehicles.value), [])
state.vehicleSearch.value = 'TEST 4'
assert.deepEqual(ids(), ['4'])
state.vehicleSearch.value = ''
state.fleetStore.vehicles[3].hasPosition = true
assert.deepEqual(ids(), ['3'])
assert.equal(state.result.mapFleetSelectOptions.value.find(option => option.value === 'status:no-position').label, 'Brak urządzenia lub pozycji (1)')
console.log('PASS: missing device or position category, count, search and live updates.')

const lastSeenDriver = { cardId: '123', firstName: 'Jan', lastName: 'Kowalski', seenAt: '2026-11-05T12:00:00Z' }
state.fleetStore.vehicles[0].lastSeenDriver = lastSeenDriver
state.selectedVehicle.value = state.fleetStore.vehicles[0]
const markerLabel = () => state.result.markerLabelHtml(state.selectedVehicle.value)
assert.equal(state.result.selectedVehicleLastSeenDriver.value.label, 'Jan Kowalski')
assert.equal(state.result.selectedVehicleLastSeenDriver.value.seenAt, lastSeenDriver.seenAt)
assert.match(markerLabel(), /Jan Kowalski/)
assert.match(markerLabel(), /title="Ostatni odczyt: [^"]+"/)
assert.match(markerLabel(), /icon-tabler-history/)
assert.match(template.content, /#driver="\{ vehicle \}"[\s\S]+?:title="lastSeenDrivers.get\(vehicle.id\)\?\.description"/)
assert.match(template.content, /Ostatni odczyt: <time :datetime="selectedVehicleLastSeenDriver.seenAt"/)
state.selectedFleetId.value = 'all'
state.vehicleSearch.value = 'Kowalski'
assert.deepEqual(ids(), ['1'], 'The visible last-seen driver can be found in the list')
state.vehicleSearch.value = ''
state.mapSettings.map.showMarkerDriver = false
assert.doesNotMatch(markerLabel(), /Jan Kowalski|icon-tabler-history/)
state.mapSettings.map.showMarkerDriver = true
state.selectedVehicle.value.lastSeenDriver.firstName = '<Jan>'
assert.match(markerLabel(), /&lt;Jan&gt; Kowalski/, 'Marker HTML escapes provider data')
state.selectedVehicle.value.lastSeenDriver.firstName = null
state.selectedVehicle.value.lastSeenDriver.lastName = null
assert.equal(state.result.selectedVehicleLastSeenDriver.value.label, '123')
state.selectedVehicle.value.driverName = 'Bieżący kierowca'
assert.equal(state.result.selectedVehicleLastSeenDriver.value, null)
assert.match(markerLabel(), /Bieżący kierowca/)
assert.doesNotMatch(markerLabel(), /Ostatni odczyt|icon-tabler-history/)
state.selectedVehicle.value.vehicleType = 'trailer'
assert.equal(state.result.selectedVehicleLastSeenDriver.value, null)
assert.doesNotMatch(markerLabel(), /Bieżący kierowca|icon-tabler-history/)
console.log('PASS: driver fallback, list search, marker icon and timestamp, drawer date, current driver priority and trailers.')

const gpsAlertFor = (positionTimestamp) => state.result.vehicleAlertItems({ backendId: 50, alerts: [], positionTimestamp })[0]
assert.equal(gpsAlertFor(null)?.id, 'gps-no-position')
assert.equal(gpsAlertFor('invalid')?.title, 'Brak pozycji GPS')
assert.equal(gpsAlertFor('2026-11-05T12:00:00Z')?.id, 'gps-offline')
assert.equal(gpsAlertFor('2026-11-05T12:00:01Z'), undefined)
console.log('PASS: missing GPS position and stale GPS signal produce distinct alerts.')

const badgeFor = positionTimestamp => state.result.vehicleUpdateAgeBadge({ positionTimestamp }, now)
assert.equal(badgeFor(null), null)
assert.equal(badgeFor('invalid'), null)
assert.equal(badgeFor('2026-11-06T09:00:00Z'), null, 'Show the badge only after three hours')
for (const [timestamp, label, variant] of [
  ['2026-11-06T08:59:59Z', '3h', 'warning'],
  ['2026-11-05T12:00:01Z', '23h', 'warning'],
  ['2026-11-05T12:00:00Z', '1d', 'error'],
  ['2026-11-03T11:00:00Z', '3d', 'error'],
]) {
  const badge = badgeFor(timestamp)
  assert.equal(badge?.label, label)
  assert.equal(badge?.variant, variant)
}
console.log('PASS: drawer GPS age badge threshold, hour/day formatting and severity.')

state.fleetStore.vehicles = [
  { ...vehicle(1), vehicleType: 'truck', countryCode: 'GB', vignetteUk: null },
  { ...vehicle(9), vehicleType: 'truck', countryCode: 'GB', vignetteUk: '2026-11-10' },
  { ...vehicle(2), vehicleType: 'truck', countryCode: 'PL', vignetteLuxembourgFrom: '2026-11-16', vignetteLuxembourgTo: '2026-11-16' },
  { ...vehicle(3), vehicleType: 'truck', countryCode: 'LU', vignetteLuxembourgFrom: '2026-11-17', vignetteLuxembourgTo: '2026-11-17' },
  { ...vehicle(4), vehicleType: 'truck', countryCode: 'LU', vignetteLuxembourgFrom: null, vignetteLuxembourgTo: null },
  { ...vehicle(5), vehicleType: 'truck', countryCode: 'PL', vignetteLuxembourgFrom: '2026-11-01', vignetteLuxembourgTo: '2026-11-10' },
  { ...vehicle(6), vehicleType: 'trailer', rawType: 'TRAILER', countryCode: 'LU', vignetteLuxembourgFrom: '2026-11-15', vignetteLuxembourgTo: '2026-11-17' },
  { ...vehicle(7), vehicleType: 'truck', countryCode: 'LU', vignetteLuxembourgFrom: '2026-11-14', vignetteLuxembourgTo: '2026-11-15' },
  { ...vehicle(8), vehicleType: 'truck', rawType: 'CAR', countryCode: 'LU', vignetteLuxembourgFrom: '2026-11-15', vignetteLuxembourgTo: '2026-11-17' },
]
const vignetteRows = country => Array.from(state.result.vignetteSections.value.find(section => section.country === country).rows,
  row => [row.vehicleId, row.dateLabel, row.statusLabel])
state.positionRefreshNextAt.value = Date.parse('2026-11-15T22:59:59Z') + 10_000
assert.deepEqual(vignetteRows('GB'), [
  ['1', null, 'Brak winiety'],
  ['9', '10.11.2026', 'Po terminie'],
])
assert.deepEqual(vignetteRows('LU'), [
  ['4', null, 'Brak winiety'],
  ['3', '17.11.2026', 'Jeszcze nieważna'],
  ['2', '16.11.2026', 'Jeszcze nieważna'],
  ['7', '14.11.2026 – 15.11.2026', 'Ważna'],
])
state.positionRefreshNextAt.value = Date.parse('2026-11-15T23:00:00Z') + 10_000
assert.deepEqual(vignetteRows('LU'), [
  ['4', null, 'Brak winiety'],
  ['7', '14.11.2026 – 15.11.2026', 'Nieważna'],
  ['3', '17.11.2026', 'Jeszcze nieważna'],
  ['2', '16.11.2026', 'Ważna'],
])
assert.match(state.result.vignetteSections.value[0].description, /Wielkiej Brytanii/)
assert.match(state.result.vignetteSections.value[1].description, /przyszłą winietą dla Luksemburga/)
assert.match(template.content, /params: \{ id: selectedVehicle.backendId \}/)

state.selectedVehicle.value = state.fleetStore.vehicles.find(vehicle => vehicle.id === '7')
const lifecycleItems = () => Array.from(state.result.selectedVehicleLifecycleItems.value)
assert.deepEqual(lifecycleItems().map(item => item.label), ['Przegląd techniczny', 'Tachograf', 'Winieta Wielka Brytania', 'Winieta Luksemburg'])
assert.equal(lifecycleItems().at(-1).daysLabel, 'Nieważna')
assert.equal(lifecycleItems().at(-1).dateLabel, '14.11.2026 – 15.11.2026')
state.selectedVehicle.value = state.fleetStore.vehicles.find(vehicle => vehicle.id === '4')
assert.equal(lifecycleItems().at(-1).daysLabel, 'Brak winiety')
state.selectedVehicle.value = state.fleetStore.vehicles.find(vehicle => vehicle.id === '6')
assert.deepEqual(lifecycleItems().map(item => item.label), ['Przegląd techniczny'])
console.log('PASS: GB and LU panel eligibility, future and expired ranges, Luxembourg midnight, drawer status and vehicle shortcut.')
