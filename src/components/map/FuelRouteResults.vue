<template>
  <div v-if="store.result" class="space-y-4 p-3 text-xs">
    <div class="grid grid-cols-2 gap-2">
      <div v-for="stat in stats" :key="stat.label" class="rounded-md border border-ui-border bg-ui-surface p-2"><p class="text-ui-text-secondary">{{ stat.label }}</p><p class="mt-1 text-sm font-semibold">{{ stat.value }}</p></div>
    </div>
    <p class="rounded-md border border-ui-border p-2">{{ store.result.fuel.status === 'UNKNOWN' ? 'Zasięg nieznany — brakuje wiarygodnych danych.' : store.result.fuel.canCompleteRoute ? 'Szacowane paliwo wystarczy na trasę.' : 'Na trasie może być potrzebne tankowanie.' }}</p>
    <AppSelect v-model="rankingMode" :options="[{value:'reachable',label:'Najtańsze w zasięgu'},{value:'all',label:'Najtańsze na trasie'},{value:'stations',label:'Wszystkie stacje po kolei'},{value:'nearest',label:'Najbliżej trasy'}]" />
    <template v-if="rankingMode === 'reachable' || rankingMode === 'all'">
      <section v-for="group in rankings" :key="group.currency">
        <h3 class="mb-2 font-semibold">{{ group.currency }}</h3>
        <button v-for="station in group.stations" :key="station.id" class="mb-1 flex w-full items-center justify-between gap-2 rounded-md border border-ui-border bg-ui-surface p-2 text-left hover:bg-ui-muted" @click="store.selectedStationId = station.id">
          <span class="min-w-0"><span class="block truncate font-medium">{{ station.stationName }}</span><span class="text-ui-text-secondary">{{ station.country }} · {{ fuelNumber(station.routeKm, 'km') }} · {{ fuelNumber(station.distanceFromRouteMeters, 'm od trasy') }}</span></span>
          <span class="shrink-0 font-semibold">{{ station.selectedPrice?.toFixed(3) }} {{ group.currency }}</span>
        </button>
      </section>
      <p v-if="!rankings.length" class="text-ui-text-secondary">Brak stacji kwalifikujących się do tego rankingu.</p>
    </template>
    <template v-else>
      <button v-for="station in orderedStations" :key="station.id" class="mb-1 flex w-full justify-between gap-2 rounded-md border border-ui-border p-2 text-left hover:bg-ui-muted" @click="store.selectedStationId = station.id">
        <span class="min-w-0 truncate">{{ station.stationName }} · {{ station.country }}<span class="block text-ui-text-secondary">{{ fuelNumber(station.routeKm, 'km') }} · {{ fuelNumber(station.distanceFromRouteMeters, 'm od trasy') }}</span></span><span class="shrink-0">{{ station.selectedPrice?.toFixed(3) || '—' }} {{ station.price?.currency }}</span>
      </button>
      <p v-if="!store.result.stations.length">Nie znaleziono stacji w wybranym korytarzu trasy.</p>
    </template>
    <details><summary class="cursor-pointer font-medium">Raporty spalania</summary><div class="mt-2 max-h-44 overflow-auto"><table class="w-full text-left"><thead><tr><th>Data</th><th>Km</th><th>Litry</th><th>Użyty</th></tr></thead><tbody><tr v-for="day in store.result.fuel.dailyReports" :key="day.date" class="border-t border-ui-border"><td class="py-2">{{ day.date }}</td><td>{{ fuelNumber(day.distanceKm) }}</td><td>{{ fuelNumber(day.fuelUsedLiters) }}</td><td>{{ day.usedForEstimate ? 'Tak' : 'Nie' }}</td></tr></tbody></table></div></details>
    <ul class="space-y-2 text-ui-text-secondary"><li v-for="warning in store.result.warnings" :key="warning">{{ fuelRouteWarning(warning) }}</li></ul>
    <p class="text-ui-text-secondary">Zasięg jest szacunkowy, nie gwarantowany. Trasa Google nie uwzględnia ograniczeń ciężarówek. Nie sprawdzamy rzeczywistego objazdu ani nie przeliczamy zasięgu po tankowaniu.</p>
    <p class="text-ui-text-secondary">Obliczono: {{ new Date(store.result.calculatedAt).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) }}</p>
  </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { useFuelRouteStore } from '@/stores/fuelRouteStore'
import { fuelNumber, fuelRouteWarning } from '@/utils/fuelRoute'
const store = useFuelRouteStore(), rankingMode = ref('reachable')
const orderedStations = computed(() => {
  const stations = store.result?.stations || []
  return rankingMode.value === 'nearest' ? [...stations].sort((a,b) => a.distanceFromRouteMeters - b.distanceFromRouteMeters || a.routeKm - b.routeKm) : stations
})
const rankings = computed(() => rankingMode.value === 'reachable' ? store.result?.reachableCheapestByCurrency || [] : store.result?.cheapestByCurrency || [])
const stats = computed(() => { const r = store.result; if (!r) return []; return [
  {label:'Długość trasy',value:fuelNumber(r.routeDistanceKm,'km')},
  {label:'Czas jazdy',value:fuelNumber(store.route?.durationMinutes,'min')},
  {label:'Paliwo',value:fuelNumber(r.fuel.percent,'%')},
  {label:'Dostępne paliwo',value:fuelNumber(r.fuel.availableLiters,'l')},
  {label:'Średnie spalanie',value:fuelNumber(r.fuel.consumptionLPer100Km,'l/100 km')},
  {label:'Zasięg bez rezerwy',value:fuelNumber(r.fuel.safeRangeKm,'km')},
  {label:'Zasięg całkowity',value:fuelNumber(r.fuel.rangeKm,'km')},
  {label:'Rezerwa',value:fuelNumber(r.fuel.reserveLiters,'l')}
] })
</script>
