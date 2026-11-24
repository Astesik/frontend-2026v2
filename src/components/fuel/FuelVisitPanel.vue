<template>
  <section class="flex min-w-0 flex-col gap-3 md:min-h-0 md:flex-1">
    <FuelSummaryTiles :total="totals?.total" :pending="totals?.toVerify" :loading="loading" total-label="Liczba spalań" pending-label="Spalania do weryfikacji" />
  <AppCard title="Wizyty na stacjach" :icon="IconGasStation" compact class="flex min-w-0 flex-col md:min-h-0 md:flex-1" content-class="flex min-h-0 flex-1 flex-col !p-0">
    <div class="flex flex-wrap items-end gap-3 border-b border-ui-divider p-3">
      <AppInput v-model="search" label="Szukaj pojazdu" placeholder="Numer rejestracyjny" type="search" size="sm" clearable :maxlength="120" class="min-w-48 flex-1 sm:max-w-xs" />
      <AppSelect v-model="reviewStatus" label="Status wizyty" size="sm" :options="statusOptions" class="w-full sm:w-48" />
    </div>
    <div class="relative flex min-h-48 flex-1 flex-col" :aria-busy="loading && !rows.length">
      <div class="max-h-[70dvh] min-h-0 flex-1 overflow-auto md:max-h-none">
        <table class="ui-table min-w-[52rem] table-auto !text-[14px]" aria-label="Wizyty na stacjach">
          <thead class="ui-table-head">
            <tr class="divide-x divide-ui-divider">
              <th v-for="column in columns" :key="column" scope="col" class="sticky top-0 z-10 h-11 whitespace-nowrap bg-ui-muted px-3 py-1" :class="column === 'Stacja' ? 'w-full' : 'w-px'">
                {{ column }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(visit, i) in rows" :key="visit.id" class="ui-table-row divide-x divide-ui-divider [&>td]:px-3 [&>td]:py-2 [&>td]:align-middle">
              <td class="tabular-nums text-ui-mutedText">{{ page * 30 + i + 1 }}.</td>
              <td class="whitespace-nowrap font-semibold">{{ visit.plate }}</td>
              <td class="min-w-40">
                <FuelStationInfo v-bind="stationDetails(primaryPurchase(visit), visit.station)" :can-create-station="canCreateStation"
                  @create-station="createStation(primaryPurchase(visit), visit.station)" />
              </td>
              <td class="whitespace-nowrap"><time :datetime="visit.at" class="tabular-nums">{{ day(visit.at) }}<span class="block text-ui-mutedText">{{ clock(visit.at) }}</span></time></td>
              <td class="whitespace-nowrap text-right tabular-nums">{{ visit.diesel ? liters(visit.diesel) : '—' }}</td>
              <td class="whitespace-nowrap text-right tabular-nums">{{ visit.adblue ? liters(visit.adblue) : '—' }}</td>
              <td class="whitespace-nowrap">
                <span v-if="visit.diesel > 0" class="inline-flex items-center gap-1.5 text-sm" :title="assessment(visit)">
                  <component :is="visit.decision === 'FULL' ? IconGasStation : visit.decision === 'PARTIAL' ? IconDroplet : IconHelpCircle" class="h-4 w-4 text-ui-icon" aria-hidden="true" />
                  {{ visit.decision === 'FULL' ? 'Do pełna' : visit.decision === 'PARTIAL' ? 'Częściowe' : 'Do weryfikacji' }}
                </span>
                <span v-else class="text-ui-mutedText">—</span>
              </td>
              <td>
                <span class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium"
                  :class="visitStatus(visit).color" :title="assessment(visit)">
                  <component :is="visitStatus(visit).icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
                  {{ visitStatus(visit).label }}
                </span>
              </td>
              <td class="whitespace-nowrap tabular-nums">{{ visit.adjustedConsumptionL100km == null ? '—' : number.format(visit.adjustedConsumptionL100km) + ' l/100 km' }}</td>
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

  <AppModal v-if="selected" :open="true" center-in-viewport size="lg" :title="selected.plate + ' · ' + visitStation(selected) + ' · ' + date(selected.at)"
     body-class="space-y-5" @close="selectedId = null">
    <section>
      <h3 class="flex items-center gap-2 text-[16px] font-semibold"><IconReceipt class="h-5 w-5 text-ui-icon" />Transakcje podczas wizyty</h3>
      <div class="mt-2 overflow-x-auto rounded-lg border border-ui-divider">
        <table class="ui-table w-full text-left !text-[14px]" aria-label="Transakcje podczas wizyty">
          <thead class="ui-table-head"><tr class="divide-x divide-ui-divider [&>th]:px-3 [&>th]:py-2">
            <th scope="col">Data</th><th scope="col">Stacja</th><th scope="col">Produkt</th><th scope="col" class="text-right">Ilość</th>
          </tr></thead>
          <tbody>
            <tr v-for="p in sortedPurchases" :key="p.id" class="ui-table-row divide-x divide-ui-divider [&>td]:px-3 [&>td]:py-2">
              <td class="tabular-nums">{{ date(p.at) }}</td>
              <td class="min-w-40"><FuelStationInfo v-bind="stationDetails(p, selected.station)" :can-create-station="canCreateStation" @create-station="createStation(p, selected.station)" /></td>
              <td>{{ p.product === 'DIESEL' ? 'Olej napędowy' : 'AdBlue' }}</td><td class="whitespace-nowrap text-right font-medium tabular-nums">{{ liters(p.liters) }}</td>
            </tr>
          </tbody>
          <tfoot class="border-t border-ui-divider bg-ui-muted font-semibold">
            <tr v-if="selected.diesel > 0"><td colspan="3" class="px-3 py-2">Suma oleju napędowego</td><td class="whitespace-nowrap px-3 py-2 text-right tabular-nums">{{ liters(selected.diesel) }}</td></tr>
            <tr v-if="selected.adblue > 0"><td colspan="3" class="px-3 py-2">Suma AdBlue</td><td class="whitespace-nowrap px-3 py-2 text-right tabular-nums">{{ liters(selected.adblue) }}</td></tr>
          </tfoot>
        </table>
      </div>
    </section>
    <section v-if="anchor" class="rounded-lg border border-ui-divider p-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h3 class="flex items-center gap-2 text-[16px] font-semibold"><IconChartLine class="h-5 w-5 text-ui-icon" />Poziom paliwa</h3>
        <AppButton size="sm" variant="secondary" @click="mapOpen = !mapOpen"><IconMap class="mr-2 h-4 w-4" />{{ mapOpen ? 'Zamknij mapę' : 'Pokaż trasę na mapie' }}</AppButton>
      </div>
      <FuelVisitChart :id="selected.id" :run-id="selected.runId" :at="anchor" />
    </section>

    <FuelVisitConsumption :id="selected.id" :run-id="selected.runId" :diesel="selected.diesel" />
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
  <AppModal v-if="selected && mapOpen" :open="true" center-in-viewport size="xl" panel-class="lg:!max-w-[min(96vw,100rem)]"
    :title="'Trasa · ' + selected.plate" :description="visitStation(selected) + ' · ' + date(selected.at)"
    @close="mapOpen = false">
    <FuelVisitMap :key="selected.id + '-' + mapAttempt" :id="selected.id" @retry="mapAttempt++" />
  </AppModal>
  <FuelStationFormModal v-if="stationDraft && canCreateStation" :open="true" :station="null" :initial-values="stationDraft"
    @close="stationDraft = null" @saved="load()" />
  </section>
</template>
<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch, onBeforeUnmount } from 'vue'
import { IconChartLine, IconCircleCheck, IconClipboardCheck, IconDroplet, IconGasStation,
  IconMap, IconHelpCircle, IconListDetails, IconMapPin, IconReceipt } from '@tabler/icons-vue'
