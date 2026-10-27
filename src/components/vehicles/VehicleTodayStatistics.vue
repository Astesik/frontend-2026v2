<template>
  <template v-if="enabled">
    <div class="flex items-center justify-between gap-3 px-3 py-2">
      <dt class="text-ui-mutedText">Dystans dziś</dt>
      <dd class="text-right font-semibold tabular-nums text-ui-text" :title="error" :aria-busy="loading">{{ distanceLabel }}</dd>
    </div>
    <div v-if="!hideConsumption" class="flex items-center justify-between gap-3 px-3 py-2">
      <dt class="shrink-0 text-ui-mutedText">Spalanie dziś</dt>
      <dd class="text-right font-semibold tabular-nums text-ui-text" :title="error" :aria-busy="loading">{{ consumptionLabel }}</dd>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { localPositionHistoryService } from '@/services/localPositionHistoryService'
import { todayHistoryRange } from '@/utils/historyTime'
import { historyMetric } from '@/utils/localPositionHistory'
import type { LocalHistorySummary } from '@/types/localPositionHistory'

const props = defineProps<{ vehicleId: number; companyId: number | string | null; enabled: boolean; refreshKey: number; hideConsumption?: boolean }>()
const summary = shallowRef<LocalHistorySummary | null>(null)
const loading = ref(false)
const error = ref('')
const distanceLabel = computed(() => {
  if (loading.value && !summary.value) return 'Pobieranie…'
  if (error.value) return 'Brak danych'
  const distance = summary.value?.distanceKm
  return distance != null && Number.isFinite(distance) ? historyMetric(distance, 'km') : '0 km'
})
const consumptionLabel = computed(() => {
  if (loading.value && !summary.value) return 'Pobieranie…'
  if (error.value) return 'Brak danych'
  const value = summary.value?.consumptionLPer100Km
  const consumption = value != null && Number.isFinite(value) ? historyMetric(value, 'l/100 km') : '0 l/100 km'
  const fuel = summary.value?.fuelUsedLiters
  return fuel != null && Number.isFinite(fuel) ? `${consumption} (${historyMetric(fuel, 'l')})` : consumption
})

let summaryDay = ''
watch(() => [props.vehicleId, props.companyId, props.enabled, props.refreshKey] as const, async (values, previous, onCleanup) => {
  const [vehicleId, , enabled] = values
  const range = todayHistoryRange()
  if (!previous || values.slice(0, 3).some((value, index) => value !== previous[index]) || summaryDay !== range.from) summary.value = null
  error.value = ''
  loading.value = false
  if (!enabled) return
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  loading.value = true
  try {
    const report = await localPositionHistoryService.summary({ vehicle_id: vehicleId, ...range }, controller.signal)
    if (!controller.signal.aborted) {
      summary.value = report.summary
      summaryDay = range.from
    }
  } catch {
    if (!controller.signal.aborted) {
      summary.value = null
      error.value = 'Nie udało się pobrać dzisiejszego podsumowania.'
    }
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}, { immediate: true })
</script>
