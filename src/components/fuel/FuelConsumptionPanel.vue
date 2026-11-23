<template>
  <section class="flex min-w-0 flex-col gap-3 md:min-h-0 md:flex-1">
    <FuelSummaryTiles :total="report?.processing && !report.total ? null : report?.total" :pending="report?.processing && !report.total ? null : pending"
      :loading="loading || Boolean(report?.processing)" total-label="Liczba cykli" pending-label="Cykle do weryfikacji" />
    <AppCard title="Cykle spalania" :icon="IconGasStation" compact class="flex min-w-0 flex-col md:min-h-0 md:flex-1" content-class="flex min-h-0 flex-1 flex-col !p-0">
      <div class="grid gap-3 border-b border-ui-divider p-3 sm:grid-cols-2 xl:grid-cols-4">
        <AppInput v-model="search" label="Szukaj pojazdu" placeholder="Numer rejestracyjny" size="sm" clearable :maxlength="120" />
        <AppDatePicker v-model="from" label="Koniec cyklu od" editable size="sm" />
        <AppDatePicker v-model="to" label="Koniec cyklu do" editable size="sm" />
        <AppSelect v-model="mode" label="Zakres cykli" :options="modeOptions" size="sm" />
      </div>
      <p v-if="error" role="alert" class="p-3 ui-error">{{ error }}</p>
      <div v-if="report?.processing" class="flex items-center gap-2 border-b border-ui-divider p-3 text-sm text-ui-mutedText" role="status">
        <IconLoader2 class="h-4 w-4 animate-spin" />Przeliczanie cykli…
      </div>
      <div class="min-h-0 flex-1 overflow-auto">
        <section v-if="report?.chart.length" class="border-b border-ui-divider p-3">
          <h3 class="flex items-center gap-2 text-sm font-semibold"><IconChartLine class="h-4 w-4 text-ui-icon" />Spalanie cykli sąsiednich</h3>
          <FuelCycleChart :cycles="report.chart" />
        </section>
        <div class="relative min-h-48" :aria-busy="loading">
          <table class="ui-table min-w-[78rem] table-auto" aria-label="Automatyczne cykle spalania">
            <thead class="ui-table-head"><tr class="divide-x divide-ui-divider">
              <th v-for="label in columns" :key="label" scope="col" class="sticky top-0 z-10 whitespace-nowrap bg-ui-muted px-3 py-3">{{ label }}</th>
            </tr></thead>
            <tbody>
              <tr v-for="row in report?.rows ?? []" :key="row.id" class="ui-table-row divide-x divide-ui-divider [&>td]:px-3 [&>td]:py-2 [&>td]:align-middle">
                <td class="whitespace-nowrap font-semibold">{{ row.licensePlate }}</td>
                <td class="whitespace-nowrap tabular-nums"><time :datetime="row.result.to" class="font-medium">{{ timestamp(row.result.to) }}</time><span class="block text-ui-mutedText">Od {{ timestamp(row.result.from) }}</span></td>
                <td class="whitespace-nowrap">{{ row.result.adjacent ? 'Sąsiedni' : 'Łączony' }}</td>
                <td class="whitespace-nowrap tabular-nums">{{ amount(row.result.distanceKm, 'km') }}</td>
                <td class="whitespace-nowrap tabular-nums">{{ amount(row.result.purchasedLiters, 'l') }}</td>
                <td class="whitespace-nowrap font-medium tabular-nums">{{ amount(row.result.canPer100Km, 'l/100 km') }}</td>
                <td class="whitespace-nowrap font-medium tabular-nums">{{ amount(row.result.purchasesPer100Km, 'l/100 km') }}</td>
                <td class="whitespace-nowrap tabular-nums">{{ amount(row.result.differenceLiters, 'l') }}<span class="block text-ui-mutedText">{{ amount(row.result.differencePercent, '%') }}</span></td>
                <td><span class="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium" :class="row.result.confirmed ? 'text-success-600 dark:text-success-400' : 'text-warning-600 dark:text-warning-400'">
                  <component :is="row.result.confirmed ? IconCircleCheck : IconHelpCircle" class="h-4 w-4" />{{ row.result.confirmed ? 'Potwierdzono' : 'Do weryfikacji' }}
                </span></td>
                <td><AppIconButton label="Szczegóły cyklu" size="sm" @click="selected = row"><IconListDetails class="h-4 w-4" /></AppIconButton></td>
              </tr>
            </tbody>
          </table>
          <AppLoadingIndicator v-if="loading" class="absolute inset-0 z-20 bg-ui-surface/85" />
          <p v-else-if="!report?.rows.length && !report?.processing && !error" class="px-4 py-8 text-sm text-ui-mutedText">
            Brak cykli pasujących do filtrów. Cykl powstaje automatycznie między wizytami potwierdzonymi jako Do pełna.
          </p>
        </div>
      </div>
      <div v-if="page || report?.hasMore" class="flex items-center justify-end gap-3 border-t border-ui-divider p-3">
        <AppButton variant="secondary" size="sm" :disabled="!page || loading" @click="page--">Poprzednie</AppButton>
        <span class="text-sm">Strona {{ page + 1 }}</span>
        <AppButton variant="secondary" size="sm" :disabled="!report?.hasMore || loading" @click="page++">Następne</AppButton>
      </div>
    </AppCard>
    <AppModal :open="selected != null" center-in-viewport size="xl" :title="'Podsumowanie cyklu · ' + (selected?.licensePlate || '')" body-class="space-y-4" @close="selected = null">
      <AppLoadingIndicator v-if="detailLoading" class="min-h-64" />
      <p v-else-if="detailError" role="alert" class="ui-error">{{ detailError }}</p>
      <template v-else-if="detail">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-sm font-medium">{{ timestamp(detail.cycle.result.from) }} – {{ timestamp(detail.cycle.result.to) }}</p>
          <p class="text-sm">Dystans · <strong>{{ amount(detail.cycle.result.distanceKm, 'km') }}</strong></p>
        </div>
        <p class="text-sm font-medium" :class="detail.cycle.result.confirmed ? 'text-success-600' : 'text-warning-600'">{{ detail.cycle.result.confirmed ? 'Cykl potwierdzony automatycznie' : 'Cykl wymaga weryfikacji' }}</p>
        <ul v-if="detail.cycle.result.issues.length" class="list-inside list-disc text-sm text-warning-600">
          <li v-for="issue in detail.cycle.result.issues" :key="issue">{{ issueLabels[issue] || issue }}</li>
        </ul>
        <FuelCounterDecreases :measurement="detail.cycle.result.telemetry.can" />
        <div class="overflow-x-auto rounded-lg border border-ui-divider">
          <table class="ui-table" aria-label="Porównanie metod spalania">
            <thead class="ui-table-head"><tr class="divide-x divide-ui-divider [&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:py-2">
              <th>Metoda</th><th>Litry</th><th>Spalanie</th><th>Różnica względem CAN</th><th>Różnica %</th>
            </tr></thead>
            <tbody>
              <tr class="ui-table-row divide-x divide-ui-divider [&>td]:whitespace-nowrap [&>td]:px-3 [&>td]:py-3">
                <td class="font-medium">CAN</td><td>{{ amount(detail.cycle.result.canLiters, 'l') }}</td><td>{{ amount(detail.cycle.result.canPer100Km, 'l/100 km') }}</td>
                <td>{{ detail.cycle.result.differenceLiters == null ? '—' : '0 l' }}</td><td>{{ detail.cycle.result.differencePercent == null ? '—' : '0%' }}</td>
              </tr>
              <tr class="ui-table-row divide-x divide-ui-divider [&>td]:whitespace-nowrap [&>td]:px-3 [&>td]:py-3">
                <td class="font-medium">Z zakupów</td><td>{{ amount(detail.cycle.result.purchasedLiters, 'l') }}</td><td>{{ amount(detail.cycle.result.purchasesPer100Km, 'l/100 km') }}</td>
                <td>{{ amount(detail.cycle.result.differenceLiters, 'l') }}</td><td>{{ amount(detail.cycle.result.differencePercent, '%') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <section>
          <h3 class="mb-2 flex items-center gap-2 font-semibold"><IconReceipt class="h-4 w-4 text-ui-icon" />Tankowania ON w cyklu</h3>
          <div class="overflow-x-auto rounded-lg border border-ui-divider">
            <table class="ui-table" aria-label="Tankowania ON w cyklu">
              <thead class="ui-table-head"><tr class="divide-x divide-ui-divider [&>th]:px-3 [&>th]:py-2"><th>Data</th><th>Stacja</th><th>Ilość</th><th>Wliczenie</th></tr></thead>
              <tbody><tr v-for="purchase in detail.purchases" :key="purchase.id" class="ui-table-row divide-x divide-ui-divider [&>td]:px-3 [&>td]:py-2">
                <td class="whitespace-nowrap">{{ timestamp(purchase.at) }}</td><td>{{ purchase.provider }} {{ purchase.station }}</td>
                <td class="whitespace-nowrap">{{ amount(purchase.liters, 'l') }}</td><td class="text-sm">{{ purchase.included ? 'Wliczono' : 'Początek cyklu' }}</td>
              </tr></tbody>
              <tfoot class="border-t border-ui-divider bg-ui-muted"><tr><td colspan="2" class="px-3 py-2 font-semibold">Suma zakupów po tankowaniu początkowym</td><td colspan="2" class="px-3 py-2 font-semibold">{{ amount(detail.cycle.result.purchasedLiters, 'l') }}</td></tr></tfoot>
            </table>
          </div>
        </section>
        <details class="rounded-lg border border-ui-divider p-3">
          <summary class="cursor-pointer text-sm font-medium">Odczyty źródłowe CAN</summary>
          <FuelConsumptionMeasurement :measurement="detail.cycle.result.telemetry.can" :show-counter-decreases="false" class="mt-3" />
        </details>
        <p class="text-xs text-ui-mutedText">Obliczono {{ timestamp(detail.cycle.calculatedAt) }}.</p>
      </template>
    </AppModal>
  </section>
</template>
<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, ref, watch } from 'vue'
import { IconGasStation, IconChartLine, IconReceipt, IconCircleCheck, IconHelpCircle, IconListDetails, IconLoader2 } from '@tabler/icons-vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppLoadingIndicator from '@/components/ui/AppLoadingIndicator.vue'
import FuelSummaryTiles from './FuelSummaryTiles.vue'
import FuelConsumptionMeasurement from './FuelConsumptionMeasurement.vue'
import FuelCounterDecreases from './FuelCounterDecreases.vue'
import { fuelConsumptionService as service, type AutomaticCyclePage, type AutomaticCycleDetail, type AutomaticCycle } from '@/services/fuelConsumptionService'
import { getApiErrorMessage } from '@/services/api'
import { useWorkspacePolling } from '@/composables/useWorkspace'
defineProps<{ canManage: boolean }>()
const FuelCycleChart = defineAsyncComponent(() => import('./FuelCycleChart.vue'))
const search = ref(''), query = ref('')
const from = ref(''), to = ref(''), mode = ref('ALL'), page = ref(0)
const modeOptions = [{ value: 'ADJACENT', label: 'Sąsiednie tankowania' }, { value: 'ALL', label: 'Wszystkie pary pełnych tankowań' }]
const columns = ['Pojazd', 'Koniec / początek', 'Cykl', 'Dystans', 'Zakupy ON', 'CAN', 'Z zakupów', 'Różnica do CAN', 'Ocena', 'Szczegóły']
const report = ref<AutomaticCyclePage | null>(null), detail = ref<AutomaticCycleDetail | null>(null)
const loading = ref(false), error = ref(''), detailError = ref(''), detailLoading = ref(false)
const selected = ref<AutomaticCycle | null>(null)
const pending = computed(() => report.value ? report.value.total - report.value.confirmed : null)
let request: AbortController | undefined
let fetching = false
const date = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'short', timeStyle: 'short' })
const timestamp = (at: string) => date.format(new Date(at))
const amount = (value: number | null, unit: string) => value == null ? '—' : value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + unit
const issueLabels: Record<string, string> = {
  NO_INTERVAL: 'Brak porównywalnych odczytów.', MISSING_BOUNDARY: 'Brakuje odczytu przy granicy cyklu.',
  GAP: 'Przerwa w danych liczników.', SOURCE_CHANGE: 'Zmiana źródła lub urządzenia.',
  UNKNOWN_DEVICE: 'Brak identyfikatora urządzenia.', COUNTER_RESET: 'Wykryto cofnięcie licznika.',
  COUNTER_JUMP: 'Wykryto niewiarygodny skok licznika.', UNREVIEWED_VISITS: 'Tankowania w cyklu wymagają weryfikacji.',
  STATION_NOT_CONFIRMED: 'Brakuje potwierdzenia stacji przez GPS.', UNALIGNED_COUNTERS: 'Liczniki obejmują różne odczyty graniczne.',
  INVALID_DISTANCE: 'Brak kompletnego dodatniego dystansu.',
  INVALID_CAN_USAGE: 'Brak wiarygodnego dodatniego zużycia CAN.',
}
async function load(reset = false) {
  if (!reset && fetching) return
  request?.abort()
  const controller = new AbortController()
  request = controller
  loading.value = false
  fetching = false
  if (reset) error.value = ''
  if (from.value && to.value && from.value > to.value) { error.value = 'Data Od musi być wcześniejsza lub równa dacie Do.'; return }
  fetching = true
  if (reset) loading.value = true
  try {
    const data = await service.fleet(from.value, to.value, mode.value === 'ADJACENT', page.value, query.value, controller.signal)
    if (!controller.signal.aborted) { report.value = data; error.value = '' }
  } catch (cause) { if (!controller.signal.aborted) error.value = getApiErrorMessage(cause) }
  finally { if (request === controller) { loading.value = false; fetching = false } }
}
watch(search, (value, _previous, cleanup) => {
  const timer = window.setTimeout(() => { query.value = value.trim() }, 250)
  cleanup(() => window.clearTimeout(timer))
})
watch([query, from, to, mode], () => { page.value = 0; selected.value = null; report.value = null })
watch([query, from, to, mode, page], () => { void load(true) }, { immediate: true })
watch(selected, async (row, _previous, cleanup) => {
  const controller = new AbortController()
  cleanup(() => controller.abort())
  detail.value = null; detailError.value = ''; detailLoading.value = row != null
  if (row == null) return
  try {
    const data = await service.automaticDetail(String(row.vehicleId), row.id, controller.signal)
    if (!controller.signal.aborted) detail.value = data
  } catch (cause) { if (!controller.signal.aborted) detailError.value = getApiErrorMessage(cause) }
  finally { if (!controller.signal.aborted) detailLoading.value = false }
})
useWorkspacePolling(() => load(), 10000)
onBeforeUnmount(() => request?.abort())
</script>
