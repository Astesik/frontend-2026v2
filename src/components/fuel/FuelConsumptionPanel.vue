<template>
  <section class="min-w-0 space-y-3 md:min-h-0 md:overflow-y-auto">
    <AppCard compact>
      <div class="grid gap-3 sm:grid-cols-3">
        <AppSelect v-model="vehicle" label="Pojazd" :options="vehicles" placeholder="Wybierz pojazd" />
        <AppInput v-model="from" type="date" label="Od" :max="to" />
        <AppInput v-model="to" type="date" label="Do" :min="from" />
      </div>
    </AppCard>
    <p v-if="vehicleError || periodError" role="alert" class="ui-error">{{ vehicleError || periodError }}</p>
    <p v-if="periodLoading" role="status" class="ui-caption">Obliczanie spalania…</p>
    <template v-if="period">
      <AppCard title="Spalanie CAN w wybranym okresie" compact>
        <FuelConsumptionMeasurement :measurement="period.telemetry.can" />
      </AppCard>
      <AppCard title="Od pełnego do pełnego" compact>
        <p v-if="period.purchases.length < 2" class="ui-caption">Do wyznaczenia cyklu potrzebne są dwa przypisane tankowania diesla. Możesz rozszerzyć zakres dat.</p>
        <template v-else>
          <div class="grid gap-3 sm:grid-cols-2">
            <AppSelect :model-value="start" label="Tankowanie początkowe" :options="startOptions" @update:model-value="value => { start = value; end = '' }" />
            <AppSelect v-model="end" label="Tankowanie końcowe" :disabled="!start" :options="endOptions" />
          </div>
          <details v-if="period.reviewed.length" class="ui-body-sm mt-3">
            <summary class="cursor-pointer">Zapisane cykle w tym okresie ({{ period.reviewed.length }})</summary>
            <div class="flex flex-wrap gap-2 pt-2">
              <div v-for="pair in period.reviewed" :key="pair.startId + '-' + pair.endId" class="flex items-center gap-1">
                <AppButton variant="secondary" size="sm" @click="start = String(pair.startId); end = String(pair.endId)">
                  {{ purchaseTimes.get(pair.startId) }} – {{ purchaseTimes.get(pair.endId) }}
                </AppButton>
                <AppButton v-if="canManage" variant="secondary" size="sm" :disabled="saving"
                  :aria-label="'Usuń cykl ' + purchaseTimes.get(pair.startId) + ' – ' + purchaseTimes.get(pair.endId)"
                  @click="removeCycle(pair)">Usuń</AppButton>
              </div>
            </div>
          </details>
          <p v-if="cycleLoading" role="status" class="ui-caption mt-3">Sprawdzanie zakupów i liczników…</p>
          <p v-if="cycleError || saveError" role="alert" class="ui-error mt-3">{{ cycleError || saveError }}</p>
          <AppButton v-if="cycleError || saveError" size="sm" variant="secondary" @click="revision++">Odśwież cykl</AppButton>
          <div v-if="cycle" class="mt-4 space-y-4">
            <div>
              <h3 class="font-semibold">Zakupy diesla w cyklu</h3>
              <ul class="mt-1 divide-y divide-ui-border">
                <li v-for="(purchase, index) in cycle.purchases" :key="purchase.id" class="flex flex-wrap justify-between gap-1 py-2 ui-body-sm">
                  <span>{{ timestamp(purchase.at) }} · {{ purchase.provider }} · {{ purchase.station || 'Stacja bez nazwy' }}</span>
                  <span>{{ amount(purchase.quantity, purchase.unit || '') }}{{ index === 0 ? ' · początek, poza sumą' : '' }}</span>
                  <span v-if="invalidPurchase(purchase)" class="w-full text-warning-600">{{ invalidPurchase(purchase) }}</span>
                </li>
              </ul>
              <p class="font-medium">Zakupy po początkowym tankowaniu: {{ amount(cycle.purchasedLiters, 'l') }}</p>
            </div>
            <div class="space-y-2 rounded-lg border border-ui-border p-3">
              <p v-if="cycle.confirmed" class="font-medium">Potwierdzono pełne zbiorniki na obu końcach cyklu i komplet zakupów.</p>
              <p v-else-if="!cycle.validQuantities" class="ui-caption">Potwierdzenie wymaga dodatniej ilości diesla w litrach. Oznaczone zakupy wymagają sprawdzenia.</p>
              <template v-else-if="canManage">
                <label class="flex items-start gap-2"><input v-model="full" type="checkbox" class="mt-1" /> Po obu wskazanych tankowaniach wszystkie zbiorniki diesla były pełne.</label>
                <label class="flex items-start gap-2"><input v-model="complete" type="checkbox" class="mt-1" /> Sprawdziłem, że lista obejmuje cały diesel wlany do tego pojazdu, ze wszystkich kart i pozostałych zakupów.</label>
              </template>
              <p v-else class="ui-caption">Cykl oczekuje na potwierdzenie pełnych zbiorników i zakupów.</p>
              <AppButton v-if="canManage && (cycle.confirmed || cycle.validQuantities)" size="sm" variant="secondary" :loading="saving"
                :disabled="!cycle.confirmed && !(full && complete)" @click="confirm">
                {{ cycle.confirmed ? 'Cofnij potwierdzenie' : 'Potwierdź cykl' }}
              </AppButton>
            </div>
            <div class="space-y-1">
              <h3 class="font-semibold">Odczyty przy końcowym tankowaniu</h3>
              <p v-if="endReadingError" class="ui-error">{{ endReadingError }}</p>
              <template v-else-if="endReading">
                <p class="ui-body-sm">Ostatni przebieg przed tankowaniem · {{ endReading.mileage
                  ? amount(endReading.mileage.kilometers, 'km') + ' · ' + timestamp(endReading.mileage.measuredAt) : 'Brak odczytu' }}</p>
                <p v-if="endReading.fuel?.trend" class="ui-body-sm">Poziom diesla z CAN · {{ fuelTrendLabels[endReading.fuel.trend] }}</p>
                <p v-if="endReading.fuel?.trend" class="ui-caption">Przed tankowaniem {{ level(endReading.fuel.before) }} ·
                  Po tankowaniu {{ level(endReading.fuel.after) }} · Liczba odczytów w ciągu godziny {{ endReading.fuel.sampleCountAfter }}</p>
              </template>
              <p v-else class="ui-caption">{{ endReadingLoading ? 'Pobieranie odczytów…' : 'Brak aktualnego wyniku weryfikacji tankowania.' }}</p>
            </div>
            <h3 class="font-semibold">CAN między wybranymi tankowaniami</h3>
            <FuelConsumptionMeasurement :measurement="cycle.telemetry.can" />
            <dl v-if="cycle.confirmed" class="grid gap-3 sm:grid-cols-2">
              <div><dt class="ui-caption">Spalanie od pełnego do pełnego</dt><dd class="font-semibold">{{ amount(cycle.fullToFullPer100Km, 'l/100 km') }}</dd></div>
              <div><dt class="ui-caption">Różnica (zakupy − zużycie CAN)</dt><dd class="font-semibold">{{ amount(cycle.differenceLiters, 'l') }}</dd></div>
            </dl>
            <p v-if="cycle.confirmed && cycle.telemetry.distance.first && cycle.telemetry.distance.last" class="ui-caption">
              Dystans z odczytów: {{ amount(cycle.telemetry.distance.kilometers, 'km') }}
              · {{ timestamp(cycle.telemetry.distance.first.at) }} – {{ timestamp(cycle.telemetry.distance.last.at) }}.
              Na obu granicach cyklu uwzględniamy przebieg zapisany do 32 minut przed transakcją.
            </p>
            <p v-if="cycle.confirmed && (cycle.fullToFullPer100Km == null || cycle.differenceLiters == null)" class="ui-caption">
              Spalanie z zakupów wymaga ciągłego, dodatniego dystansu. Porównanie litrów wymaga również ciągłych danych CAN z tymi samymi odczytami granicznymi.
            </p>
          </div>
        </template>
      </AppCard>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import FuelConsumptionMeasurement from './FuelConsumptionMeasurement.vue'
