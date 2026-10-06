import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function loadSource(file, mocks = {}) {
  const exports = {}
  const source = readFileSync(new URL('../' + file, import.meta.url), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, Intl, Date, Number, require: (name) => mocks[name] || require(name) })
  return exports
}
const utils = loadSource('src/utils/vehicleReturn.ts')
const columnUtils = loadSource('src/utils/vehicleReturnColumns.ts')
const defaultColumns = jsonColumns(columnUtils.normalizeReturnColumns(null))
function jsonColumns(value) { return JSON.parse(JSON.stringify(value)) }
assert.deepEqual(defaultColumns.filter((item) => item.visible).map((item) => item.key), ['truck', 'trailer', 'returnStation', 'returnDriver', 'departureDriver', 'departureStation', 'started', 'days', 'notes'])
assert.equal(defaultColumns.find((item) => item.key === 'fuel').visible, false)
const normalizedColumns = jsonColumns(columnUtils.normalizeReturnColumns([{key:'fuel',visible:true},{key:'fuel',visible:false},{key:'obsolete',visible:true}]))
assert.equal(normalizedColumns[0].key, 'fuel')
assert.equal(normalizedColumns.filter((item) => item.key === 'fuel').length, 1)
assert.equal(normalizedColumns.length, defaultColumns.length)
assert.equal(utils.returnWeekStart('2026-10-06'), '2026-10-05')
assert.equal(utils.returnWeekStart('2026-10-25'), '2026-10-19')
assert.equal(utils.shiftReturnDate('2026-10-19', 7), '2026-10-26')
assert.ok(utils.returnWeekLabel('2020-12-28').includes('53/2020'))
assert.ok(utils.returnWeekLabel('2021-01-04').includes('1/2021'))

const vehicle = (id = 267) => ({
  id, licensePlate: 'WGM' + id, type: 'TRUCK', status: 'ACTIVE',
  technicalInspection: '2027-01-01', tachographInspection: null,
  currentFuel: { percent: null, liters: null, observedAt: null },
  currentDrivers: [], activeRepairs: [],
})
const entry = {
  id: 15, version: 4, weekStart: '2026-10-05', truck: vehicle(), trailer: null,
  returnDriver: { driverId: 12, source: 'MANUAL', name: 'Jan' },
  departureDriver: null, returnStationStatus: 'PENDING', departureStationStatus: 'DONE',
  notes: 'Keep notes', tripStartedOn: '2026-09-28', returnedAt: '2026-10-05T08:10:31Z',
  daysOnRoad: 8, createdAt: '2026-10-05T08:11:00Z',
}
const json = (value) => JSON.parse(JSON.stringify(value))
const preserved = json(utils.returnEntryWrite(entry))
assert.equal(preserved.notes, entry.notes)
assert.equal(preserved.returnedAt, entry.returnedAt)
assert.ok(!('returnDriver' in preserved))
assert.ok(!('companyId' in preserved))
assert.ok(!('version' in preserved))
const form = utils.newReturnForm(entry.weekStart, entry)
assert.equal(form.returnDriver, 'KEEP')
assert.equal(form.departureDriver, 'NONE')
assert.deepEqual(json(utils.returnFormWrite(form, entry)), { ...preserved, departureDriver: { mode: 'NONE' } })
const emptyDrivers = { ...entry, returnDriver: null, departureDriver: null }
const refillWrite = json(utils.returnFormWrite(utils.newReturnForm(entry.weekStart, emptyDrivers), emptyDrivers))
assert.deepEqual(refillWrite.returnDriver, { mode: 'CURRENT' })
assert.deepEqual(refillWrite.departureDriver, { mode: 'NONE' })
assert.ok(!('technicalInspection' in refillWrite))
form.returnDriver = 'MANUAL_12'
form.departureDriver = 'NONE'
let write = json(utils.returnFormWrite(form, entry))
assert.deepEqual(write.returnDriver, { mode: 'MANUAL', driverId: 12 })
assert.deepEqual(write.departureDriver, { mode: 'NONE' })
form.returnDriver = 'CURRENT_1'
write = json(utils.returnFormWrite(form, entry))
assert.deepEqual(write.returnDriver, { mode: 'CURRENT', slot: 1 })
assert.ok(!('driverId' in write.returnDriver))
const inlineForm = utils.newReturnForm(entry.weekStart, entry)
Object.assign(inlineForm, { truckId: '300', trailerId: '100', returnDriver: 'MANUAL_13', departureDriver: 'MANUAL_14', tripStartedOn: '2026-10-01', notes: 'Po edycji' })
const inlineWrite = json(utils.returnFormWrite(inlineForm, entry))
assert.equal(inlineWrite.truckId, 300)
assert.equal(inlineWrite.trailerId, 100)
assert.deepEqual(inlineWrite.returnDriver, { mode: 'MANUAL', driverId: 13 })
assert.deepEqual(inlineWrite.departureDriver, { mode: 'MANUAL', driverId: 14 })
assert.equal(inlineWrite.tripStartedOn, '2026-10-01')
assert.equal(inlineWrite.notes, 'Po edycji')
assert.equal(inlineWrite.returnedAt, entry.returnedAt)
assert.equal(inlineWrite.departureStationStatus, entry.departureStationStatus)
const created = utils.newReturnForm(entry.weekStart)
created.truckId = '267'
const createWrite = json(utils.returnFormWrite(created))
assert.equal(createWrite.returnedAt, null)
assert.equal(createWrite.tripStartedOn, null)
assert.deepEqual(createWrite.returnDriver, { mode: 'CURRENT' })
assert.deepEqual(createWrite.departureDriver, { mode: 'NONE' })
assert.equal(utils.newReturnForm(entry.weekStart, { ...entry, departureDriver: entry.returnDriver }).departureDriver, 'KEEP')