import FuelStationInfo from './FuelStationInfo.vue'
import { useFuelStationPermissions } from '@/composables/useFuelStationPermissions'
import { useFuelStationStore } from '@/stores/fuelStationStore'
import { useAuthStore } from '@/stores/authStore'
import type { FuelStationWrite } from '@/types/fuelStation'
import FuelSummaryTiles from './FuelSummaryTiles.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppLoadingIndicator from '@/components/ui/AppLoadingIndicator.vue'
import { useWorkspacePolling } from '@/composables/useWorkspace'
import { getApiErrorMessage } from '@/services/api'
import { fuelVisitService, type Visit, type VisitPurchase, type Decision, type VisitTotals } from '@/services/fuelVisitService'

defineProps<{ canManage: boolean }>()
const auth = useAuthStore()
const stationStore = useFuelStationStore()
const { canRead: canReadStations, canManage: canManageStations } = useFuelStationPermissions()
const canCreateStation = computed(() => canReadStations.value && canManageStations.value)
const stationDraft = ref<FuelStationWrite | null>(null)
watch(canCreateStation, allowed => { if (!allowed) stationDraft.value = null })
const FuelStationFormModal = defineAsyncComponent(() => import('@/components/fuel-stations/FuelStationFormModal.vue'))
function primaryPurchase(visit: Visit) { return visit.purchases.find(p => p.product === 'DIESEL') ?? visit.purchases[0] }
function stationDetails(purchase?: VisitPurchase, fallback?: string) {
  const name = purchase?.station || fallback
  return { stationName: name && name !== purchase?.code && name !== 'Nieznana stacja' ? name : null,
    stationCode: purchase?.code || '', country: purchase?.country, stationKnown: purchase?.stationKnown ?? true }
}
function createStation(purchase?: VisitPurchase, fallback?: string) {
  if (!canCreateStation.value || !purchase?.code || purchase.stationKnown !== false) return
  stationStore.ensureCompany(auth.activeCompanyId)
  void stationStore.loadProviders()
  stationDraft.value = { provider: purchase.provider, stationCode: purchase.code,
    stationName: stationDetails(purchase, fallback).stationName || '', country: purchase.country || '', lat: null, lng: null }
}
const FuelVisitChart = defineAsyncComponent(() => import('./FuelVisitChart.vue'))
const FuelVisitConsumption = defineAsyncComponent(() => import('./FuelVisitConsumption.vue'))
const FuelVisitMap = defineAsyncComponent(() => import('./FuelVisitMap.vue'))
const mapOpen = ref(false), mapAttempt = ref(0)
function visitStation(visit: Visit) {
  const purchase = primaryPurchase(visit)
  return [purchase?.provider, purchase?.station || visit.station].filter(Boolean).join(' ')
}
const columns = ['Lp.', 'Pojazd', 'Stacja', 'Data', 'Olej napędowy', 'AdBlue', 'Status', 'Ocena wizyty', 'Skorygowane', 'Szczegóły']
const reviewStatus = ref('ALL')
const statusOptions = [
  { value: 'ALL', label: 'Wszystkie' },
  { value: 'PENDING', label: 'Do weryfikacji' },
  { value: 'CONFIRMED', label: 'Zweryfikowane' },
]
const totals = ref<VisitTotals | null>(null)
const search = ref(''), page = ref(0), rows = ref<Visit[]>([]), more = ref(false)
const loading = ref(false), saving = ref(false), error = ref(''), saveError = ref('')
const selectedId = ref<number | null>(null)
watch(selectedId, () => { mapOpen.value = false })
const selected = computed(() => rows.value.find(v => v.id === selectedId.value))
const sortedPurchases = computed(() => [...(selected.value?.purchases ?? [])].sort((a, b) =>
  Number(a.product === 'ADBLUE') - Number(b.product === 'ADBLUE') || Date.parse(a.at) - Date.parse(b.at)))