import { vehicleService } from '@/services/vehicleService'
import { getApiErrorMessage } from '@/services/api'
import { fuelConsumptionService as service, type ConsumptionPeriod, type CycleReference, type DieselPurchase, type FuelCycle } from '@/services/fuelConsumptionService'
import { fuelVerificationService, fuelTrendLabels, type FuelVerification } from '@/services/fuelVerificationService'
import type { FuelTankObservation } from '@/services/fuelTankService'
import { businessToday, shiftReturnDate } from '@/utils/vehicleReturn'

defineProps<{ canManage: boolean }>()
const vehicle = ref(''), vehicles = ref<{ value: string; label: string }[]>([]), vehicleError = ref('')
const to = ref(businessToday()), from = ref(shiftReturnDate(to.value, -6))
const start = ref(''), end = ref(''), revision = ref(0)
const period = ref<ConsumptionPeriod | null>(null), cycle = ref<FuelCycle | null>(null)
const periodLoading = ref(false), cycleLoading = ref(false), saving = ref(false)
const periodError = ref(''), cycleError = ref(''), saveError = ref('')
const full = ref(false), complete = ref(false)
const number = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 })
const formatter = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'short', timeStyle: 'short' })
const timestamp = (at: string) => formatter.format(new Date(at))
const amount = (value: number | null, unit: string) => value == null ? '—' : number.format(value) + ' ' + unit
const level = (reading: FuelTankObservation | null) => reading?.percent == null ? 'brak odczytu' :
  amount(reading.percent, '%') + ' (' + timestamp(reading.source.recordedAt) + ')'
