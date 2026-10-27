<template>
  <div class="w-64 max-w-full p-1 text-xs text-ui-text">
    <h3 class="font-semibold">{{ event ? fuelEventLabel(event) : 'Pozycja pojazdu' }}</h3>
    <p class="mt-1 text-ui-mutedText">{{ formatStatisticsDate(event?.detectedAt || point?.ts || null, timezone) }}</p>
    <dl v-if="point" class="mt-3 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-2">
      <dt class="text-ui-mutedText">Prędkość</dt><dd class="text-right">{{ historyPointSpeed(point.speedKph) }}</dd>
      <template v-if="historyPointFuel(point)"><dt class="text-ui-mutedText">Paliwo</dt><dd class="text-right">{{ historyPointFuel(point) }}</dd></template>
      <dt class="text-ui-mutedText">Kierowcy</dt><dd class="break-words text-right">{{ (point.drivers || []).map(driver => driver.name || driver.externalId || '—').join(', ') || '—' }}</dd>
    </dl>
    <dl v-if="event" class="mt-3 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-2">
      <dt class="text-ui-mutedText">Przed / po</dt><dd class="text-right">{{ historyMetric(event.beforeLiters, 'l') }} / {{ historyMetric(event.afterLiters, 'l') }}</dd>
      <dt class="text-ui-mutedText">Zmiana poziomu</dt><dd class="text-right">{{ historyMetric(event.observedDeltaLiters, 'l') }}</dd>
      <dt class="text-ui-mutedText">Szacowana ilość</dt><dd class="text-right">{{ historyMetric(event.estimatedAmountLiters, 'l') }}</dd>
      <dt class="text-ui-mutedText">Pomiar</dt><dd class="text-right">{{ event.levelSource === 'SENSOR_LITERS' ? 'Czujnik litrów' : 'Procent obecnego zbiornika' }}</dd>
      <dt class="text-ui-mutedText">Korekta zużycia</dt><dd class="text-right">{{ event.consumptionAdjusted ? 'Uwzględniono licznik paliwa' : 'Bez korekty' }}</dd>
    </dl>
    <p v-if="event" class="mt-3 text-ui-mutedText">Zdarzenie szacunkowe. Lokalizacja odczytu nie potwierdza miejsca tankowania ani przyczyny ubytku.</p>
    <p class="mt-3 text-ui-mutedText">{{ position.lat.toFixed(5) }}, {{ position.lng.toFixed(5) }}</p>
  </div>
</template>
<script setup lang="ts">
import type { LocalFuelEvent, LocalHistoryPoint } from '@/types/localPositionHistory'
import { historyMetric, historyPointSpeed, historyPointFuel, fuelEventLabel } from '@/utils/localPositionHistory'
import { formatStatisticsDate } from '@/utils/dailyStatistics'
defineProps<{ point?: LocalHistoryPoint; event?: LocalFuelEvent; position:{lat:number;lng:number}; timezone:string }>()
</script>