const presentation = loadSource('src/utils/vehicleReturnPresentation.ts', { './vehicleReturn': { ...utils, businessToday: () => '2026-10-06' } })
assert.equal(presentation.returnDeadlineDays('2026-10-20', 'Europe/Warsaw'), 14)
assert.ok(presentation.returnDeadlineColor(14).includes('danger'))
assert.ok(presentation.returnDeadlineColor(15).includes('warning'))
assert.ok(presentation.returnDeadlineColor(30).includes('secondary'))
assert.equal(presentation.returnDeadlineLabel(-2), '2 dni po terminie')
assert.equal(presentation.returnDeadlines({ ...vehicle(), type: 'TRAILER' }, 'Europe/Warsaw').length, 1)
assert.equal(presentation.returnCreatorLabel({ id: 2, username: 'AKosmala' }), 'AKosmala')
assert.equal(presentation.returnCreatorLabel(2), 'Użytkownik #2')
assert.deepEqual(json(presentation.returnVehicleOptions([
  { ...vehicle(1), licensePlate: 'ZZ123' },
  { ...vehicle(2), licensePlate: 'AA123' },
  { ...vehicle(3), type: 'TRAILER' },
  { ...vehicle(4), status: 'INACTIVE' },
], 'TRUCK', { ...vehicle(5), licensePlate: 'BB123', status: 'INACTIVE' })), [
  { value: '2', label: 'AA123' }, { value: '5', label: 'BB123' }, { value: '1', label: 'ZZ123' },
])