const anchor = computed(() => {
  const rows = selected.value?.purchases ?? []
  const diesel = rows.filter(p => p.product === 'DIESEL')
  const dates = (diesel.length ? diesel : rows).map(p => Date.parse(p.at))
  return dates.length ? new Date((Math.min(...dates) + Math.max(...dates)) / 2).toISOString() : ''
})
function openVisit(visit: Visit) {
  selectedId.value = visit.id
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
const visitStatuses = {
  confirmed: { label: 'Potwierdzono', icon: IconCircleCheck, color: 'border-success-600/25 bg-success-600/10 text-success-600 dark:text-success-400' },
  pending: { label: 'Do weryfikacji', icon: IconHelpCircle, color: 'border-warning-600/25 bg-warning-600/10 text-warning-600 dark:text-warning-400' },
  adblue: { label: 'Tylko AdBlue', icon: IconDroplet, color: 'border-ui-divider bg-ui-muted text-ui-mutedText' },
}
function visitStatus(visit: Visit) {
  if (visit.decision === 'FULL' || visit.decision === 'PARTIAL') return visitStatuses.confirmed
  return visit.diesel > 0 ? visitStatuses.pending : visitStatuses.adblue
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
    const data = await fuelVisitService.list(search.value.trim(), page.value, controller.signal, reviewStatus.value)
    if (controller.signal.aborted) return
    totals.value = data.totals
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
watch([search, reviewStatus], () => { page.value = 0 })
watch([search,page,reviewStatus], () => { selectedId.value = null; totals.value = null; rows.value = []; more.value = false; void load() }, { immediate: true })
useWorkspacePolling(async () => { if (!loading.value && !saving.value) await load() }, 10000)
onBeforeUnmount(() => request?.abort())
</script>
