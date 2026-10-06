<template>
  <div class="flex min-w-0 flex-col gap-3">
    <div class="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <AppInput v-model="search" class="w-full sm:w-72" size="sm" placeholder="Szukaj pojazdu lub kierowcy" aria-label="Szukaj w statystykach dziennych" clearable />
    </div>
    <div class="min-h-0 max-h-[32rem] overflow-auto rounded-[6px] border border-ui-border lg:max-h-none lg:flex-1">
      <table class="ui-table min-w-[720px]">
        <thead class="ui-table-head sticky top-0 z-10">
          <tr>
            <th class="px-3 py-2 text-left" :aria-sort="ariaSort('licensePlate')">
              <button type="button" class="inline-flex items-center gap-1.5 hover:text-ui-text" @click="setSort('licensePlate')">Pojazd<component :is="sortIcon('licensePlate')" class="h-3.5 w-3.5" /></button>
            </th>
            <th class="px-3 py-2 text-left" :aria-sort="ariaSort('drivers')">
              <button type="button" class="inline-flex items-center gap-1.5 hover:text-ui-text" @click="setSort('drivers')">Kierowcy dzisiaj<component :is="sortIcon('drivers')" class="h-3.5 w-3.5" /></button>
            </th>
            <th v-for="column in metricColumns" :key="column.key" class="px-3 py-2 text-right" :aria-sort="ariaSort(column.key)">
              <button type="button" class="inline-flex items-center gap-1.5 hover:text-ui-text" @click="setSort(column.key)">{{ column.label }}<component :is="sortIcon(column.key)" class="h-3.5 w-3.5" /></button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="vehicle in sortedVehicles" :key="vehicle.vehicleId" class="ui-table-row">
            <td class="px-3 py-2 align-top whitespace-nowrap">
              <RouterLink v-if="canReadVehicles" :to="`/vehicles/${vehicle.vehicleId}`" class="inline-flex items-center gap-2 font-semibold text-ui-text underline-offset-4 hover:underline">
                <Truck class="h-3.5 w-3.5 text-ui-icon" />{{ vehicle.licensePlate }}
              </RouterLink>
              <span v-else class="font-semibold text-ui-text">{{ vehicle.licensePlate }}</span>
            </td>
            <td class="max-w-64 px-3 py-2 align-top">
              <span v-if="vehicle.drivers.length" class="block max-w-64 truncate text-xs text-ui-text-secondary" :title="driverNames(vehicle)">{{ driverNames(vehicle) }}</span>
              <span v-else class="ui-caption">Brak danych</span>
            </td>
            <td class="px-3 py-2 align-top text-right whitespace-nowrap tabular-nums">{{ formatStatisticsMetric(vehicle.distanceKm, 'km', 2) }}</td>
            <td class="px-3 py-2 align-top text-right whitespace-nowrap tabular-nums">{{ formatStatisticsMetric(vehicle.fuelUsedLiters, 'l', 2) }}</td>
            <td class="px-3 py-2 align-top text-right whitespace-nowrap tabular-nums">{{ formatStatisticsMetric(vehicle.averageFuelConsumptionLPer100Km, 'l/100 km', 2) }}</td>
          </tr>
          <tr v-if="!sortedVehicles.length"><td colspan="5" class="px-4 py-10 text-center ui-body-sm text-ui-mutedText">{{ vehicles.length ? 'Brak wyników wyszukiwania.' : 'Brak ciągników w aktywnej firmie.' }}</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowDown, ArrowUp, ArrowUpDown, Truck } from 'lucide-vue-next'
import AppInput from '@/components/ui/AppInput.vue'
import type { DailyVehicleStatistics } from '@/types/dailyStatistics'
import { formatStatisticsMetric, sortDailyVehicleStatistics, type DailyStatisticsSortKey } from '@/utils/dailyStatistics'

const props = defineProps<{ vehicles: DailyVehicleStatistics[]; timezone: string; canReadVehicles: boolean }>()
const search = ref('')
const sortKey = ref<DailyStatisticsSortKey>('distanceKm')
const sortDirection = ref<'asc' | 'desc'>('desc')
const metricColumns: Array<{ key: DailyStatisticsSortKey; label: string }> = [
  { key: 'distanceKm', label: 'Kilometry dzisiaj' },
  { key: 'fuelUsedLiters', label: 'Zużyte paliwo' },
  { key: 'averageFuelConsumptionLPer100Km', label: 'Średnie spalanie' },
]
const filteredVehicles = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('pl-PL')
  return props.vehicles.filter((vehicle) => [vehicle.licensePlate, ...vehicle.drivers.map((driver) => driver.driverName || driver.externalId)].some((text) => text.toLocaleLowerCase('pl-PL').includes(query)))
})
const sortedVehicles = computed(() => sortDailyVehicleStatistics(filteredVehicles.value, sortKey.value, sortDirection.value))

function driverNames(vehicle: DailyVehicleStatistics) {
  return vehicle.drivers.map((driver) => driver.driverName || (driver.driverId != null ? `Kierowca #${driver.driverId}` : `Kierowca ${driver.externalId}`)).join(', ')
}

function setSort(key: DailyStatisticsSortKey) {
  if (sortKey.value === key) sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  else {
    sortKey.value = key
    sortDirection.value = key === 'licensePlate' || key === 'drivers' ? 'asc' : 'desc'
  }
}
function sortIcon(key: DailyStatisticsSortKey) {
  return sortKey.value !== key ? ArrowUpDown : sortDirection.value === 'asc' ? ArrowUp : ArrowDown
}
function ariaSort(key: DailyStatisticsSortKey) {
  return sortKey.value !== key ? 'none' : sortDirection.value === 'asc' ? 'ascending' : 'descending'
}
</script>
