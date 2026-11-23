<template>
  <section v-if="changes.length" class="space-y-2" aria-label="Korekty i cofnięcia liczników">
    <h3 class="flex items-center gap-2 text-sm font-semibold"><IconGauge class="h-4 w-4 text-ui-icon" />Korekty i cofnięcia liczników</h3>
    <div class="overflow-x-auto rounded-lg border border-ui-divider">
      <table class="ui-table text-sm" aria-label="Zmiany liczników">
        <thead class="ui-table-head"><tr class="divide-x divide-ui-divider [&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:py-2">
          <th>Data wykrycia</th><th>Licznik</th><th>Przed spadkiem</th><th>Po spadku</th><th>Spadek</th><th>Ocena</th>
        </tr></thead>
        <tbody><tr v-for="change in changes" :key="change.counter + change.at + change.readingId" class="ui-table-row divide-x divide-ui-divider [&>td]:whitespace-nowrap [&>td]:px-3 [&>td]:py-2">
          <td>{{ date.format(new Date(change.at)) }}</td>
          <td>{{ change.counter === 'CAN_FUEL' ? 'Zużycie CAN' : 'Przebieg' }}</td>
          <td><span>{{ amount(change.beforeValue, change) }}</span><span class="block text-xs text-ui-mutedText">{{ date.format(new Date(change.beforeAt)) }} · #{{ change.beforeReadingId }}</span></td>
          <td><span>{{ amount(change.value, change) }}</span><span class="block text-xs text-ui-mutedText">Odczyt #{{ change.readingId }}</span></td>
          <td class="font-medium tabular-nums">{{ amount(change.decrease, change) }}</td>
          <td><span class="inline-flex items-center gap-1.5 text-xs font-medium" :class="change.tolerated ? 'text-ui-mutedText' : 'text-warning-600 dark:text-warning-400'">
            <component :is="change.tolerated ? IconInfoCircle : IconAlertTriangle" class="h-4 w-4 shrink-0" />{{ change.tolerated ? 'Drobna korekta · uwzględniono' : 'Wymaga weryfikacji' }}
          </span></td>
        </tr></tbody>
      </table>
    </div>
    <p class="text-xs text-ui-mutedText">Spadek CAN jest porównywany z wcześniejszym maksimum licznika. Drobne korekty są uwzględniane w zużyciu i nie blokują potwierdzenia cyklu.</p>
    <p v-if="(measurement.counterDecreaseCount || 0) > changes.length" class="text-xs text-ui-mutedText">Wyświetlono {{ changes.length }} z {{ measurement.counterDecreaseCount }} zmian licznika.</p>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { IconGauge, IconInfoCircle, IconAlertTriangle } from '@tabler/icons-vue'
import type { Measurement, CounterDecrease } from '@/services/fuelConsumptionService'
const props = defineProps<{ measurement: Measurement }>()
const changes = computed(() => props.measurement.counterDecreases || [])
const number = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 3 })
const date = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Europe/Warsaw' })
const amount = (value: number, change: CounterDecrease) => number.format(value) + (change.counter === 'CAN_FUEL' ? ' l' : ' km')
</script>
