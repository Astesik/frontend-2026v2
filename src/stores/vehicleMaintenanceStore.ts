import { defineStore } from 'pinia'
import { ref } from 'vue'
import { mockServiceSchedule, mockWheelReadings, normalizeWheelReadings } from '@/utils/vehicleMaintenance'
import type { TrailerTelemetry, TrailerWheelReading, VehicleServiceSchedule, WheelId, WheelReadingsLoader } from '@/types/vehicleMaintenance'

export const useVehicleMaintenanceStore = defineStore('vehicleMaintenance', () => {
  const telemetryByVehicleId = ref<Record<string, TrailerTelemetry>>({})
  const schedulesByVehicleId = ref<Record<string, VehicleServiceSchedule>>({})
  const selectedWheelByVehicleId = ref<Record<string, WheelId>>({})
  const loadingByVehicleId = ref<Record<string, boolean>>({})
  const errorsByVehicleId = ref<Record<string, string>>({})
  const requests = new Map<string, symbol>()
  let epoch = 0

  function ensureMock(vehicleId: string, trailer: boolean) {
    if (!schedulesByVehicleId.value[vehicleId]) schedulesByVehicleId.value[vehicleId] = mockServiceSchedule()
    if (trailer && !telemetryByVehicleId.value[vehicleId]) setWheelReadings(vehicleId, mockWheelReadings(), 'mock')
  }
  function setWheelReadings(vehicleId: string, readings: readonly TrailerWheelReading[], source: TrailerTelemetry['source'] = 'api') {
    telemetryByVehicleId.value[vehicleId] = { wheels: normalizeWheelReadings(readings), source }
    if (!selectedWheelByVehicleId.value[vehicleId]) selectedWheelByVehicleId.value[vehicleId] = '1-left'
  }
  function selectWheel(vehicleId: string, wheel: WheelId) { selectedWheelByVehicleId.value[vehicleId] = wheel }
  async function loadWheelReadings(vehicleId: string, loader: WheelReadingsLoader, source: TrailerTelemetry['source'] = 'api') {
    const request = Symbol(vehicleId), ownerEpoch = epoch
    requests.set(vehicleId, request); loadingByVehicleId.value[vehicleId] = true; errorsByVehicleId.value[vehicleId] = ''
    try {
      const readings = await loader(vehicleId)
      if (epoch === ownerEpoch && requests.get(vehicleId) === request) setWheelReadings(vehicleId, readings, source)
    } catch {
      if (epoch === ownerEpoch && requests.get(vehicleId) === request) errorsByVehicleId.value[vehicleId] = 'Nie udało się pobrać odczytów kół. Zachowano ostatnie dane.'
    } finally {
      if (epoch === ownerEpoch && requests.get(vehicleId) === request) { loadingByVehicleId.value[vehicleId] = false; requests.delete(vehicleId) }
    }
  }
  function refreshMockReadings(vehicleId: string) { return loadWheelReadings(vehicleId, async () => mockWheelReadings(), 'mock') }
  function resetApiState() {
    epoch++; requests.clear(); telemetryByVehicleId.value = {}; schedulesByVehicleId.value = {}; selectedWheelByVehicleId.value = {}; loadingByVehicleId.value = {}; errorsByVehicleId.value = {}
  }
  return { telemetryByVehicleId, schedulesByVehicleId, selectedWheelByVehicleId, loadingByVehicleId, errorsByVehicleId, ensureMock, setWheelReadings, selectWheel, loadWheelReadings, refreshMockReadings, resetApiState }
})
