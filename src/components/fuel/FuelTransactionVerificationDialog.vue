<template>
  <AppModal :open="!!transaction" title="Weryfikacja GPS" size="lg" :busy="busy" @close="emit('close')">
    <div v-if="transaction" class="space-y-3">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="ui-caption">Data transakcji · {{ transaction.stationName || transaction.stationCode || 'Nieznana stacja' }}</p>
          <time :datetime="transaction.reportedAt" class="font-semibold tabular-nums text-ui-text">{{ reportedDate }}</time>
        </div>
        <div v-if="check">
          <p class="ui-caption">Data weryfikacji</p>
          <time :datetime="check.checkedAt" class="font-semibold tabular-nums text-ui-text">{{ dateLabel(check.checkedAt) }}</time>
        </div>
      </div>
      <p v-if="error" class="ui-error" role="alert">{{ error }}</p>
      <p v-else-if="busy" class="ui-caption" role="status">Pobieranie wyniku…</p>
      <div class="overflow-hidden rounded-lg border border-ui-divider">
        <table class="ui-table" aria-label="Wyniki weryfikacji GPS">
          <thead class="ui-table-head">
            <tr>
              <th scope="col" class="ui-table-cell border-r border-ui-divider">Co sprawdzono</th>
              <th scope="col" class="ui-table-cell">Status i wynik</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ui-divider">
            <tr v-for="row in checks" :key="row.name">
              <th scope="row" class="ui-table-cell border-r border-ui-divider text-left font-medium">{{ row.name }}</th>
              <td class="ui-table-cell">
                <div class="flex items-center gap-2">
                  <component :is="row.ok ? IconCircleCheck : IconAlertTriangle" class="h-4 w-4 shrink-0"
                    :class="row.ok ? 'text-success-600 dark:text-success-400' : 'text-warning-600 dark:text-warning-400'" aria-hidden="true" />
                  <span><strong class="font-medium">{{ row.ok ? 'Zatwierdzone' : 'Wymaga uwagi' }}</strong> · {{ row.result }}</span>
                  <AppTooltip :text="row.detail">
                    <button type="button" class="inline-flex h-6 w-6 items-center justify-center rounded text-ui-icon hover:text-ui-text focus-visible:ring-2 focus-visible:ring-ui-focus"
                      :aria-label="`Szczegóły: ${row.name}. ${row.detail}`">
                      <IconInfoCircle class="h-4 w-4" aria-hidden="true" />
                    </button>
                  </AppTooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <template #footer>
      <AppButton variant="secondary" :disabled="busy" @click="emit('close')">Zamknij</AppButton>
      <AppButton v-if="canVerify" :loading="busy" @click="run(true)">{{ check ? 'Sprawdź ponownie' : 'Sprawdź GPS' }}</AppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { IconAlertTriangle, IconCircleCheck, IconInfoCircle } from '@tabler/icons-vue'
import AppTooltip from '@/components/ui/AppTooltip.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { getApiErrorMessage } from '@/services/api'
import type { FuelTransactionRow } from '@/services/fuelImportService'
import { fuelGpsLabels, fuelTrendLabels, fuelVerificationService, type FuelVerification } from '@/services/fuelVerificationService'
import { HISTORY_TIMEZONE } from '@/utils/historyTime'

const props = defineProps<{ transaction: FuelTransactionRow | null; canVerify: boolean }>()
const emit = defineEmits<{ close: [] }>()
const check = ref<FuelVerification | null>(null)
const busy = ref(false)
const error = ref('')
const reportedDate = computed(() => {
  const value = props.transaction?.reportedAt
  return value ? value.slice(0, 10).split('-').reverse().join('.') + ', ' + value.slice(11, 16) : ''
})
const date = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeStyle: 'short', timeZone: HISTORY_TIMEZONE })
const stopDate = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeStyle: 'medium', timeZone: HISTORY_TIMEZONE })
const number = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 })
const mileageSource = { VEHICLE_COUNTER: 'licznik pojazdu', GPS_ESTIMATE: 'GPS', DEVICE_ESTIMATE: 'urządzenie' }
const dateLabel = (value: string) => date.format(new Date(value))
const distance = (meters: number) => meters >= 1000 ? number.format(meters / 1000) + ' km od stacji' : number.format(meters) + ' m od stacji'

function stopDuration(from: Date, to: Date) {
  const seconds = Math.round((to.getTime() - from.getTime()) / 1000)
  const minutes = Math.floor(seconds / 60)
  if (!minutes) return `${seconds} s`
  return seconds % 60 ? `${minutes} min ${seconds % 60} s` : `${minutes} min`
}

