<template>
  <section v-if="diesel" class="space-y-3" aria-label="Spalanie do tej wizyty">
    <h3 class="flex items-center gap-2 font-semibold"><IconChartLine class="h-5 w-5 text-ui-icon" />Spalanie do tej wizyty</h3>
    <AppLoadingIndicator v-if="loading && !result" class="min-h-28" />
    <p v-else-if="error" role="alert" class="ui-error">{{ error }}</p>
    <p v-else-if="processing" class="flex items-center gap-2 text-sm text-ui-mutedText"><IconLoader2 class="h-4 w-4 animate-spin" />Przeliczanie cyklu…</p>
    <template v-else-if="result">
      <p class="text-sm text-ui-mutedText">{{ date(result.from) }} – {{ date(result.to) }} · {{ result.distanceKm?.toLocaleString('pl-PL', { maximumFractionDigits: 2 }) }} km</p>
      <FuelConsumptionMethods :result="result" />
      <FuelAdjustedConsumption :adjusted="result.adjusted" />
    </template>
    <p v-else class="text-sm text-ui-mutedText">Wynik jest dostępny przy wizycie zamykającej cykl między tankowaniami Do pełna.</p>
  </section>
</template>
<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { IconChartLine, IconLoader2 } from '@tabler/icons-vue'
import AppLoadingIndicator from '@/components/ui/AppLoadingIndicator.vue'
import FuelConsumptionMethods from './FuelConsumptionMethods.vue'
import FuelAdjustedConsumption from './FuelAdjustedConsumption.vue'
import { fuelVisitService } from '@/services/fuelVisitService'
import type { AutomaticCycleResult } from '@/services/fuelConsumptionService'
import { getApiErrorMessage } from '@/services/api'
import { useWorkspacePolling } from '@/composables/useWorkspace'
const props = defineProps<{ id: number; runId: number | null; diesel: number }>()
const result = ref<AutomaticCycleResult | null>(null), loading = ref(false), processing = ref(false), error = ref('')
let request: AbortController | undefined
const date = (at: string) => new Date(at).toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'short', timeStyle: 'short' })
async function load(reset = false) {
  if (!props.diesel) return
  if (!reset && loading.value) return
  request?.abort()
  const controller = new AbortController(); request = controller
  loading.value = true
  if (reset) { result.value = null; error.value = '' }
  try {
    const data = await fuelVisitService.consumption(props.id, controller.signal)
    if (!controller.signal.aborted) { result.value = data.result; processing.value = data.processing; error.value = '' }
  } catch (cause) { if (!controller.signal.aborted) error.value = getApiErrorMessage(cause) }
  finally { if (request === controller) loading.value = false }
}
watch([() => props.id, () => props.runId], () => load(true), { immediate: true })
useWorkspacePolling(() => load(), 10000)
onBeforeUnmount(() => request?.abort())
</script>
