<template>
  <div class="space-y-3">
    <section class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div class="w-full sm:max-w-sm">
        <AppInput v-model="tripStore.searchQuery" size="sm" placeholder="Szukaj pojazdu, naczepy lub kierowcy" clearable />
      </div>

      <div class="flex min-w-0 items-center justify-end gap-1.5">
        <AppIconButton label="Poprzedni tydzień" size="sm" @click="moveWeek(-1)">
          <ChevronLeft class="h-4 w-4" />
        </AppIconButton>
        <AppSelect
          v-model="tripStore.selectedWeekStart"
          size="sm"
          class="w-[15rem] max-w-[calc(100vw-7rem)]"
          :options="weekOptions"
          aria-label="Wybierz tydzień"
        />
        <AppIconButton label="Następny tydzień" size="sm" :disabled="isCurrentWeek" @click="moveWeek(1)">
          <ChevronRight class="h-4 w-4" />
        </AppIconButton>
      </div>
    </section>

    <section class="ui-surface overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[1120px] table-fixed border-collapse text-left">
          <thead class="border-b border-ui-divider bg-ui-muted text-[10px] font-semibold uppercase text-ui-mutedText">
            <tr>
              <th class="w-11 px-2 py-2 text-center">Lp.</th>
              <th class="w-[10%] border-l border-ui-divider px-3 py-2">Pojazd</th>
              <th class="w-[10%] border-l border-ui-divider px-3 py-2">Naczepa</th>
              <th class="w-[17%] border-l border-ui-divider px-3 py-2">Kierowca</th>
              <th class="w-[14%] border-l border-ui-divider px-3 py-2">Data wyjazdu</th>
              <th class="w-[11%] border-l border-ui-divider px-3 py-2 text-right">Śr. spalanie</th>
              <th class="w-[9%] border-l border-ui-divider px-3 py-2 text-right">Kilometry</th>
              <th class="w-[12%] border-l border-ui-divider px-2 py-2">Stacja wyjazd</th>
              <th class="w-[12%] border-l border-ui-divider px-2 py-2">Stacja zjazd</th>
              <th class="w-12 border-l border-ui-divider px-2 py-2 text-center">Akcje</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ui-divider">
            <tr v-for="(trip, index) in tripStore.filteredTrips" :key="trip.id" class="h-11 transition hover:bg-ui-hover">
              <td class="px-2 py-1.5 text-center text-xs tabular-nums text-ui-mutedText">{{ index + 1 }}.</td>
              <td class="border-l border-ui-divider px-3 py-1.5 text-xs font-semibold text-ui-text">{{ trip.vehiclePlate }}</td>
              <td class="border-l border-ui-divider px-3 py-1.5 text-xs text-ui-text-secondary">{{ trip.trailerPlate || '—' }}</td>
              <td class="truncate border-l border-ui-divider px-3 py-1.5 text-xs text-ui-text-secondary">{{ trip.driverName }}</td>
              <td class="border-l border-ui-divider px-3 py-1.5 text-xs text-ui-text-secondary">{{ formatDateTime(trip.departureDate) }}</td>
              <td class="border-l border-ui-divider px-3 py-1.5 text-right text-xs tabular-nums text-ui-text-secondary">{{ formatFuel(trip.averageFuelConsumption) }}</td>
              <td class="border-l border-ui-divider px-3 py-1.5 text-right text-xs tabular-nums text-ui-text-secondary">{{ formatDistance(trip.distanceKm) }}</td>
              <td class="border-l border-ui-divider px-2 py-1">
                <AppSelect
                  :model-value="trip.departureStationStatus"
                  size="sm"
                  class="w-full"
                  :options="stationOptions"
                  :aria-label="`Status stacji wyjazdowej dla ${trip.vehiclePlate}`"
                  @update:model-value="tripStore.updateStationStatus(trip.id, 'departureStationStatus', $event as TripStationStatus)"
                />
              </td>
              <td class="border-l border-ui-divider px-2 py-1">
                <AppSelect
                  :model-value="trip.returnStationStatus"
                  size="sm"
                  class="w-full"
                  :options="stationOptions"
                  :aria-label="`Status stacji zjazdowej dla ${trip.vehiclePlate}`"
                  @update:model-value="tripStore.updateStationStatus(trip.id, 'returnStationStatus', $event as TripStationStatus)"
                />
              </td>
              <td class="border-l border-ui-divider px-2 py-1 text-center">
                <AppIconLink :to="`/trips/${trip.id}`" label="Przejdź do szczegółów wyjazdu">
                  <SquareArrowOutUpRight class="h-4 w-4" />
                </AppIconLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!tripStore.filteredTrips.length" class="flex min-h-44 flex-col items-center justify-center px-4 text-center">
        <Route class="h-7 w-7 text-ui-icon" />
        <p class="mt-3 ui-card-title">Brak wyjazdów w tym tygodniu</p>
        <p class="mt-1 ui-body-sm text-ui-mutedText">Zmień tydzień albo wyszukiwaną frazę.</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, Route, SquareArrowOutUpRight } from 'lucide-vue-next'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppIconLink from '@/components/ui/AppIconLink.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect, { type AppSelectOption } from '@/components/ui/AppSelect.vue'
import { useTripStore, type TripStationStatus } from '@/stores/tripStore'

const tripStore = useTripStore()
const currentWeekStart = startOfWeek(new Date())
const stationOptions: AppSelectOption[] = [
  { value: 'sent', label: 'Wysłano' },
  { value: 'not_sent', label: 'Nie wysłano' },
]
const weekOptions = computed<AppSelectOption[]>(() => Array.from({ length: 13 }, (_, index) => {
  const start = new Date(currentWeekStart)
  start.setDate(start.getDate() - index * 7)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return {
    value: toDateKey(start),
    label: `${index === 0 ? 'Aktualny · ' : ''}Tydzień ${isoWeekNumber(start)} · ${formatShortDate(start)}–${formatShortDate(end)}`,
  }
}))
const isCurrentWeek = computed(() => tripStore.selectedWeekStart === toDateKey(currentWeekStart))

function startOfWeek(value: Date) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay() || 7
  date.setDate(date.getDate() - day + 1)
  return date
}

function toDateKey(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isoWeekNumber(value: Date) {
  const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()))
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function formatShortDate(value: Date) {
  return value.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
}

function moveWeek(direction: -1 | 1) {
  const selected = new Date(`${tripStore.selectedWeekStart}T00:00:00`)
  selected.setDate(selected.getDate() + direction * 7)
  const nextValue = toDateKey(selected)
  if (direction > 0 && nextValue > toDateKey(currentWeekStart)) return
  tripStore.selectedWeekStart = nextValue
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatFuel(value: number) {
  return `${value.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} l/100 km`
}

function formatDistance(value: number) {
  return `${value.toLocaleString('pl-PL')} km`
}
</script>
