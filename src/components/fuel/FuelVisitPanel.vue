<template>
  <section class="min-w-0 space-y-3 md:min-h-0 md:overflow-y-auto">
    <AppInput v-model="search" label="Rejestracja pojazdu" type="search" />
    <p v-if="error || saveError" class="ui-error" role="alert">{{ error || saveError }}</p>
    <p v-if="!rows.length && !error" class="ui-caption">{{ loading ? 'Pobieranie wizyt…' : 'Brak wizyt dla wybranych pojazdów.' }}</p>
    <AppCard v-for="v in rows" :key="v.id" compact>
      <details @toggle="toggleChart(v.id, $event)">
        <summary class="cursor-pointer space-y-1">
          <strong>{{ v.plate }} · {{ v.station }}</strong>
          <span class="ml-2 ui-caption">{{ date(v.at) }}</span>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span v-if="v.diesel">Diesel {{ liters(v.diesel) }}</span>
            <span v-if="v.adblue">AdBlue {{ liters(v.adblue) }}</span>
            <span class="ui-caption">{{ assessment(v) }}</span>
          </div>
        </summary>
        <div class="mt-3 space-y-3 border-t border-ui-divider pt-3">
          <p class="ui-caption">{{ v.gpsSupported ? 'GPS zarejestrował pojazd przy stacji.' : 'Powiązanie według transakcji. Brak potwierdzenia przy stacji z GPS.' }}</p>
          <ul class="divide-y divide-ui-divider">
            <li v-for="p in v.purchases" :key="p.id" class="flex flex-wrap justify-between gap-1 py-1 ui-body-sm">
              <span>{{ date(p.at) }} · {{ p.provider }} {{ p.code }}</span>
              <span>{{ p.product === 'DIESEL' ? 'Diesel' : 'AdBlue' }} · {{ liters(p.liters) }}</span>
            </li>
          </ul>
          <template v-if="v.analysis && v.diesel > 0">
            <p class="font-medium">{{ suggestions[v.analysis.suggestion] }}</p>
            <p class="ui-caption">{{ reasons[v.analysis.reason] }} · {{ v.analysis.count }} odczytów po ostatnim zakupie diesla.</p>
            <dl class="grid gap-2 sm:grid-cols-3">
              <div v-for="item in measurements(v)" :key="item.label">
                <dt class="ui-caption">{{ item.label }}</dt>
                <dd>{{ item.reading ? number.format(item.reading.level) + '% · ' + date(item.reading.at) : 'Brak odczytu' }}</dd>
              </div>
            </dl>
            <FuelVisitChart v-if="expanded.has(v.id) && v.runId && v.analysis.count" :id="v.id" :run-id="v.runId" />
            <p v-if="v.analysis.stableFrom && v.analysis.stableTo" class="ui-caption">
              Stabilne wskazania sondy · {{ date(v.analysis.stableFrom.at) }} – {{ date(v.analysis.stableTo.at) }}
            </p>
            <p v-if="v.analysis.state === 'OBSERVING'" class="ui-caption">Oczekuje na dane do {{ date(v.analysis.windowEnd) }}.</p>
          </template>
          <div v-if="canManage && v.diesel > 0" class="flex flex-wrap gap-2">
            <AppButton v-for="option in options" :key="option.value" variant="secondary" size="sm"
              :disabled="saving || v.decision === option.value" @click="decide(v, option.value)">{{ option.label }}</AppButton>
          </div>
        </div>
      </details>
    </AppCard>
    <div v-if="page || more" class="flex gap-2">
      <AppButton variant="secondary" :disabled="!page || loading" @click="page--">Poprzednie</AppButton>
      <AppButton variant="secondary" :disabled="!more || loading" @click="page++">Następne</AppButton>
    </div>
  </section>
</template>
<script setup lang="ts">
import { defineAsyncComponent, ref, watch, onBeforeUnmount } from 'vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useWorkspacePolling } from '@/composables/useWorkspace'
import { getApiErrorMessage } from '@/services/api'
import { fuelVisitService, type Visit, type Decision } from '@/services/fuelVisitService'

