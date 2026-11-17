<template>
  <AppModal :open="!!transaction" title="Weryfikacja GPS" :busy="busy" @close="emit('close')">
    <div class="space-y-3">
      <p v-if="transaction" class="ui-caption">IDS {{ transaction.transactionNumber }} · {{ transaction.stationName || transaction.stationCode }}</p>
      <p v-if="error" class="ui-error" role="alert">{{ error }}</p>
      <p v-else-if="busy" class="ui-caption" role="status">Pobieranie wyniku…</p>
      <p v-else-if="!check" class="ui-body-sm text-ui-mutedText">Brak weryfikacji dla aktualnego przypisania i stacji.</p>
      <template v-if="check">
        <AppBadge :variant="statusVariant(check.result.status)">{{ labels[check.result.status] }}</AppBadge>
        <p class="ui-caption">Pozycje GPS {{ check.result.usablePositions }} z {{ check.result.samples }} odczytów</p>
        <dl class="grid gap-3 text-sm sm:grid-cols-2">
          <div v-if="check.result.point">
            <dt class="font-medium text-ui-text">Najbliższy punkt do stacji</dt>
            <dd class="ui-caption">{{ distance(check.result.point.distanceMeters) }} · {{ dateLabel(check.result.point.recordedAt) }}</dd>
            <dd class="ui-caption">{{ timeDifference(check.result.point.secondsFromReport) }}</dd>
            <dd v-if="check.result.point.speedKph !== null" class="ui-caption">Prędkość {{ number.format(check.result.point.speedKph) }} km/h</dd>
          </div>
          <div>
            <dt class="font-medium text-ui-text">Przebieg w pobliżu tankowania</dt>
            <template v-if="check.result.mileage">
              <dd class="ui-caption">{{ number.format(check.result.mileage.kilometers) }} km · {{ mileageSource[check.result.mileage.source] }}</dd>
              <dd class="ui-caption">{{ dateLabel(check.result.mileage.measuredAt) }} · {{ timeDifference(check.result.mileage.secondsFromReport) }}</dd>
            </template>
            <dd v-else class="ui-caption">Brak odczytu w oknie weryfikacji.</dd>
          </div>
          <template v-if="check.result.status === 'LOCATION_MISMATCH' && check.result.before && check.result.after">
            <div>
              <dt class="font-medium text-ui-text">Przed tankowaniem</dt>
              <dd class="ui-caption">{{ distance(check.result.before.distanceMeters) }} · {{ dateLabel(check.result.before.recordedAt) }}</dd>
            </div>
            <div>
              <dt class="font-medium text-ui-text">Po tankowaniu</dt>
              <dd class="ui-caption">{{ distance(check.result.after.distanceMeters) }} · {{ dateLabel(check.result.after.recordedAt) }}</dd>
            </div>
          </template>
        </dl>
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
import { ref, watch } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { getApiErrorMessage } from '@/services/api'
import type { FuelTransactionRow } from '@/services/fuelImportService'
import { fuelVerificationService, type FuelVerification, type FuelVerificationStatus } from '@/services/fuelVerificationService'
import { HISTORY_TIMEZONE } from '@/utils/historyTime'

const props = defineProps<{ transaction: FuelTransactionRow | null; canVerify: boolean }>()
const emit = defineEmits<{ close: [] }>()
const check = ref<FuelVerification | null>(null)
const busy = ref(false)
const error = ref('')
const date = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeStyle: 'short', timeZone: HISTORY_TIMEZONE })
const number = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 })
const labels: Record<FuelVerificationStatus, string> = {
  AT_STATION: 'Pojazd przy stacji',
  LOCATION_MISMATCH: 'Niezgodna lokalizacja',
  INCONCLUSIVE: 'Nierozstrzygnięte',
  NO_GPS: 'Brak danych GPS',
  NO_STATION_COORDINATES: 'Brak współrzędnych stacji',
  UNASSIGNED: 'Brak przypisania karty',
  UNRESOLVED_TIME: 'Godzina do wyjaśnienia',
}
const mileageSource = { VEHICLE_COUNTER: 'licznik pojazdu', GPS_ESTIMATE: 'GPS', DEVICE_ESTIMATE: 'urządzenie' }

const dateLabel = (value: string) => date.format(new Date(value))
const distance = (meters: number) => meters >= 1000 ? number.format(meters / 1000) + ' km od stacji' : number.format(meters) + ' m od stacji'
const statusVariant = (status: FuelVerificationStatus) => status === 'AT_STATION' ? 'success' : status === 'LOCATION_MISMATCH' ? 'error' : 'warning'
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
