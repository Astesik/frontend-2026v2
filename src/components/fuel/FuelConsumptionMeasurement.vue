<template>
  <div class="space-y-2">
    <p v-if="measurement.issues.length" class="ui-body-sm text-warning-700 dark:text-warning-300">
      {{ measurement.validIntervals ? 'Wynik częściowy' : 'Brak wyniku CAN' }} ·
      {{ measurement.issues.map(issue => reasons[issue] || issue).join(', ') }}
    </p>
    <dl class="grid gap-2 sm:grid-cols-3">
      <div v-for="metric in metrics" :key="metric.label" class="rounded-lg border border-ui-border p-3">
        <dt class="ui-caption">{{ metric.label }}</dt>
        <dd class="text-lg font-semibold tabular-nums">{{ metric.value == null ? '—' : number.format(metric.value) + ' ' + metric.unit }}</dd>
      </div>
    </dl>
    <details v-if="measurement.first && measurement.last" class="ui-body-sm">
      <summary class="cursor-pointer">Odczyty graniczne · {{ measurement.validIntervals }} prawidłowych odcinków</summary>
      <ul class="mt-2 space-y-1">
        <li v-for="(point, i) in [measurement.first, measurement.last]" :key="i">
          {{ i ? 'Koniec' : 'Początek' }} · {{ date.format(new Date(point.at)) }} · {{ number.format(point.odometerKm) }} km
          ({{ sources[point.distanceSource] }}) · licznik CAN {{ point.canLiters == null ? '—' : number.format(point.canLiters) + ' l' }} · odczyt #{{ point.readingId }}
        </li>
      </ul>
    </details>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Measurement } from '@/services/fuelConsumptionService'

const props = defineProps<{ measurement: Measurement }>()
const number = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 })
const date = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Europe/Warsaw' })
const sources = { VEHICLE_COUNTER: 'licznik pojazdu', GPS_ESTIMATE: 'GPS', DEVICE_ESTIMATE: 'licznik urządzenia' }
const reasons: Record<string,string> = {
  GAP: 'przerwa między odczytami', SOURCE_CHANGE: 'zmiana urządzenia lub źródła przebiegu',
  COUNTER_RESET: 'cofnięcie licznika', COUNTER_JUMP: 'niewiarygodny skok licznika',
  UNKNOWN_DEVICE: 'brak identyfikatora urządzenia',
  NO_INTERVAL: 'brak pary zgodnych odczytów', MISSING_BOUNDARY: 'brak pomiaru blisko granicy okresu',
}
const metrics = computed(() => [
  { label: 'Spalanie CAN', value: props.measurement.per100Km, unit: 'l/100 km' },
  { label: 'Zużycie CAN', value: props.measurement.liters, unit: 'l' },
  { label: 'Dystans objęty pomiarem CAN', value: props.measurement.kilometers, unit: 'km' },
])
</script>
