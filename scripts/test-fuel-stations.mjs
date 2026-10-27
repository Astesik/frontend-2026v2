import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const { createPinia, setActivePinia } = require('pinia')
const storage = new Map()
function load(file, mocks = {}) {
  const exports = {}
  const code = ts.transpileModule(readFileSync(new URL('../' + file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { exports, FormData, File, console, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }, require: name => mocks[name] || require(name) })
  return exports
}
const utils = load('src/utils/fuelStation.ts')
const station = (id, currency = 'EUR', price = 1.5) => ({ id, active: true, provider: 'IDS', stationCode: 'ST' + id, stationName: 'Station ' + id, country: 'Poland', lat: 51, lng: 19, latestPrice: { id, priceDate: '2026-10-06', priceBase: 1.7, priceFinal: price, vat: 23, currency } })
const data = [station(1), station(2, 'PLN', 1.4), station(3, 'EUR', null), { ...station(4), lat: null }, { ...station(5), lat: 0, lng: 0 }]
const filters = { countries: null, currency: 'EUR', minPrice: '', maxPrice: '' }
assert.equal(utils.filterMapFuelStations(data, filters).length, 4)
assert.equal(utils.filterMapFuelStations([{ ...station(1), active: false }], filters).length, 0)
assert.deepEqual(Array.from(utils.filterMapFuelStations(data, { ...filters, maxPrice: '1.500' }), s => s.id), [1, 5])
assert.equal(utils.filterMapFuelStations(data, { ...filters, minPrice: '2', maxPrice: '1' }).length, 0)
assert.equal(utils.filterMapFuelStations(data, { ...filters, countries: ['Belgium'] }).length, 0)
assert.equal(utils.filterMapFuelStations(data, { ...filters, countries: [] }).length, 0)
assert.equal(utils.filterMapFuelStations(data, { ...filters, countries: ['Poland'] }).length, 4)
const mixedCountries = [...data, { ...station(6), country: 'Belgium' }, { ...station(7), country: 'Germany' }]
assert.equal(utils.filterMapFuelStations(mixedCountries, { ...filters, countries: ['Poland', 'Belgium'] }).length, 5)
const json = value => JSON.parse(JSON.stringify(value))
assert.deepEqual(json(utils.readFuelStationMapPreferences({ country: 'Belgium', enabled: true })).countries, ['Belgium'])
assert.equal(utils.readFuelStationMapPreferences({ country: '' }).countries, null)
assert.deepEqual(json(utils.readFuelStationMapPreferences({ countries: [], country: 'Poland' })).countries, [])
assert.deepEqual(json(utils.readFuelStationMapPreferences({ countries: ['Belgium', 'Poland', 'Belgium'] })).countries, ['Belgium', 'Poland'])
assert.equal(utils.readFuelStationMapPreferences({ countries: [123] }).countries, null)
assert.equal(utils.readFuelStationMapPreferences(null).currency, 'EUR')
assert.equal(utils.formatFuelPrice(null), '—')
assert.equal(utils.formatFuelPrice(1.2, 'EUR'), '1,200 EUR')
assert.equal(utils.validateStationImport({ name: 'prices.XLSX', size: 5 * 1024 * 1024 }), null)
assert.ok(utils.validateStationImport({ name: 'prices.xls', size: 100 }))
assert.ok(utils.validateStationImport({ name: 'prices.xlsx', size: 5 * 1024 * 1024 + 1 }))
assert.ok(utils.validateStationImport({ name: 'prices.xlsx', size: 0 }))
const auth = require('vue').reactive({ isAuthenticated: true, activeCompanyId: '1', admin: false, permissions: [], hasActiveCompanyRole(role) { return role === 'COMPANY_ADMIN' && this.admin }, hasActiveCompanyPermission(code) { return this.permissions.includes(code) } })
const permissions = load('src/composables/useFuelStationPermissions.ts', { '@/stores/authStore': { useAuthStore: () => auth } }).useFuelStationPermissions()
auth.permissions = ['company.manage']
assert.equal(permissions.canRead.value, false)
auth.permissions = ['fuel_stations.read']
assert.equal(permissions.canRead.value, true)
assert.equal(permissions.canImport.value, false)
auth.admin = true
assert.equal(permissions.canImport.value, true)
auth.isAuthenticated = false
assert.equal(permissions.canManage.value, false)

const calls = []
const api = Object.fromEntries(['get', 'post', 'patch'].map(method => [method, async (...args) => { calls.push({ method, args }); return { data: { ok: true } } }]))
const service = load('src/services/fuelStationService.ts', { './api': { api } }).fuelStationService
await service.importFile('IDS', new File(['xlsx'], 'prices.xlsx'))
assert.equal(calls[0].args[0], '/api/fuel-stations/import')
assert.ok(calls[0].args[1] instanceof FormData)
assert.equal(calls[0].args[1].get('provider'), 'IDS')
assert.equal(calls[0].args[1].get('file').name, 'prices.xlsx')
assert.equal(calls[0].args[2].headers, undefined)
await service.search({ page: 0, size: 25, country: 'Belgium' })
assert.equal(calls[1].args[0], '/api/fuel-stations/search')
await service.prices(7, '2026-10-01', '2026-10-07')
assert.equal(calls[2].args[1].params.from, '2026-10-01')
await service.search({ page: 0, size: 25, active: false })
assert.equal(calls.at(-1).args[1].active, false)
await service.setActive(12, false)
assert.equal(calls.at(-1).args[0], '/api/fuel-stations/12')
assert.deepEqual(json(calls.at(-1).args[1]), { active: false })
await service.setActiveBulk([12, 34], false)
assert.equal(calls.at(-1).args[0], '/api/fuel-stations/active')
assert.deepEqual(json(calls.at(-1).args[1]), { stationIds: [12, 34], active: false })

const toasts = [], pages = [], writes = []
let search = async body => { pages.push(body.page); return { items: Array.from({ length: body.page === 0 ? 200 : 5 }, (_, i) => station(body.page * 200 + i + 1)), totalElements: 205 } }
let history = async () => []
const mockService = { providers: async () => [{ code: 'IDS', importSupported: true }], countries: async () => [], search: body => search(body), prices: (...args) => history(...args), update: async (id, body) => { writes.push({ id, body }); return station(id) }, create: async body => body }
setActivePinia(createPinia())
const useFuelStationStore = load('src/stores/fuelStationStore.ts', { '@/services/fuelStationService': { fuelStationService: mockService }, '@/services/api': { getApiErrorMessage: e => e.message }, './uiStore': { useUiStore: () => ({ addToast: t => toasts.push(t) }) }, '@/utils/fuelStation': utils }).useFuelStationStore
const store = useFuelStationStore()
store.ensureCompany('1')
await Promise.all([store.loadMapStations(), store.loadMapStations()])
assert.deepEqual(pages, [0, 1])
assert.equal(store.allStations.length, 205)
store.mapEnabled = true
assert.equal(store.visibleMapStations.length, 205)
store.mapEnabled = false
assert.equal(store.visibleMapStations.length, 0)
await store.saveStation({ provider: 'IDS', stationCode: 'ST1', stationName: 'Edited', country: 'Poland', lat: 51, lng: 19 }, 1)
assert.equal('provider' in writes[0].body, false)
let resolve
search = () => new Promise(r => { resolve = r })
const pending = store.loadMapStations(true)
store.resetApiState()
resolve({ items: [station(999)], totalElements: 1 })
await pending
assert.equal(store.allStations.length, 0)
assert.equal(store.stations.length, 0)
store.ensureCompany('2')
search = async () => ({ items: [], totalElements: 0 })
history = () => new Promise(r => { resolve = r })
const oldHistory = store.loadHistory(station(1))
store.closeHistory()
resolve([{ id: 1 }])
await oldHistory
assert.equal(store.prices.length, 0)
assert.equal(store.selectedStation, null)
history = async () => { throw new Error('Backend message') }
await store.loadHistory(station(2))
assert.equal(store.historyError, 'Backend message')
assert.equal(toasts.at(-1).type, 'error')
store.historyDates.from = '2026-10-07'; store.historyDates.to = '2026-10-01'
await store.loadHistory(station(3))
assert.ok(store.historyError.includes('Data od'))
store.resetApiState()
assert.equal(store.historyDates.from, '')
assert.equal(store.prices.length, 0)
Object.assign(store.filters, { provider: 'IDS', country: 'Poland', q: 'Warszawa', size: 50 })
Object.assign(store.mapFilters, { countries: ['Poland', 'Belgium'], currency: 'PLN', minPrice: '4', maxPrice: '7' })
store.mapEnabled = true
await require('vue').nextTick()
const restored = useFuelStationStore(createPinia())
restored.ensureCompany('2')
assert.equal(restored.filters.provider, 'IDS')
assert.equal(restored.filters.country, 'Poland')
assert.equal(restored.filters.q, 'Warszawa')
assert.equal(restored.filters.size, 50)
assert.deepEqual(json(restored.mapFilters.countries), ['Poland', 'Belgium'])
assert.equal(restored.mapFilters.currency, 'PLN')
assert.equal(restored.mapFilters.minPrice, '4')
assert.equal(restored.mapFilters.maxPrice, '7')
assert.equal(restored.mapEnabled, true)
restored.mapFilters.countries = []
await require('vue').nextTick()
const emptySelection = useFuelStationStore(createPinia())
assert.deepEqual(json(emptySelection.mapFilters.countries), [])
store.ensureCompany('activity-test')
Object.assign(store.mapFilters, { countries: null, currency: 'EUR', minPrice: '', maxPrice: '' })
store.mapEnabled = true
let dataset = Array.from({ length: 11 }, (_, i) => station(i + 1)), activityBody
search = async body => {
  activityBody = body
  const matches = dataset.filter(item => body.active == null || item.active === body.active)
  return { items: matches.slice(body.page * body.size, (body.page + 1) * body.size), totalElements: matches.length }
}
mockService.setActive = async (id, active) => { dataset = dataset.map(item => item.id === id ? { ...item, active } : item); return dataset.find(item => item.id === id) }
mockService.setActiveBulk = async (ids, active) => {
  const updatedCount = dataset.filter(item => ids.includes(item.id) && item.active !== active).length
  dataset = dataset.map(item => ids.includes(item.id) ? { ...item, active } : item)
  return { active, requestedCount: ids.length, updatedCount, stationIds: [...ids].sort((a,b) => a-b) }
}
Object.assign(store.filters, { provider: '', country: '', q: '', active: 'active', size: 10, page: 2 })
await store.loadStations()
assert.equal(activityBody.active, true)
assert.equal(store.stations[0].id, 11)
assert.equal(await store.setStationActive(11, false), true)
assert.equal(store.filters.page, 1)
assert.equal(store.total, 10)
assert.equal(store.stations.length, 10)
assert.equal(store.visibleMapStations.some(item => item.id === 11), false)
store.filters.active = 'inactive'; await store.loadStations()
assert.equal(activityBody.active, false)
assert.equal(store.stations[0].id, 11)
store.selectPage(true)
assert.deepEqual(json(store.selectedIds), [11])
assert.equal(await store.setSelectedActive(true), true)
assert.equal(store.total, 0)
assert.equal(store.selectedIds.length, 0)
assert.equal(store.visibleMapStations.some(item => item.id === 11), true)
store.filters.active = 'all'; await store.loadStations()
store.toggleSelection(1, true)
assert.equal(await store.setSelectedActive(true), true)
assert.equal(store.selectedIds.length, 0)
assert.match(toasts.at(-1).message, /Zmieniono: 0/)
store.filters.active = 'all'; await store.loadStations()
assert.equal(activityBody.active, null)
store.selectPage(true)
assert.equal(store.selectedIds.length, 10)
assert.equal(store.pageSelected, true)
store.filters.page = 2
assert.equal(store.selectedIds.length, 0)
await store.loadStations(); store.toggleSelection(11, true)
const revision = store.activityRevision
mockService.setActiveBulk = async () => { throw new Error('Server failure') }
assert.equal(await store.setSelectedActive(false), false)
assert.equal(store.stations[0].active, true)
assert.deepEqual(json(store.selectedIds), [11])
assert.equal(store.activityRevision, revision)
mockService.setActiveBulk = async () => { throw Object.assign(new Error('Missing station'), { isAxiosError: true, response: { status: 404 } }) }
assert.equal(await store.setSelectedActive(false), false)
assert.equal(store.selectedIds.length, 0)
assert.equal(store.stations[0].active, true)
mockService.setActive = () => new Promise(r => { resolve = r })
const changing = store.setStationActive(11, false)
assert.equal(store.isChangingActive, true)
assert.equal(await store.setStationActive(11, false), false)
store.ensureCompany('another-company')
resolve({ ...station(11), active: false })
assert.equal(await changing, false)
assert.equal(store.stations.length, 0)
assert.equal(store.selectedIds.length, 0)
assert.equal(store.isChangingActive, false)
console.log('Fuel stations: activity payloads, server filters, selection, page correction, map hiding, write failures, session isolation and existing contracts OK.')
