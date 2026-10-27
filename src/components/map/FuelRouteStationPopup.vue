<template>
  <div class="w-64 max-w-full p-1 text-sm text-ui-text">
    <p class="font-semibold">{{ station.stationName }}</p>
    <p class="mt-1 text-xs text-ui-text-secondary">{{ station.provider }} · {{ station.country }} · {{ station.stationCode }}</p>
    <dl class="mt-3 grid grid-cols-2 gap-2 text-xs">
      <dt>Cena / litr</dt><dd class="text-right font-semibold">{{ station.selectedPrice == null ? '—' : station.selectedPrice.toFixed(3) }} {{ station.price?.currency }}</dd>
      <dt>VAT</dt><dd class="text-right">{{ fuelNumber(station.price?.vat, '%') }}</dd>
      <dt>Data ceny</dt><dd class="text-right">{{ station.price?.priceDate || '—' }}</dd>
      <dt>Wiek ceny</dt><dd class="text-right">{{ fuelNumber(station.priceAgeDays, 'dni') }}</dd>
      <dt>Od trasy</dt><dd class="text-right">{{ fuelNumber(station.distanceFromRouteMeters, 'm') }}</dd>
      <dt>Kilometr trasy</dt><dd class="text-right">{{ fuelNumber(station.routeKm, 'km') }}</dd>
      <dt>Ranking cen</dt><dd class="text-right">{{ station.eligibleForRanking ? 'Uwzględniona' : 'Nie uwzględniona' }}</dd>
      <dt>Zasięg</dt><dd class="text-right">{{ station.withinEstimatedFuelRange == null ? 'Nieznany' : station.withinEstimatedFuelRange ? 'W zasięgu' : 'Poza zasięgiem' }}</dd>
    </dl>
    <p class="mt-3 text-xs text-ui-text-secondary">Odległość geometryczna. Dojazd i objazd nie zostały sprawdzone.</p>
  </div>
</template>
<script setup lang="ts">
import type { FuelRouteStation } from '@/types/fuelRoute'
import { fuelNumber } from '@/utils/fuelRoute'
defineProps<{station: FuelRouteStation}>()
</script>
