import { computed, reactive, ref, shallowRef, watch } from 'vue'
import { defineStore } from 'pinia'
import { useFleetStore } from './fleetStore'
import { useUiStore } from './uiStore'
import { useFuelStationStore } from './fuelStationStore'
import { fuelRouteService } from '@/services/fuelRouteService'
import { googleFuelRouteService } from '@/services/googleFuelRouteService'
import { getApiErrorMessage } from '@/services/api'
import { DEFAULT_FUEL_ROUTE_SETTINGS, validateFuelRouteSettings } from '@/utils/fuelRoute'
import type { FuelRoutePoint, FuelRouteResult, GoogleFuelRoute } from '@/types/fuelRoute'
export const useFuelRouteStore = defineStore('fuelRoute', () => {
  const fleet = useFleetStore()
  const selectedVehicleId = ref<string | null>(null), selectedFleetId = ref('type:truck'), vehicleSearch = ref('')
  const waypoints = ref<FuelRoutePoint[]>([{ id: crypto.randomUUID(), address: '', position: null }])
  const settings = reactive({ ...DEFAULT_FUEL_ROUTE_SETTINGS, providers: [] as string[] })
  try {
    const saved = JSON.parse(localStorage.getItem('routewise.fuelRoute.settings') || 'null')
    if (saved && typeof saved === 'object') {
      const merged = { ...DEFAULT_FUEL_ROUTE_SETTINGS }
      for (const key of Object.keys(merged) as Array<keyof typeof merged>) {
        if (Object.hasOwn(saved, key)) Object.assign(merged, { [key]: saved[key] })
      }
      if (!validateFuelRouteSettings(merged)) Object.assign(settings, merged)
    }
  } catch { /* Optional preferences. */ }
  watch(settings, () => { if (!validateFuelRouteSettings(settings)) { try { localStorage.setItem('routewise.fuelRoute.settings', JSON.stringify(settings)) } catch { /* Optional preferences. */ } } }, { deep: true })
  const result = shallowRef<FuelRouteResult | null>(null), route = shallowRef<GoogleFuelRoute | null>(null)
  const isLoading = ref(false), error = ref(''), selectedStationId = ref<number | null>(null)
  const selectedVehicle = computed(() => fleet.vehicles.find(v => v.id === selectedVehicleId.value) || null)
  let request = 0, controller: AbortController | null = null, company: string | null = null
  function invalidate() { request++; controller?.abort(); controller = null; result.value = null; route.value = null; selectedStationId.value = null; isLoading.value = false; error.value = '' }
  const stations = useFuelStationStore()
  watch(() => stations.activityRevision, invalidate, { flush: 'sync' })
  function resetApiState() { invalidate(); company = null; selectedVehicleId.value = null; selectedFleetId.value = 'type:truck'; vehicleSearch.value = ''; waypoints.value = [{ id: crypto.randomUUID(), address: '', position: null }] }
  function ensureCompany(id: string | null) { if (id !== company) { resetApiState(); company = id } }
  function selectVehicle(id: string) { invalidate(); selectedVehicleId.value = id }
  function addPoint(position: FuelRoutePoint['position'] = null) {
    if (waypoints.value.length >= 26) return
    const empty = waypoints.value.find(p => !p.address.trim() && !p.position)
    if (position && empty) { empty.position = position; empty.address = `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` }
    else waypoints.value.push({ id: crypto.randomUUID(), address: position ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}` : '', position })
  }
  function removePoint(id: string) { waypoints.value = waypoints.value.filter(p => p.id !== id); if (!waypoints.value.length) addPoint() }
  function movePoint(index: number, offset: number) { const next = index + offset; if (next < 0 || next >= waypoints.value.length) return; const copy = [...waypoints.value]; [copy[index], copy[next]] = [copy[next], copy[index]]; waypoints.value = copy }
  watch([selectedVehicleId, waypoints, settings], invalidate, { deep: true, flush: 'sync' })
  async function calculate() {
    invalidate()
    const vehicle = selectedVehicle.value, points = waypoints.value.filter(p => p.position || p.address.trim()).map(p => ({ ...p, position: p.position ? { ...p.position } : null }))
    const invalid = validateFuelRouteSettings(settings)
    if (invalid) { error.value = invalid; return false }
    if (!vehicle || vehicle.rawType !== 'TRUCK' || vehicle.rawStatus !== 'ACTIVE') { error.value = 'Wybierz aktywny ciągnik.'; return false }
    if (!vehicle.hasPosition || !Number.isFinite(vehicle.latitude) || !Number.isFinite(vehicle.longitude) || Math.abs(vehicle.latitude) > 90 || Math.abs(vehicle.longitude) > 180) { error.value = 'Wybrany pojazd nie ma poprawnej pozycji GPS.'; return false }
    if (!points.length) { error.value = 'Dodaj przynajmniej jeden punkt docelowy.'; return false }
    const token = request, abort = new AbortController(); controller = abort; isLoading.value = true
    const bodySettings = { ...settings, providers: [...settings.providers] }
    try {
      const geometry = await googleFuelRouteService.calculate({ lat: vehicle.latitude, lng: vehicle.longitude }, points)
      if (token !== request) return false
      const { priceDate, ...options } = bodySettings
      const data = await fuelRouteService.search({ ...options, ...(priceDate ? { priceDate } : {}), vehicleId: vehicle.backendId, encodedPolyline: geometry.encodedPolyline }, abort.signal)
      if (token !== request) return false
      const activeOnly = <T extends { active: boolean }>(items: T[]) => items.filter(station => station.active !== false)
      const rankings = (groups: FuelRouteResult['cheapestByCurrency']) => groups.map(group => ({ ...group, stations: activeOnly(group.stations) })).filter(group => group.stations.length)
      route.value = geometry; result.value = { ...data, stations: activeOnly(data.stations), cheapestByCurrency: rankings(data.cheapestByCurrency), reachableCheapestByCurrency: rankings(data.reachableCheapestByCurrency) }
      return true
    } catch (cause) { if (token === request) { error.value = getApiErrorMessage(cause); useUiStore().addToast({ type: 'error', title: 'Nie udało się zaplanować tankowania', message: error.value }) }; return false }
    finally { if (token === request) { isLoading.value = false; controller = null } }
  }
  return { selectedVehicleId, selectedFleetId, vehicleSearch, selectedVehicle, selectedStationId, waypoints, settings, result, route, isLoading, error, invalidate, resetApiState, ensureCompany, selectVehicle, addPoint, removePoint, movePoint, calculate }
})
