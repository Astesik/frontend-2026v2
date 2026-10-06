import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'
import { vehicleReturnService } from '@/services/vehicleReturnService'
import { useFleetStore } from './fleetStore'
import { driverService } from '@/services/driverService'
import { positionService } from '@/services/positionService'
import { loadReturnColumns, saveReturnColumns, returnColumnDefinitions } from '@/utils/vehicleReturnColumns'
import { getApiErrorMessage } from '@/services/api'
import { useUiStore } from './uiStore'
import { newReturnForm, returnWeekStart } from '@/utils/vehicleReturn'
import type { ApiLastPosition } from '@/types/fleet'
import type { DriverSelectItem } from '@/types/driver'
import type { ReturnPreview, VehicleReturnEntry, VehicleReturnWeek, VehicleReturnWrite } from '@/types/vehicleReturn'

export const useVehicleReturnStore = defineStore('vehicleReturns', () => {
  const selectedWeekStart = ref(returnWeekStart())
  const columns = ref(loadReturnColumns())
  const visibleColumns = computed(() => columns.value.filter((item) => item.visible).map((item) => ({ ...item, label: returnColumnDefinitions.find((column) => column.key === item.key)!.label })))
  watch(columns, saveReturnColumns, { deep: true })
  const lastRefreshedAt = ref(0)
  const mapPositions = ref<ApiLastPosition[]>([])
  const mapLoading = ref(false)
  const mapError = ref('')
  let mapRequest = 0
  const draft = ref(newReturnForm(selectedWeekStart.value))
  const draftWeekEntries = ref<VehicleReturnEntry[]>([])
  const week = ref<VehicleReturnWeek | null>(null)
  const searchQuery = ref('')
  const drivers = ref<DriverSelectItem[]>([])
  const preview = ref<ReturnPreview | null>(null)
  const previewError = ref('')
  const isPreviewLoading = ref(false)
  const currentEntry = ref<VehicleReturnEntry | null>(null)
  const conflict = ref<VehicleReturnEntry | null>(null)
  const isLoading = ref(false)
  const isMutating = ref(false)
  const dictionariesLoading = ref(false)
  const error = ref('')
  let generation = 0
  let listRequest = 0
  let previewRequest = 0
  let detailRequest = 0
  let draftWeekRequest = 0
  const entries = computed(() => week.value?.entries || [])
  const filteredEntries = computed(() => {
    const query = searchQuery.value.trim().toLocaleLowerCase('pl-PL')
    return entries.value.filter((entry) => [entry.truck.licensePlate, entry.trailer?.licensePlate, entry.returnDriver?.name, entry.departureDriver?.name, entry.notes].some((value) => value?.toLocaleLowerCase('pl-PL').includes(query)))
  })
  function report(cause: unknown) {
    const message = getApiErrorMessage(cause)
    useUiStore().addToast({ type: 'error', title: 'Zjazdy i wyjazdy', message })
    return message
  }
  function clearEditor() {
    mapRequest += 1
    mapPositions.value = []
    mapLoading.value = false
    mapError.value = ''
    previewRequest += 1
    detailRequest += 1
    draftWeekRequest += 1
    draftWeekEntries.value = []
    preview.value = null
    previewError.value = ''
    isPreviewLoading.value = false
    currentEntry.value = null
    conflict.value = null
    draft.value = newReturnForm(selectedWeekStart.value)
  }
  function resetApiState() {
    generation += 1
    listRequest += 1
    clearEditor()
    week.value = null
    lastRefreshedAt.value = 0
    drivers.value = []
    error.value = ''
    isLoading.value = false
    isMutating.value = false
    dictionariesLoading.value = false
    searchQuery.value = ''
    selectedWeekStart.value = returnWeekStart()
  }
  async function loadWeek() {
    const request = ++listRequest, session = generation, selected = selectedWeekStart.value
    isLoading.value = true
    error.value = ''
    if (week.value?.weekStart !== selected) week.value = null
    try {
      const response = await vehicleReturnService.search(selected)
      if (session === generation && request === listRequest) { week.value = response; lastRefreshedAt.value = Date.now() }
    } catch (cause) {
      if (session === generation && request === listRequest) error.value = report(cause)
    } finally {
      if (session === generation && request === listRequest) isLoading.value = false
    }
  }
  async function loadMapPositions() {
    const request = ++mapRequest, session = generation
    mapLoading.value = true
    mapError.value = ''
    try {
      const positions = await positionService.getLastPositions({ silent: true })
      if (session === generation && request === mapRequest) mapPositions.value = positions
    } catch (cause) {
      if (session === generation && request === mapRequest) mapError.value = report(cause)
    } finally {
      if (session === generation && request === mapRequest) mapLoading.value = false
    }
  }
  async function loadDictionaries(readVehicles: boolean, readDrivers: boolean) {
    const session = generation
    dictionariesLoading.value = true
    const results = await Promise.allSettled([
      readVehicles && !useFleetStore().apiVehicles.length ? useFleetStore().fetchVehicles({ silent: true }) : Promise.resolve(),
      readDrivers ? driverService.getDriverSelect({ silent: true }) : Promise.resolve([]),
    ])
    if (session !== generation) return
    drivers.value = results[1].status === 'fulfilled' ? results[1].value : []
    const failed = results.find((result) => result.status === 'rejected')
    if (failed?.status === 'rejected') report(failed.reason)
    dictionariesLoading.value = false
  }
  async function loadPreview(truckId: number | null, trailerId: number | null) {
    const request = ++previewRequest, session = generation
    preview.value = null
    previewError.value = ''
    isPreviewLoading.value = Boolean(truckId)
    if (!truckId) return
    try {
      const response = await vehicleReturnService.preview(truckId, trailerId)
      if (request === previewRequest && session === generation) preview.value = response
    } catch (cause) {
      if (request === previewRequest && session === generation) previewError.value = report(cause)
    } finally {
      if (request === previewRequest && session === generation) isPreviewLoading.value = false
    }
  }
  async function loadDraftWeek(start: string) {
    const request = ++draftWeekRequest, session = generation
    draftWeekEntries.value = []
    if (week.value?.weekStart === start) return
    try {
      const response = await vehicleReturnService.search(start)
      if (request === draftWeekRequest && session === generation) draftWeekEntries.value = response.entries
    } catch (cause) {
      if (request === draftWeekRequest && session === generation) report(cause)
    }
  }
  async function loadDetail(id: number) {
    const request = ++detailRequest, session = generation
    const entry = await vehicleReturnService.details(id)
    if (session === generation && request === detailRequest) currentEntry.value = entry
    return session === generation && request === detailRequest ? entry : null
  }
  function upsert(entry: VehicleReturnEntry) {
    if (!week.value) return
    week.value.entries = week.value.entries.filter((item) => item.id !== entry.id)
    if (week.value.weekStart === entry.weekStart) {
      week.value.entries.push(entry)
      week.value.entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id)
    }
  }
  async function mutate(data: VehicleReturnWrite | null, entry?: VehicleReturnEntry) {
    if (isMutating.value) return null
    const session = generation
    isMutating.value = true
    conflict.value = null
    try {
      const response = data
        ? (entry ? await vehicleReturnService.update(entry.id, entry.version, data) : await vehicleReturnService.create(data))
        : (entry ? await vehicleReturnService.delete(entry.id, entry.version) : null)
      if (session !== generation) return null
      // Searches started before saving must not overwrite the newest version.
      listRequest += 1
      isLoading.value = false
      if (!week.value) await loadWeek()
      if (session !== generation) return null
      if (response) upsert(response)
      else if (entry && week.value) week.value.entries = week.value.entries.filter((item) => item.id !== entry.id)
      useUiStore().addToast({ type: 'success', title: data ? (entry ? 'Wpis zaktualizowany' : 'Wpis dodany') : 'Wpis usunięty' })
      return response || true
    } catch (cause) {
      if (session !== generation) return null
      if (axios.isAxiosError(cause) && cause.response?.status === 409 && entry) {
        try {
          const latest = await vehicleReturnService.details(entry.id)
          if (session === generation) { conflict.value = latest; upsert(latest) }
        } catch { /* Keep the draft when current details are unavailable. */ }
      } else if (axios.isAxiosError(cause) && cause.response?.status === 404) {
        await loadWeek()
      }
      if (session === generation) report(cause)
      throw cause
    } finally {
      if (session === generation) isMutating.value = false
    }
  }
  return { selectedWeekStart, columns, visibleColumns, lastRefreshedAt, mapPositions, mapLoading, mapError, loadMapPositions, week, entries, filteredEntries, searchQuery, drivers, draft, draftWeekEntries, preview, previewError, isPreviewLoading, currentEntry, conflict, isLoading, isMutating, dictionariesLoading, error, resetApiState, clearEditor, loadWeek, loadDictionaries, loadPreview, loadDraftWeek, loadDetail, mutate }
})
