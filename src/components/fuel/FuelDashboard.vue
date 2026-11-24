<template>
  <section class="min-w-0 space-y-3 md:min-h-0 md:overflow-y-auto" aria-label="Przegląd paliwa">
    <p v-if="error" class="ui-error" role="alert">{{ error }}</p>
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" :aria-busy="initialLoading">
      <AppCard v-for="tile in tiles" :key="tile.label" compact>
        <div class="flex min-h-14 items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border" :class="tile.tone"><component :is="tile.icon" class="h-5 w-5" aria-hidden="true" /></div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-2"><h2 class="text-sm text-ui-mutedText">{{ tile.label }}</h2><span class="shrink-0 text-xs text-ui-mutedText">{{ monthLabel }}</span></div>
            <p class="mt-1 text-2xl font-semibold tabular-nums"><IconLoader2 v-if="initialLoading" class="h-6 w-6 animate-spin" aria-label="Ładowanie danych" /><span v-else>{{ amount(tile.value, tile.unit) }}</span></p>
          </div>
        </div>
        <div class="mt-3 flex min-h-9 items-start gap-1.5 text-xs text-ui-mutedText" :title="comparisonRange">
          <template v-if="tile.change != null">
            <component :is="tile.change < 0 ? IconTrendingDown : tile.change > 0 ? IconTrendingUp : IconMinus" class="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{{ tile.change === 0 ? 'Tyle samo co w ubiegłym miesiącu' : amount(Math.abs(tile.change), tile.unit) + (tile.change < 0 ? ' mniej' : ' więcej') + ' niż w ubiegłym miesiącu' }}</span>
          </template>
        </div>
      </AppCard>
    </div>
    <div v-if="canAnalyze" class="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,2.4fr)_minmax(17rem,1fr)]">
      <AppCard title="Trend spalania" :icon="IconChartLine" compact content-class="relative min-h-[19.5rem] !p-3">
        <template #actions>
          <div class="flex items-center gap-2">
            <IconLoader2 v-if="dashboard?.current.processing" class="h-4 w-4 animate-spin text-ui-mutedText" aria-label="Przeliczanie cykli" />
            <div class="inline-flex rounded-lg border border-ui-divider bg-ui-muted p-0.5" role="group" aria-label="Okres trendu spalania">
              <button v-for="option in periodOptions" :key="option.value" type="button" :aria-pressed="trendBucket === option.value" class="rounded-md px-2 py-1 text-xs font-medium" :class="trendBucket === option.value ? 'bg-ui-surface text-ui-text shadow-sm' : 'text-ui-mutedText'" @click="trendBucket = option.value">{{ option.label }}</button>
            </div>
          </div>
        </template>
        <FuelOverviewChart :report="trendReport" kind="trend" label="Trend trzech metod spalania całej floty" empty-message="Brak potwierdzonych cykli spalania." />
        <AppLoadingIndicator v-if="initialLoading" class="absolute inset-0 z-10 rounded-lg bg-ui-surface/85" />
      </AppCard>
      <AppCard title="Status tankowań" :icon="IconChartDonut" compact content-class="relative min-h-[19.5rem] !p-3">
        <FuelOverviewChart :report="current" kind="status" label="Status tankowań w bieżącym miesiącu" empty-message="Brak tankowań w bieżącym miesiącu." />
        <AppLoadingIndicator v-if="initialLoading" class="absolute inset-0 z-10 rounded-lg bg-ui-surface/85" />
      </AppCard>
    </div>
    <AppCard title="Tankowania w czasie" :icon="IconChartBar" compact content-class="relative min-h-[19.5rem] !p-3">
      <template #actions>
        <div class="inline-flex rounded-lg border border-ui-divider bg-ui-muted p-0.5" role="group" aria-label="Okres tankowań w czasie">
          <button v-for="option in periodOptions" :key="option.value" type="button" :aria-pressed="refuelBucket === option.value" class="rounded-md px-2 py-1 text-xs font-medium" :class="refuelBucket === option.value ? 'bg-ui-surface text-ui-text shadow-sm' : 'text-ui-mutedText'" @click="refuelBucket = option.value">{{ option.label }}</button>
        </div>
      </template>
      <FuelOverviewChart :report="refuelReport" kind="refuel" label="Ilości ON i AdBlue w czasie" empty-message="Brak transakcji paliwowych." />
      <AppLoadingIndicator v-if="initialLoading" class="absolute inset-0 z-10 rounded-lg bg-ui-surface/85" />
    </AppCard>
    <div v-if="canAnalyze" class="grid min-w-0 gap-3 lg:grid-cols-2">
      <AppCard title="Spalanie pojazdów" :icon="IconTruck" compact content-class="relative min-h-[19.5rem] !p-3">
        <template #actions><AppSelect v-model="method" :options="methodOptions" aria-label="Metoda spalania pojazdów" size="sm" class="w-44" /></template>
        <FuelOverviewChart :report="current" kind="ranking" :method="method" label="Porównanie spalania pojazdów w bieżącym miesiącu" empty-message="Brak wyników wybranej metody." />
        <AppLoadingIndicator v-if="initialLoading" class="absolute inset-0 z-10 rounded-lg bg-ui-surface/85" />
      </AppCard>
      <AppCard title="Najczęściej odwiedzane stacje" :icon="IconGasStation" compact content-class="relative min-h-[19.5rem] !p-3">
        <FuelOverviewChart :report="current" kind="stations" label="Najczęściej odwiedzane stacje w bieżącym miesiącu" empty-message="Brak rozpoznanych wizyt na stacjach." />
        <AppLoadingIndicator v-if="initialLoading" class="absolute inset-0 z-10 rounded-lg bg-ui-surface/85" />
      </AppCard>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, ref, watch } from 'vue'
