<template>
  <AppCard title="Wizyty na stacjach" :icon="IconGasStation" compact class="flex min-w-0 flex-col md:min-h-0 md:flex-1" content-class="flex min-h-0 flex-1 flex-col !p-0">
    <div class="border-b border-ui-divider p-3">
      <AppInput v-model="search" label="Szukaj pojazdu" placeholder="Numer rejestracyjny" type="search" size="sm" clearable :maxlength="120" class="sm:max-w-xs" />
    </div>
    <div class="relative flex min-h-48 flex-1 flex-col" :aria-busy="loading && !rows.length">
      <div class="max-h-[70dvh] min-h-0 flex-1 overflow-auto md:max-h-none">
        <table class="ui-table min-w-[60rem] table-fixed !text-[14px]" aria-label="Wizyty na stacjach">
          <colgroup>
            <col v-for="column in columns" :key="column.label" :class="column.width" />
          </colgroup>
          <thead class="ui-table-head">
            <tr class="divide-x divide-ui-divider">
              <th v-for="column in columns" :key="column.label" scope="col" class="sticky top-0 z-10 h-11 bg-ui-muted px-3 py-1">
                {{ column.label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(visit, i) in rows" :key="visit.id" class="ui-table-row divide-x divide-ui-divider [&>td]:px-3 [&>td]:py-2 [&>td]:align-middle">
              <td class="tabular-nums text-ui-mutedText">{{ page * 30 + i + 1 }}.</td>
              <td class="font-semibold">{{ visit.plate }}</td>
              <td class="break-words">{{ visit.station }}</td>
              <td><time :datetime="visit.at" class="tabular-nums">{{ day(visit.at) }}<span class="block text-ui-mutedText">{{ clock(visit.at) }}</span></time></td>
              <td class="whitespace-nowrap text-right tabular-nums">{{ visit.diesel ? liters(visit.diesel) : '—' }}</td>
              <td class="whitespace-nowrap text-right tabular-nums">{{ visit.adblue ? liters(visit.adblue) : '—' }}</td>
              <td><span class="flex items-center gap-2">
                <component :is="statusIcon(visit)" class="h-4 w-4 shrink-0 text-ui-icon" aria-hidden="true" />{{ assessment(visit) }}
              </span></td>
              <td class="text-center">
                <AppIconButton :label="'Szczegóły wizyty ' + visit.plate + ' · ' + date(visit.at)" size="sm" @click="openVisit(visit)">
                  <IconListDetails class="h-4 w-4" />
                </AppIconButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppLoadingIndicator v-if="loading && !rows.length" class="absolute inset-0 z-20 bg-ui-surface/85" />
      <p v-else-if="!rows.length && !error" class="absolute inset-x-0 top-16 px-4 text-sm text-ui-mutedText">Brak wizyt dla wybranych pojazdów.</p>
    </div>
    <p v-if="error" class="p-3 ui-error" role="alert">{{ error }}</p>
    <div v-if="page || more" class="flex items-center justify-end gap-3 border-t border-ui-divider p-3">
      <AppButton size="sm" variant="secondary" :disabled="!page || loading" @click="page--">Poprzednie</AppButton>
      <span class="text-sm tabular-nums">Strona {{ page + 1 }}</span>
      <AppButton size="sm" variant="secondary" :disabled="!more || loading" @click="page++">Następne</AppButton>
    </div>
  </AppCard>

  <AppModal v-if="selected" :open="true" center-in-viewport size="lg" :title="selected.plate + ' · ' + selected.station"
    :description="'Wizyta na stacji · ' + date(selected.at)" body-class="space-y-5" @close="selectedId = null">
    <section>
      <h3 class="flex items-center gap-2 text-[16px] font-semibold"><IconReceipt class="h-5 w-5 text-ui-icon" />Transakcje podczas wizyty</h3>
      <div class="mt-2 overflow-x-auto rounded-lg border border-ui-divider">
        <table class="ui-table w-full text-left !text-[14px]" aria-label="Transakcje podczas wizyty">
          <thead class="ui-table-head"><tr class="divide-x divide-ui-divider [&>th]:px-3 [&>th]:py-2">
            <th v-if="selected.purchases.length > 1" scope="col">Wykres</th>
            <th scope="col">Data</th><th scope="col">Stacja</th><th scope="col">Produkt</th><th scope="col" class="text-right">Ilość</th>
          </tr></thead>
          <tbody>
            <tr v-for="p in selected.purchases" :key="p.id" class="ui-table-row divide-x divide-ui-divider [&>td]:px-3 [&>td]:py-2">
              <td v-if="selected.purchases.length > 1" class="w-16 text-center">
                <input v-model="purchaseId" type="radio" name="visit-chart-purchase" :value="p.id" :aria-label="'Wykres dla transakcji ' + date(p.at) + ', ' + liters(p.liters)" />
              </td>
              <td class="tabular-nums">{{ date(p.at) }}</td><td>{{ p.provider }} {{ p.code }}</td>
              <td>{{ p.product === 'DIESEL' ? 'Olej napędowy' : 'AdBlue' }}</td><td class="whitespace-nowrap text-right font-medium tabular-nums">{{ liters(p.liters) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    <section v-if="purchase" class="rounded-lg border border-ui-divider p-3">
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 class="flex items-center gap-2 text-[16px] font-semibold"><IconChartLine class="h-5 w-5 text-ui-icon" />Poziom paliwa</h3>
        <span class="text-sm text-ui-mutedText">2 godz. przed transakcją · 24 godz. po</span>
      </div>
      <FuelVisitChart :id="selected.id" :run-id="selected.runId" :purchase-id="purchase.id" :at="purchase.at" />
    </section>
    <section class="space-y-3">
      <h3 class="flex items-center gap-2 text-[16px] font-semibold"><IconClipboardCheck class="h-5 w-5 text-ui-icon" />Ocena wizyty</h3>
      <p class="flex items-center gap-2 text-sm"><IconMapPin class="h-4 w-4 shrink-0 text-ui-icon" />
        {{ selected.gpsSupported ? 'GPS potwierdza obecność pojazdu na stacji.' : 'Stacja ustalona z transakcji. Brak potwierdzenia GPS.' }}
      </p>
      <template v-if="selected.analysis && selected.diesel > 0">
        <div class="grid gap-2 sm:grid-cols-3">
          <dl v-for="item in measurements(selected)" :key="item.label" class="rounded-lg border border-ui-divider p-3">
            <dt class="text-sm text-ui-mutedText">{{ item.label }}</dt>
            <dd class="mt-1 text-lg font-semibold tabular-nums">{{ item.reading ? number.format(item.reading.level) + '%' : 'Brak odczytu' }}</dd>
            <dd v-if="item.reading" class="text-sm tabular-nums text-ui-mutedText">{{ date(item.reading.at) }}</dd>
          </dl>
        </div>
        <div class="space-y-1 text-[14px]">
          <p class="font-semibold">{{ suggestions[selected.analysis.suggestion] }}</p>
          <p>{{ reasons[selected.analysis.reason] }}</p>
          <p>Liczba odczytów po ostatnim zakupie oleju napędowego · {{ selected.analysis.count }}</p>
          <p v-if="selected.analysis.stableFrom && selected.analysis.stableTo">Stabilne wskazania od {{ date(selected.analysis.stableFrom.at) }} do {{ date(selected.analysis.stableTo.at) }}.</p>
          <p v-if="selected.analysis.state === 'OBSERVING'">Oczekuje na dane do {{ date(selected.analysis.windowEnd) }}.</p>
        </div>
      </template>
      <p v-if="selected.decision || !selected.analysis || !selected.diesel" class="text-sm font-medium">{{ assessment(selected) }}</p>
      <p v-if="saveError" class="ui-error" role="alert">{{ saveError }}</p>
    </section>
    <template v-if="canManage && selected.diesel > 0" #footer>
      <div class="flex flex-wrap gap-2">
        <AppButton v-for="option in options" :key="option.value" size="sm" variant="secondary"
          :disabled="saving || selected.decision === option.value" @click="decide(selected, option.value)">{{ option.label }}</AppButton>
      </div>
    </template>
  </AppModal>
</template>
<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch, onBeforeUnmount } from 'vue'
import { IconChartLine, IconCircleCheck, IconClipboardCheck, IconClock, IconDroplet, IconGasStation,
  IconHelpCircle, IconListDetails, IconMapPin, IconReceipt } from '@tabler/icons-vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppLoadingIndicator from '@/components/ui/AppLoadingIndicator.vue'
import { useWorkspacePolling } from '@/composables/useWorkspace'
import { getApiErrorMessage } from '@/services/api'
import { fuelVisitService, type Visit, type Decision } from '@/services/fuelVisitService'

defineProps<{ canManage: boolean }>()
const FuelVisitChart = defineAsyncComponent(() => import('./FuelVisitChart.vue'))
const columns = [
  { label: 'Lp.', width: 'w-12' }, { label: 'Pojazd', width: 'w-32' }, { label: 'Stacja', width: 'w-auto' },
  { label: 'Data', width: 'w-28' }, { label: 'Olej napędowy', width: 'w-28' }, { label: 'AdBlue', width: 'w-24' },
  { label: 'Ocena wizyty', width: 'w-44' }, { label: 'Szczegóły', width: 'w-24' },
]
const search = ref(''), page = ref(0), rows = ref<Visit[]>([]), more = ref(false)
const loading = ref(false), saving = ref(false), error = ref(''), saveError = ref('')
const selectedId = ref<number | null>(null), purchaseId = ref<number | null>(null)
const selected = computed(() => rows.value.find(v => v.id === selectedId.value))
const purchase = computed(() => selected.value?.purchases.find(p => p.id === purchaseId.value) ?? selected.value?.purchases[0])
function openVisit(visit: Visit) {
  selectedId.value = visit.id
  purchaseId.value = visit.purchases[0]?.id ?? null
  saveError.value = ''
}
let request: AbortController | undefined
const number = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 })
const time = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'short', timeStyle: 'short' })
const date = (at: string) => time.format(new Date(at))
const dayFormat = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'short' })
const clockFormat = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', timeStyle: 'short' })
const day = (at: string) => dayFormat.format(new Date(at))
const clock = (at: string) => clockFormat.format(new Date(at))
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
function statusIcon(v: Visit) {
  if (v.decision === 'UNKNOWN') return IconHelpCircle
  if (v.decision || v.analysis?.state === 'ASSESSED') return IconCircleCheck
  if (v.analysis?.state === 'ADBLUE_ONLY') return IconDroplet
  return v.analysis?.state === 'UNRESOLVED' ? IconHelpCircle : IconClock
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
watch([search,page], () => { selectedId.value = null; rows.value = []; more.value = false; void load() }, { immediate: true })
useWorkspacePolling(async () => { if (!loading.value && !saving.value) await load() }, 10000)
onBeforeUnmount(() => request?.abort())
</script>
