<template>
  <AppModal :open="!!transaction" title="Weryfikacja GPS" size="lg" :busy="busy" @close="emit('close')">
    <div v-if="transaction" class="space-y-4">
      <div class="space-y-2 rounded-lg border border-ui-divider bg-ui-muted p-3">
        <p class="font-medium text-ui-text">{{ transaction.stationName || transaction.stationCode || 'Nieznana stacja' }}</p>
        <FuelVerificationSteps
          :vehicle-assigned="transaction.vehicleId != null" :station-known="transaction.stationKnown"
          :gps-status="gpsStatus"
          expanded
        />
      </div>
      <p v-if="error" class="ui-error" role="alert">{{ error }}</p>
      <p v-else-if="busy" class="ui-caption" role="status">Pobieranie wyniku…</p>
      <p v-else-if="!check" class="ui-body-sm text-ui-mutedText">Brak weryfikacji dla aktualnego przypisania i stacji.</p>
      <template v-if="check">
        <div class="overflow-hidden rounded-lg border border-ui-divider">
          <table class="ui-table" aria-label="Odczyty użyte do weryfikacji">
            <thead class="ui-table-head">
              <tr>
                <th scope="col" class="ui-table-cell">Odczyt</th>
                <th scope="col" class="ui-table-cell">Wynik</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-ui-divider">
              <tr>
                <th scope="row" class="ui-table-cell text-left font-medium">Pozycje GPS</th>
                <td class="ui-table-cell tabular-nums">{{ check.result.usablePositions }} z {{ check.result.samples }} odczytów</td>
              </tr>
              <tr v-if="check.result.point">
                <th scope="row" class="ui-table-cell text-left font-medium">Najbliższy punkt do stacji</th>
                <td class="ui-table-cell">
                  <p class="font-medium">{{ distance(check.result.point.distanceMeters) }}</p>
                  <p class="ui-caption">{{ dateLabel(check.result.point.recordedAt) }} · {{ timeDifference(check.result.point.secondsFromReport) }}</p>
                  <p v-if="outsideTimeTolerance" class="ui-caption">Punkt poza dopuszczalnym oknem czasu.</p>
                  <p v-if="check.result.point.speedKph != null" class="ui-caption">Prędkość {{ number.format(check.result.point.speedKph) }} km/h</p>
                </td>
              </tr>
              <tr v-if="check.result.stationStop">
                <th scope="row" class="ui-table-cell text-left font-medium">Postój przy stacji wg GPS</th>
                <td class="ui-table-cell">{{ dateLabel(check.result.stationStop.from) }} – {{ dateLabel(check.result.stationStop.to) }}</td>
              </tr>
              <tr>
                <th scope="row" class="ui-table-cell text-left font-medium">Przebieg w pobliżu tankowania</th>
                <td class="ui-table-cell">
                  <template v-if="check.result.mileage">
                    <p class="font-medium">{{ number.format(check.result.mileage.kilometers) }} km · {{ mileageSource[check.result.mileage.source] }}</p>
                    <p class="ui-caption">{{ dateLabel(check.result.mileage.measuredAt) }} · {{ timeDifference(check.result.mileage.secondsFromReport) }}</p>
                    <p v-if="check.result.mileage.fromStationStop" class="ui-caption">Odczyt z tego samego postoju</p>
                  </template>
                  <p v-else class="ui-caption">Brak odczytu w oknie weryfikacji.</p>
                </td>
              </tr>
              <template v-if="check.result.status === 'LOCATION_MISMATCH' && check.result.before && check.result.after">
                <tr>
                  <th scope="row" class="ui-table-cell text-left font-medium">Przed tankowaniem</th>
                  <td class="ui-table-cell">{{ distance(check.result.before.distanceMeters) }} · {{ dateLabel(check.result.before.recordedAt) }}</td>
                </tr>
                <tr>
                  <th scope="row" class="ui-table-cell text-left font-medium">Po tankowaniu</th>
                  <td class="ui-table-cell">{{ distance(check.result.after.distanceMeters) }} · {{ dateLabel(check.result.after.recordedAt) }}</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <p class="ui-caption">Sprawdzono {{ dateLabel(check.checkedAt) }} · wersja reguł {{ check.algorithmVersion }}</p>
      </template>
    </div>
    <template #footer>
      <AppButton variant="secondary" :disabled="busy" @click="emit('close')">Zamknij</AppButton>
      <AppButton v-if="canVerify" :loading="busy" @click="run(true)">{{ check ? 'Sprawdź ponownie' : 'Sprawdź GPS' }}</AppButton>
    </template>
  </AppModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import FuelVerificationSteps from '@/components/fuel/FuelVerificationSteps.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { getApiErrorMessage } from '@/services/api'
import type { FuelTransactionRow } from '@/services/fuelImportService'
import { fuelVerificationService, type FuelVerification } from '@/services/fuelVerificationService'
import { HISTORY_TIMEZONE } from '@/utils/historyTime'

const props = defineProps<{ transaction: FuelTransactionRow | null; canVerify: boolean }>()
const emit = defineEmits<{ close: [] }>()
const check = ref<FuelVerification | null>(null)
const busy = ref(false)
const error = ref('')
const gpsStatus = computed(() => {
  const previous = props.transaction?.gpsStatus
  return check.value?.result.status ?? (previous === 'AT_STATION' ? 'NOT_CHECKED' : previous ?? null)
})
const outsideTimeTolerance = computed(() => {
  const result = check.value?.result
  const point = result?.point
  const rules = result?.rules
  if (result?.status !== 'INCONCLUSIVE' || !point || !rules || point.distanceMeters > rules.stationRadiusMeters) return false
  const seconds = Math.max(-point.secondsFromReport, point.secondsFromReport - rules.reportPrecisionSeconds, 0)
  return seconds > rules.positionToleranceSeconds
})
const date = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeStyle: 'short', timeZone: HISTORY_TIMEZONE })
const number = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 })
const mileageSource = { VEHICLE_COUNTER: 'licznik pojazdu', GPS_ESTIMATE: 'GPS', DEVICE_ESTIMATE: 'urządzenie' }

const dateLabel = (value: string) => date.format(new Date(value))
const distance = (meters: number) => meters >= 1000 ? number.format(meters / 1000) + ' km od stacji' : number.format(meters) + ' m od stacji'
function timeDifference(seconds: number) {
  if (!seconds) return 'O godzinie podanej w IDS'
  const magnitude = Math.abs(seconds)
  const elapsed = magnitude >= 60 ? number.format(magnitude / 60) + ' min' : magnitude + ' s'
  return elapsed + (seconds < 0 ? ' przed godziną z IDS' : ' po godzinie z IDS')
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