import { IconAlertTriangle, IconChartBar, IconChartLine, IconChartDonut, IconGasStation, IconTruck, IconDroplet, IconLoader2, IconReceipt, IconTrendingDown, IconTrendingUp, IconMinus } from '@tabler/icons-vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppLoadingIndicator from '@/components/ui/AppLoadingIndicator.vue'
import { useAuthStore } from '@/stores/authStore'
import { useWorkspacePolling } from '@/composables/useWorkspace'
import { getApiErrorMessage } from '@/services/api'
import { fuelOverviewService, retainDashboardAnalytics, type FuelOverviewDashboard, type OverviewBucket, type OverviewMethod } from '@/services/fuelOverviewService'
const FuelOverviewChart = defineAsyncComponent(() => import('./FuelOverviewChart.vue'))
const auth = useAuthStore()
const has = (permission: string) => Boolean(auth.activeCompanyId && (auth.user?.sysAdmin || auth.user?.globalRoles?.includes('GLOBAL_ADMIN') || auth.hasActiveCompanyRole('COMPANY_ADMIN') || auth.hasActiveCompanyPermission(permission)))
const dashboard = ref<FuelOverviewDashboard | null>(null), loading = ref(false), error = ref('')
const current = computed(() => dashboard.value?.current || null)
const canAnalyze = computed(() => current.value?.canAnalyze ?? (has('vehicles.read') && has('positions.read')))
const initialLoading = computed(() => loading.value && !dashboard.value)
const trendBucket = ref<OverviewBucket>('WEEK'), refuelBucket = ref<OverviewBucket>('WEEK'), method = ref<OverviewMethod>('can')
const periodOptions = [{ value: 'WEEK' as const, label: 'Tygodnie' }, { value: 'MONTH' as const, label: 'Miesiące' }]
const methodOptions: { value: OverviewMethod; label: string }[] = [{ value: 'can', label: 'CAN' }, { value: 'transactions', label: 'Transakcje paliwowe' }, { value: 'adjusted', label: 'Skorygowane' }]
const trendReport = computed(() => current.value && dashboard.value ? { ...current.value, bucket: trendBucket.value, trend: trendBucket.value === 'WEEK' ? dashboard.value.weeklyTrend : dashboard.value.monthlyTrend } : null)
const refuelReport = computed(() => {
  if (!current.value || !dashboard.value) return null
  const week = new Date(current.value.to + 'T12:00:00Z'); week.setUTCDate(week.getUTCDate() - (week.getUTCDay() + 6) % 7 - 77)
  const from = refuelBucket.value === 'WEEK' ? week.toISOString().slice(0, 10) : dashboard.value.refuelingHistory[0]?.date || current.value.from
  return { ...current.value, from, bucket: refuelBucket.value, daily: dashboard.value.refuelingHistory.filter(day => day.date >= from) }
})
const monthLabel = computed(() => current.value ? current.value.from.slice(5, 7) + '.' + current.value.from.slice(0, 4) : '')
const comparisonRange = computed(() => dashboard.value ? current.value!.from + ' – ' + current.value!.to + ' / ' + dashboard.value.previousFrom + ' – ' + dashboard.value.previousTo : '')
const amount = (value: number | null | undefined, unit = '') => value == null ? '—' : value.toLocaleString('pl-PL', { maximumFractionDigits: 2 }) + (unit ? ' ' + unit : '')
function change(value: number | null | undefined, previous: number | null | undefined) { return value == null || previous == null ? null : value - previous }
const tiles = computed(() => {
  const now = current.value?.summary, before = dashboard.value?.previousMonth
  return [
    { label: 'Olej napędowy', value: now?.dieselLiters, change: change(now?.dieselLiters, before?.dieselLiters), unit: 'l', icon: IconGasStation, tone: 'border-info-400/25 bg-info-400/10 text-info-600 dark:text-info-400' },
    { label: 'AdBlue', value: now?.adBlueLiters, change: change(now?.adBlueLiters, before?.adBlueLiters), unit: 'l', icon: IconDroplet, tone: 'border-success-600/25 bg-success-600/10 text-success-600 dark:text-success-400' },
    { label: canAnalyze.value ? 'Tankowania ON' : 'Transakcje', value: canAnalyze.value ? now?.visits : now?.transactions, change: canAnalyze.value ? change(now?.visits, before?.visits) : change(now?.transactions, before?.transactions), unit: '', icon: IconReceipt, tone: 'border-ui-divider bg-ui-muted text-ui-icon' },
    { label: 'Do weryfikacji', value: now?.toVerify, change: change(now?.toVerify, before?.toVerify), unit: '', icon: IconAlertTriangle, tone: 'border-warning-600/25 bg-warning-600/10 text-warning-600 dark:text-warning-400' },
  ]
})
let request: AbortController | undefined
async function load(resetCompany = false) {
  if (!resetCompany && loading.value) return
  request?.abort(); const controller = new AbortController(); request = controller
  if (resetCompany) { dashboard.value = null; error.value = '' }
  loading.value = true
  try {
    const data = await fuelOverviewService.dashboard(controller.signal)
    if (!controller.signal.aborted) { dashboard.value = retainDashboardAnalytics(dashboard.value, data); error.value = '' }
  } catch (cause) { if (!controller.signal.aborted) error.value = getApiErrorMessage(cause) }
  finally { if (request === controller) loading.value = false }
}
watch(() => auth.activeCompanyId, () => load(true), { immediate: true })
useWorkspacePolling(() => load(), 30000)
onBeforeUnmount(() => request?.abort())
</script>
