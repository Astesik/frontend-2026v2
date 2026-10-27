import { computed, markRaw, onScopeDispose, ref, shallowRef } from 'vue'
import { localHistoryPages, localPositionHistoryService } from '@/services/localPositionHistoryService'
import { getApiErrorMessage } from '@/services/api'
import { useUiStore } from '@/stores/uiStore'
import type { DriverTripReport, DriverTripRequest, LocalHistoryPoint } from '@/types/localPositionHistory'

export function useLocalVehicleHistory() {
  const records = shallowRef<LocalHistoryPoint[]>(markRaw([]))
  const report = shallowRef<DriverTripReport | null>(null)
  const loading = ref(false), error = ref(''), loaded = ref(0), complete = ref(false)
  const progress = computed(() => complete.value ? 100 : report.value?.summary?.sampleCount ? Math.min(99, Math.round(loaded.value * 100 / report.value.summary.sampleCount)) : null)
  let generation = 0, controller: AbortController | null = null
  function clear() {
    generation++; controller?.abort(); controller = null
    records.value = markRaw([]); report.value = null; loading.value = false; error.value = ''; loaded.value = 0; complete.value = false
  }
  async function load(body: DriverTripRequest) {
    clear()
    const version = generation, abort = new AbortController(); controller = abort; loading.value = true
    try {
      const response = await localPositionHistoryService.driverTrip(body, abort.signal)
      if (version !== generation) return
      report.value = markRaw(response)
      if (response.status === 'DRIVER_NOT_OBSERVED') { complete.value = true; return }
      if (!response.resolvedFrom || !response.to) throw new Error('Raport trasy nie zawiera poprawnego zakresu czasu.')
      for await (const page of localHistoryPages({vehicle_id:response.vehicleId,from:response.resolvedFrom,to:response.to,limit:2000,includeSummary:false},abort.signal)) {
        if (version !== generation) return
        records.value = markRaw([...records.value, ...page.result]); loaded.value = records.value.length
      }
      if (version === generation) complete.value = true
    } catch (cause) {
      if (version === generation && !abort.signal.aborted) {
        error.value = getApiErrorMessage(cause)
        useUiStore().addToast({type:'error',title:'Nie udało się pobrać trasy',message:error.value})
      }
    } finally { if (version === generation) { loading.value = false; controller = null } }
  }
  onScopeDispose(clear)
  return {records,report,loading,error,loaded,complete,progress,clear,load}
}