const calls = []
const { vehicleReturnService } = loadSource('src/services/vehicleReturnService.ts', {
  './api': { api: { post: async (...args) => { calls.push(args); return { data: entry } } } },
})
await vehicleReturnService.search(entry.weekStart)
await vehicleReturnService.details(15)
await vehicleReturnService.preview(267, null)
await vehicleReturnService.create(createWrite)
await vehicleReturnService.update(15, 4, preserved)
await vehicleReturnService.delete(15, 4)
assert.deepEqual(calls.map((call) => call[0]), ['search', 'details', 'preview', 'create', 'update', 'delete'].map((suffix) => '/api/vehicle-returns/' + suffix))
assert.deepEqual(json(calls[0][1]), { weekStart: entry.weekStart })
assert.deepEqual(json(calls[2][1]), { truckId: 267, trailerId: null })
assert.deepEqual(json(calls[4][1]), { id: 15, version: 4, data: preserved })
assert.deepEqual(json(calls[5][1]), { id: 15, version: 4 })

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const toasts = [], previews = [], searches = [], positions = []
let updated = { ...entry, version: 5 }
let mutationError = null
let mutations = 0, detailCalls = 0
const { useVehicleReturnStore } = loadSource('src/stores/vehicleReturnStore.ts', {
  pinia: { defineStore: (_, factory) => factory },
  '@/utils/vehicleReturn': utils,
  '@/utils/vehicleReturnColumns': columnUtils,
  '@/services/positionService': { positionService: { getLastPositions: () => { const request = deferred(); positions.push(request); return request.promise } } },
  '@/services/api': { getApiErrorMessage: (cause) => cause.message },
  './uiStore': { useUiStore: () => ({ addToast: (toast) => toasts.push(toast) }) },
  './fleetStore': { useFleetStore: () => ({ apiVehicles: [vehicle()], fetchVehicles: async () => {} }) },
  '@/services/driverService': { driverService: { getDriverSelect: async () => [{ id: 12, label: 'Jan' }] } },
  '@/services/vehicleReturnService': { vehicleReturnService: {
    search: (weekStart) => { const request = deferred(); searches.push({ ...request, weekStart }); return request.promise },
    preview: (truckId) => { const request = deferred(); previews.push({ ...request, truckId }); return request.promise },
    details: async () => { detailCalls++; return updated },
    create: async () => updated,
    update: async () => { mutations++; if (mutationError) throw mutationError; return updated },
    delete: async () => { if (mutationError) throw mutationError },
  } },
})
const store = useVehicleReturnStore()
assert.ok(!('vehicles' in store), 'Vehicle catalog belongs exclusively to fleetStore')
await store.loadDictionaries(true, false)
const oldMap = store.loadMapPositions()
store.clearEditor()
const newMap = store.loadMapPositions()
positions[1].resolve([{ vehicleId: 267, lat: 52, lon: 19 }])
await newMap
positions[0].resolve([{ vehicleId: 999, lat: 51, lon: 18 }])
await oldMap
assert.equal(store.mapPositions.value[0].vehicleId, 267)
store.clearEditor()
assert.equal(store.mapPositions.value.length, 0)
const first = store.loadPreview(1, null)
const second = store.loadPreview(2, null)
previews[1].resolve({ truck: vehicle(2), trailer: null })
await second
previews[0].resolve({ truck: vehicle(1), trailer: null })
await first
assert.equal(store.preview.value.truck.id, 2)
const closing = store.loadPreview(3, null)
store.clearEditor()
previews[2].resolve({ truck: vehicle(3), trailer: null })
await closing
assert.equal(store.preview.value, null)

store.selectedWeekStart.value = entry.weekStart
const weekRequest = store.loadWeek()
searches[0].resolve({ weekStart: entry.weekStart, timezone: 'Europe/Warsaw', entries: [entry] })
await weekRequest
await store.mutate({ ...preserved, returnStationStatus: 'DONE' }, entry)
assert.equal(store.entries.value[0].version, 5)
store.draft.value.notes = 'Unsaved text'
mutationError = Object.assign(new Error('Version conflict'), { isAxiosError: true, response: { status: 409 } })
await assert.rejects(store.mutate(preserved, entry), /Version conflict/)
assert.equal(mutations, 2)
assert.equal(detailCalls, 1)
assert.equal(store.conflict.value.version, 5)
assert.equal(store.draft.value.notes, 'Unsaved text')
mutationError = null
updated = { ...entry, version: 6, weekStart: '2026-10-12' }
await store.mutate({ ...preserved, weekStart: updated.weekStart }, entry)
assert.equal(store.entries.value.length, 0)

store.week.value = { weekStart: entry.weekStart, entries: [entry] }
await store.mutate(null, entry)
assert.equal(store.entries.value.length, 0)
const stale = store.loadWeek()
store.resetApiState()
searches[1].resolve({ weekStart: entry.weekStart, entries: [entry] })
await stale
assert.equal(store.week.value, null)
assert.equal(store.currentEntry.value, null)
assert.equal(store.drivers.value.length, 0)
assert.equal(store.isMutating.value, false)
assert.equal(toasts.filter((toast) => toast.type === 'error').length, 1)
console.log('PASS: columns, ISO weeks/DST, full writes, driver modes, POST contracts, preview/map races, versions, conflicts, moves, deletion and session reset.')
