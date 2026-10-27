import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { fuelStationService } from '@/services/fuelStationService'
import { getApiErrorMessage } from '@/services/api'
import { useUiStore } from './uiStore'
import { filterMapFuelStations, readFuelStationMapPreferences, validateStationImport, type FuelStationMapFilters } from '@/utils/fuelStation'
import type { FuelStation, FuelStationCountry, FuelStationProvider, FuelStationPrice, FuelStationImportResult, FuelStationWrite } from '@/types/fuelStation'

export const useFuelStationStore = defineStore('fuelStations', () => {
  const stations = ref<FuelStation[]>([]), total = ref(0)
  const providers = ref<FuelStationProvider[]>([]), countries = ref<FuelStationCountry[]>([])
  const allStations = ref<FuelStation[]>([])
  const selectedStation = ref<FuelStation | null>(null), prices = ref<FuelStationPrice[]>([])
  const importResult = ref<FuelStationImportResult | null>(null)
  const filters = reactive({ provider: '', country: '', q: '', active: 'all', page: 1, size: 25 })
  const selectedIds = ref<number[]>([]), savingActiveIds = ref<number[]>([])
  const activityRevision = ref(0)
  const isChangingActive = computed(() => savingActiveIds.value.length > 0)
  const pageSelected = computed(() => stations.value.length > 0 && stations.value.every(station => selectedIds.value.includes(station.id)))
  function toggleSelection(id: number, selected: boolean) {
    if (isChangingActive.value) return
    if (!selected) selectedIds.value = selectedIds.value.filter(value => value !== id)
    else if (!selectedIds.value.includes(id) && selectedIds.value.length < 1000) selectedIds.value.push(id)
  }
  function selectPage(selected: boolean) {
    if (isChangingActive.value) return
    selectedIds.value = selected ? stations.value.map(station => station.id) : []
  }
  watch(() => [filters.provider, filters.country, filters.q, filters.active, filters.page, filters.size], () => { selectedIds.value = [] }, { flush: 'sync' })
  try {
    const saved = JSON.parse(localStorage.getItem('routewise.fuelStations.filters') || 'null')
    if (saved && typeof saved === 'object') {
      for (const key of ['provider', 'country', 'q'] as const) if (typeof saved[key] === 'string') filters[key] = saved[key]
      if ([10, 25, 50, 100, 200].includes(saved.size)) filters.size = saved.size
      if (['all', 'active', 'inactive'].includes(saved.active)) filters.active = saved.active
    }
  } catch { /* Invalid preferences fall back to the default filters. */ }
  watch(() => ({ provider: filters.provider, country: filters.country, q: filters.q, active: filters.active, size: filters.size }), preferences => {
    try { localStorage.setItem('routewise.fuelStations.filters', JSON.stringify(preferences)) } catch { /* Preferences are optional. */ }
  })
  const historyDates = reactive({ from: '', to: '' })
  const mapFilters = reactive<FuelStationMapFilters>({ countries: null, currency: 'EUR', minPrice: '', maxPrice: '' })
  const mapEnabled = ref(false)
  try {
    const { enabled, ...savedFilters } = readFuelStationMapPreferences(JSON.parse(localStorage.getItem('routewise.fuelStations.map') || 'null'))
    mapEnabled.value = enabled
    Object.assign(mapFilters, savedFilters)
  } catch { /* Invalid preferences fall back to the default filters. */ }
  watch([mapEnabled, mapFilters], () => {
    try { localStorage.setItem('routewise.fuelStations.map', JSON.stringify({ enabled: mapEnabled.value, ...mapFilters })) } catch { /* Preferences are optional. */ }
  }, { deep: true })
  const isLoading = ref(false), isMapLoading = ref(false), isImporting = ref(false), isSaving = ref(false), isHistoryLoading = ref(false)
  const error = ref(''), mapError = ref(''), historyError = ref('')
  const mapLoaded = ref(false)
  let companyContext: string | null = null
  function ensureCompany(id: string | null) {
    if (companyContext === id) return
    resetApiState()
    companyContext = id
  }
  const visibleMapStations = computed(() => mapEnabled.value ? filterMapFuelStations(allStations.value, mapFilters) : [])
  let generation = 0, listRequest = 0, countryRequest = 0, historyRequest = 0, mapRequest = 0
  let mapFlight: Promise<void> | null = null
  function report(cause: unknown) {
    const message = getApiErrorMessage(cause)
    useUiStore().addToast({ type: 'error', title: 'Stacje paliw', message })
    return message
  }
  function resetApiState() {
    generation++; listRequest++; countryRequest++; historyRequest++; mapRequest++
    stations.value = []; allStations.value = []; providers.value = []; countries.value = []
    prices.value = []; selectedStation.value = null; importResult.value = null
    total.value = 0; mapLoaded.value = false; mapFlight = null
    selectedIds.value = []; savingActiveIds.value = []; activityRevision.value++
    isLoading.value = false; isMapLoading.value = false; isImporting.value = false; isSaving.value = false; isHistoryLoading.value = false
    error.value = ''; mapError.value = ''; historyError.value = ''
    filters.page = 1
    historyDates.from = ''; historyDates.to = ''; companyContext = null
  }
  async function loadProviders() {
    const session = generation
    try { const data = await fuelStationService.providers(); if (session === generation) providers.value = data }
    catch (cause) { if (session === generation) report(cause) }
  }
  async function loadCountries(provider = filters.provider) {
    const session = generation, request = ++countryRequest
    try { const data = await fuelStationService.countries(provider); if (session === generation && request === countryRequest) countries.value = data }
    catch (cause) { if (session === generation && request === countryRequest) report(cause) }
  }
  async function loadStations() {
    const session = generation, request = ++listRequest
    isLoading.value = true; error.value = ''
    try {
      const data = await fuelStationService.search({ provider: filters.provider || null, country: filters.country || null, q: filters.q.trim() || null, active: filters.active === 'all' ? null : filters.active === 'active', page: filters.page - 1, size: filters.size })
      if (session === generation && request === listRequest) {
        const lastPage = Math.max(1, Math.ceil(data.totalElements / filters.size))
        total.value = data.totalElements
        if (filters.page > lastPage) { filters.page = lastPage; await loadStations(); return }
        stations.value = data.items
        const visibleIds = new Set(data.items.map(station => station.id))
        selectedIds.value = selectedIds.value.filter(id => visibleIds.has(id))
      }
    } catch (cause) { if (session === generation && request === listRequest) error.value = report(cause) }
    finally { if (session === generation && request === listRequest) isLoading.value = false }
  }
  function loadMapStations(force = false): Promise<void> {
    if (mapFlight) return mapFlight
    if (mapLoaded.value && !force) return Promise.resolve()
    const session = generation, request = ++mapRequest
    isMapLoading.value = true; mapError.value = ''
    const flight = (async () => {
      try {
        const items: FuelStation[] = []
        for (let page = 0; ; page++) {
          const result = await fuelStationService.search({ page, size: 200 })
          if (session !== generation || request !== mapRequest) return
          items.push(...result.items)
          if (items.length >= result.totalElements || !result.items.length) break
        }
        allStations.value = [...new Map(items.map((station) => [station.id, station])).values()]
        mapLoaded.value = true
      } catch (cause) { if (session === generation && request === mapRequest) mapError.value = report(cause) }
      finally {
        if (session === generation && request === mapRequest) { isMapLoading.value = false; mapFlight = null }
      }
    })()
    mapFlight = flight
    return flight
  }
  function closeHistory() { historyRequest++; selectedStation.value = null; prices.value = []; historyError.value = ''; isHistoryLoading.value = false }
  async function loadHistory(station = selectedStation.value) {
    if (!station) return
    if (selectedStation.value?.id !== station.id) prices.value = []
    const session = generation, request = ++historyRequest
    selectedStation.value = station; historyError.value = ''
    if (historyDates.from && historyDates.to && historyDates.from > historyDates.to) { isHistoryLoading.value = false; historyError.value = 'Data od nie może być późniejsza niż data do.'; return }
    isHistoryLoading.value = true
    try {
      const data = await fuelStationService.prices(station.id, historyDates.from, historyDates.to)
      if (session === generation && request === historyRequest) prices.value = data
    } catch (cause) {
      if (session !== generation || request !== historyRequest) return
      if (axios.isAxiosError(cause) && cause.response?.status === 404) { report(cause); closeHistory(); void loadStations() }
      else historyError.value = report(cause)
    } finally { if (session === generation && request === historyRequest) isHistoryLoading.value = false }
  }
  async function refreshAfterWrite(session: number) {
    if (session !== generation) return
    mapLoaded.value = false
    mapRequest++; mapFlight = null; allStations.value = []
    await Promise.all([loadStations(), loadCountries(), mapEnabled.value ? loadMapStations(true) : Promise.resolve()])
  }
  async function changeActive(ids: number[], active: boolean, bulk: boolean) {
    if (isChangingActive.value || isSaving.value || isImporting.value) return false
    const stationIds = [...new Set(ids)]
    if (!stationIds.length || stationIds.length > 1000 || stationIds.some(id => !Number.isInteger(id) || id <= 0)) {
      report(new Error('Wybierz od 1 do 1000 stacji.')); return false
    }
    const session = generation
    savingActiveIds.value = stationIds
    try {
      const response = bulk ? await fuelStationService.setActiveBulk(stationIds, active) : await fuelStationService.setActive(stationIds[0], active)
      if (session !== generation) return false
      const accepted = new Set('stationIds' in response ? response.stationIds : [response.id])
      const update = (station: FuelStation) => accepted.has(station.id) ? { ...station, active: response.active } : station
      stations.value = stations.value.map(update); allStations.value = allStations.value.map(update)
      if (selectedStation.value) selectedStation.value = update(selectedStation.value)
      selectedIds.value = selectedIds.value.filter(id => !accepted.has(id))
      activityRevision.value++
      useUiStore().addToast({ type: 'success', title: active ? 'Stacje aktywowane' : 'Stacje dezaktywowane', message: 'updatedCount' in response ? `Zmieniono: ${response.updatedCount}. Wybrano: ${response.requestedCount}.` : undefined })
      await refreshAfterWrite(session)
      return true
    } catch (cause) {
      if (session === generation) {
        report(cause)
        if (axios.isAxiosError(cause) && cause.response?.status === 404) { selectedIds.value = []; activityRevision.value++; await refreshAfterWrite(session) }
      }
      return false
    } finally { if (session === generation) savingActiveIds.value = [] }
  }
  function setStationActive(id: number, active: boolean) { return changeActive([id], active, false) }
  function setSelectedActive(active: boolean) { return changeActive([...selectedIds.value], active, true) }
  async function importFile(provider: string, file: File) {
    if (isImporting.value || isChangingActive.value) return false
    const validation = validateStationImport(file)
    if (validation) { report(new Error(validation)); return false }
    if (!providers.value.some((item) => item.code === provider && item.importSupported)) { report(new Error('Import tego dostawcy nie jest obsługiwany.')); return false }
    const session = generation
    isImporting.value = true; importResult.value = null
    try {
      const data = await fuelStationService.importFile(provider, file)
      if (session !== generation) return false
      importResult.value = data
      useUiStore().addToast({ type: data.errors.length || data.warnings.length || data.skippedInvalidRows ? 'warning' : 'success', title: 'Import zakończony', message: `Zaakceptowano ${data.acceptedRows} z ${data.totalRows} wierszy.` })
      await refreshAfterWrite(session)
      return true
    } catch (cause) { if (session === generation) report(cause); return false }
    finally { if (session === generation) isImporting.value = false }
  }
  async function saveStation(data: FuelStationWrite, id?: number) {
    if (isSaving.value || isChangingActive.value) return false
    const session = generation
    isSaving.value = true
    try {
      if (id) { const { provider: _provider, ...patch } = data; await fuelStationService.update(id, patch) }
      else await fuelStationService.create(data)
      if (session !== generation) return false
      useUiStore().addToast({ type: 'success', title: id ? 'Stacja zaktualizowana' : 'Stacja dodana' })
      await refreshAfterWrite(session)
      return true
    } catch (cause) { if (session === generation) report(cause); return false }
    finally { if (session === generation) isSaving.value = false }
  }
  return { stations, total, providers, countries, allStations, selectedStation, prices, importResult, filters, historyDates, mapFilters, mapEnabled, mapLoaded, visibleMapStations, isLoading, isMapLoading, isImporting, isSaving, isHistoryLoading, error, mapError, historyError, selectedIds, savingActiveIds, isChangingActive, pageSelected, activityRevision, toggleSelection, selectPage, setStationActive, setSelectedActive, loadProviders, loadCountries, loadStations, loadMapStations, loadHistory, closeHistory, importFile, saveStation, resetApiState, ensureCompany }
})