type VerificationRow = { name: string; ok: boolean; result: string; detail: string }
const checks = computed<VerificationRow[]>(() => {
  const transaction = props.transaction
  if (!transaction) return []
  const result = check.value?.result
  const rows: VerificationRow[] = [
    { name: 'Przypisanie karty', ok: transaction.vehicleId != null,
      result: transaction.vehiclePlate || (transaction.vehicleId != null ? 'Karta przypisana' : 'Brak przypisania'),
      detail: `Przypisanie na dzień transakcji. ${transaction.provider ?? 'IDS'} · ${transaction.cardNumberSuffix ?? transaction.maskedCard}` },
    { name: 'Stacja w katalogu', ok: transaction.stationKnown,
      result: transaction.stationName || transaction.stationCode || 'Nieznana stacja',
      detail: transaction.stationKnown ? `Znaleziono stację o kodzie ${transaction.stationCode}.` : 'Brak stacji o podanym kodzie w katalogu.' },
  ]
  if (!result && busy.value) return rows
  const status = result?.status ?? (transaction.gpsStatus === 'AT_STATION' && !error.value ? 'NOT_CHECKED' : transaction.gpsStatus ?? 'NOT_CHECKED')
  rows.push({ name: 'Zgodność lokalizacji GPS', ok: status === 'AT_STATION', result: fuelGpsLabels[status],
    detail: result ? 'Wynik porównania pozycji pojazdu z lokalizacją stacji w czasie zgłoszonym przez dostawcę.'
      : error.value || 'Brak aktualnego szczegółowego wyniku GPS dla tej transakcji.' })
  if (!result) return rows

  rows.push({ name: 'Pozycje GPS', ok: result.usablePositions > 0, result: `${result.usablePositions} z ${result.samples} odczytów`,
    detail: 'Liczba odczytów z prawidłową pozycją spośród wszystkich próbek w oknie weryfikacji.' })
  const { point, rules, stationStop, mileage } = result
  if (point) {
    const withinRadius = rules && point.distanceMeters <= rules.stationRadiusMeters
    const withinTime = rules && Math.max(-point.secondsFromReport, point.secondsFromReport - rules.reportPrecisionSeconds, 0) <= rules.positionToleranceSeconds
    rows.push({ name: 'Punkt GPS przy stacji', ok: Boolean(withinRadius && withinTime), result: distance(point.distanceMeters),
      detail: [dateLabel(point.recordedAt), timeDifference(point.secondsFromReport),
        point.speedKph != null && `${number.format(point.speedKph)} km/h`,
        rules && !withinRadius && 'Poza promieniem stacji', rules && !withinTime && 'Poza dopuszczalnym oknem czasu',
        !rules && 'Brak zapisanych progów oceny punktu'].filter(Boolean).join(' · ') })
  }
  if (stationStop) {
    const from = new Date(stationStop.from), to = new Date(stationStop.to)
    rows.push({ name: 'Czas postoju przy tankowaniu', ok: true,
      result: `${stopDate.formatRange(from, to)} (${stopDuration(from, to)})`,
      detail: 'Zakres między odczytami GPS potwierdzającymi postój pojazdu przy stacji.' })
  } else {
    rows.push({ name: 'Czas postoju przy tankowaniu', ok: false, result: 'Nieustalony',
      detail: 'Odczyty GPS nie wyznaczyły początku i końca postoju przy stacji.' })
  }
  rows.push({ name: 'Ostatni przebieg przed tankowaniem', ok: !!mileage, result: mileage ? `${number.format(mileage.kilometers)} km · ${dateLabel(mileage.measuredAt)}` : 'Brak odczytu',
    detail: mileage ? [mileageSource[mileage.source], dateLabel(mileage.measuredAt), timeDifference(mileage.secondsFromReport),
      mileage.fromStationStop && 'Odczyt z tego samego postoju'].filter(Boolean).join(' · ') : 'Brak wcześniejszego odczytu przebiegu.' })
  const fuel = result.fuel
  if (fuel?.trend) {
    const reading = (value: typeof fuel.before) => value?.percent == null ? 'brak odczytu' :
      number.format(value.percent) + '% (' + dateLabel(value.source.recordedAt) + ')'
    rows.push({ name: 'Poziom diesla z CAN', ok: fuel.trend === 'RISE_OBSERVED',
      result: fuelTrendLabels[fuel.trend] + ' · ' + reading(fuel.before) + ' → ' + reading(fuel.after),
      detail: 'Odczyty sondy do godziny po transakcji: ' + fuel.sampleCountAfter +
        '. Kilka zakupów na jednym postoju może obejmować ten sam wzrost poziomu.' })
  }
  if (result.status === 'LOCATION_MISMATCH') {
    for (const [name, reading] of [['Przed tankowaniem', result.before], ['Po tankowaniu', result.after]] as const) {
      if (reading) rows.push({ name, ok: false, result: distance(reading.distanceMeters),
        detail: `${dateLabel(reading.recordedAt)} · ${timeDifference(reading.secondsFromReport)}` })
    }
  }
  return rows
})

function timeDifference(seconds: number) {
  if (!seconds) return 'O godzinie transakcji'
  const magnitude = Math.abs(seconds)
  const elapsed = magnitude >= 60 ? number.format(magnitude / 60) + ' min' : magnitude + ' s'
  return elapsed + (seconds < 0 ? ' przed godziną transakcji' : ' po godzinie transakcji')
}

watch(() => props.transaction, transaction => {
  check.value = null
  error.value = ''
  busy.value = false
  if (transaction) void run(false)
})

async function run(write: boolean) {
  const transaction = props.transaction
  if (!transaction || busy.value || (write && !props.canVerify)) return
  busy.value = true
  error.value = ''
  try {
    const response = await (write ? fuelVerificationService.verify(transaction.row) : fuelVerificationService.latest(transaction.row))
    if (props.transaction === transaction) check.value = response
  } catch (cause) {
    if (props.transaction === transaction) error.value = getApiErrorMessage(cause)
  } finally {
    if (props.transaction === transaction) busy.value = false
  }
}
</script>