defineProps<{ canManage: boolean }>()
const FuelVisitChart = defineAsyncComponent(() => import('./FuelVisitChart.vue'))
const expanded = ref(new Set<number>())
function toggleChart(id: number, e: Event) {
  if ((e.currentTarget as HTMLDetailsElement).open) expanded.value.add(id)
  else expanded.value.delete(id)
}
const search = ref(''), page = ref(0), rows = ref<Visit[]>([]), more = ref(false)
const loading = ref(false), saving = ref(false), error = ref(''), saveError = ref('')
let request: AbortController | undefined
const number = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 })
const time = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'short', timeStyle: 'short' })
const date = (at: string) => time.format(new Date(at))
const liters = (n: number) => number.format(n) + ' l'
const suggestions = { LIKELY_FULL: 'Prawdopodobnie do pełna', LIKELY_PARTIAL: 'Prawdopodobnie częściowe', UNKNOWN: 'Brak jednoznacznej sugestii' }
const reasons: Record<string, string> = {
  HIGH_STABLE_LEVEL: 'Po zakupie poziom osiągnął wysoki zakres i ustabilizował się przy włączonym zapłonie.',
  LOW_STABLE_LEVEL: 'Po wzroście sonda nadal pokazywała poziom poniżej 80%.',
  WAITING_FOR_STABLE_LEVEL: 'Brakuje porównywalnych odczytów potwierdzających stabilny wzrost.',
  STATION_UNCERTAIN: 'Potrzebne jest potwierdzenie lokalizacji stacji.',
  MISSING_BASELINE: 'Brak poziomu odniesienia przed tankowaniem.',
  MISSING_PROFILE: 'Brak odpowiedniego profilu zbiorników z pomiarem CAN.',
  VOLUME_EXCEEDS_CAPACITY: 'Zakup przekracza nominalną pojemność zbiorników.',
  AMBIGUOUS_LEVEL: 'Poziom lub ilość paliwa nie pozwalają rozpoznać pełnego tankowania.',
}
const options: { value: Decision; label: string }[] = [
  { value: 'FULL', label: 'Potwierdź pełne zbiorniki' }, { value: 'PARTIAL', label: 'Oznacz jako częściowe' }, { value: 'UNKNOWN', label: 'Nie wiem' },
]
function assessment(v: Visit) {
  if (v.decision) return { FULL: 'Potwierdzono pełne zbiorniki', PARTIAL: 'Oznaczono jako częściowe', UNKNOWN: 'Decyzja użytkownika: nie wiem' }[v.decision]
  if (!v.analysis) return 'Oczekuje na analizę'
  return { OBSERVING: 'W obserwacji', UNRESOLVED: 'Nierozstrzygnięte', ASSESSED: suggestions[v.analysis.suggestion], ADBLUE_ONLY: 'Tylko AdBlue' }[v.analysis.state]
}
function measurements(v: Visit) {
  return [{ label: 'Przed tankowaniem', reading: v.analysis?.before }, { label: 'Maksimum po tankowaniu', reading: v.analysis?.peak },
    { label: 'Ostatni odczyt', reading: v.analysis?.last }]
}
async function load() {
  request?.abort()
  const controller = new AbortController()
  request = controller
  loading.value = true
  try {
    const data = await fuelVisitService.list(search.value.trim(), page.value, controller.signal)
    if (controller.signal.aborted) return
    rows.value = data.rows
    more.value = data.hasMore
    error.value = ''
  } catch (cause) { if (!controller.signal.aborted) error.value = getApiErrorMessage(cause) }
  finally { if (!controller.signal.aborted) loading.value = false }
}
async function decide(v: Visit, value: Decision) {
  saving.value = true
  saveError.value = ''
  try { await fuelVisitService.decide(v, value) }
  catch (cause) { saveError.value = getApiErrorMessage(cause) }
  finally { saving.value = false; await load() }
}
watch(search, () => { page.value = 0 })
watch([search,page], () => { rows.value = []; more.value = false; void load() }, { immediate: true })
useWorkspacePolling(async () => { if (!loading.value && !saving.value) await load() }, 10000)
onBeforeUnmount(() => request?.abort())
</script>