const endReading = ref<FuelVerification['result'] | null>(null)
const endReadingError = ref(''), endReadingLoading = ref(false)
watch([vehicle, end, revision], async (_, __, cleanup) => {
  const request = new AbortController()
  cleanup(() => request.abort())
  endReading.value = null
  endReadingError.value = ''
  endReadingLoading.value = Boolean(end.value)
  if (!end.value) return
  try {
    const check = await fuelVerificationService.latest(Number(end.value), request.signal)
    if (!request.signal.aborted) endReading.value = check?.result ?? null
  } catch (cause) {
    if (!request.signal.aborted) endReadingError.value = getApiErrorMessage(cause)
  } finally { if (!request.signal.aborted) endReadingLoading.value = false }
})
const option = (p: DieselPurchase) => ({ value: String(p.id), label: [timestamp(p.at), p.provider, p.station, amount(p.quantity, p.unit)].filter(Boolean).join(' · ') })
const startOptions = computed(() => period.value?.purchases.slice(0, -1).map(option) ?? [])
const purchaseTimes = computed(() => new Map(period.value?.purchases.map(p => [p.id, timestamp(p.at)])))
const endOptions = computed(() => {
  const rows = period.value?.purchases ?? []
  const first = rows.find(p => String(p.id) === start.value)
  return first ? rows.filter(p => Date.parse(p.at) > Date.parse(first.at)).map(option) : []
})

onMounted(async () => {
  try {
    vehicles.value = (await vehicleService.getVehicles({ silent: true })).filter(v => v.type !== 'TRAILER')
      .map(v => ({ value: String(v.id), label: v.licensePlate })).sort((a,b) => a.label.localeCompare(b.label, 'pl'))
    if (vehicles.value.length === 1) vehicle.value = vehicles.value[0].value
  } catch (cause) { vehicleError.value = getApiErrorMessage(cause) }
})
watch([vehicle, from, to], async (_, __, cleanup) => {
  const request = new AbortController()
  cleanup(() => request.abort())
  period.value = null
  periodError.value = ''
  start.value = ''
  end.value = ''
  periodLoading.value = false
  if (!vehicle.value || !from.value || !to.value) return
  periodLoading.value = true
  try {
    const data = await service.period(vehicle.value, from.value, to.value, request.signal)
    if (!request.signal.aborted) period.value = data
  } catch (cause) {
    if (!request.signal.aborted) periodError.value = getApiErrorMessage(cause)
  } finally { if (!request.signal.aborted) periodLoading.value = false }
})
watch([vehicle, start, end, revision], async (_, __, cleanup) => {
  const request = new AbortController()
  cleanup(() => request.abort())
  cycle.value = null
  cycleLoading.value = false
  cycleError.value = saveError.value = ''
  full.value = complete.value = false
  if (!start.value || !end.value) return
  cycleLoading.value = true
  try {
    const data = await service.cycle(vehicle.value, start.value, end.value, request.signal)
    if (!request.signal.aborted) cycle.value = data
  } catch (cause) {
    if (!request.signal.aborted) cycleError.value = getApiErrorMessage(cause)
  } finally { if (!request.signal.aborted) cycleLoading.value = false }
})
function invalidPurchase(purchase: DieselPurchase) {
  if (purchase.quantity == null) return 'Brak ilości paliwa.'
  if (purchase.quantity <= 0) return 'Ilość paliwa musi być dodatnia.'
  return purchase.unit?.trim().toUpperCase() === 'L' ? '' : 'Oczekiwano litrów. Jednostka zakupu: ' + (purchase.unit || 'brak')
}

async function removeCycle(pair: CycleReference) {
  const current = period.value
  if (!current || saving.value || !window.confirm('Usunąć zapisany cykl ' + purchaseTimes.value.get(pair.startId)
    + ' – ' + purchaseTimes.value.get(pair.endId) + '? Tankowania pozostaną w historii.')) return
  saving.value = true
  saveError.value = ''
  try {
    await service.remove(vehicle.value, pair.startId, pair.endId)
    if (current !== period.value) return
    current.reviewed = current.reviewed.filter(p => p.startId !== pair.startId || p.endId !== pair.endId)
    if (start.value === String(pair.startId) && end.value === String(pair.endId)) {
      start.value = end.value = ''
    }
  } catch (cause) {
    if (current === period.value) saveError.value = getApiErrorMessage(cause)
  } finally { saving.value = false }
}

async function confirm() {
  const selected = cycle.value
  if (!selected || saving.value) return
  saving.value = true
  saveError.value = ''
  try {
    await service.confirm(vehicle.value, start.value, end.value, selected.signature, !selected.confirmed)
    if (cycle.value === selected) {
      const startId = Number(start.value), endId = Number(end.value)
      if (period.value && !period.value.reviewed.some(p => p.startId === startId && p.endId === endId)) {
        period.value.reviewed.unshift({ startId, endId })
      }
      revision.value++
    }
  } catch (cause) {
    if (cycle.value === selected) saveError.value = getApiErrorMessage(cause)
  } finally { saving.value = false }
}
</script>
