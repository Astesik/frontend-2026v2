<template>
  <div class="overflow-x-auto rounded-lg border border-ui-divider">
    <table class="ui-table" aria-label="Porównanie metod spalania">
      <thead class="ui-table-head"><tr class="divide-x divide-ui-divider [&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:py-2">
        <th>Metoda</th><th>Litry</th><th>Spalanie</th><th>Różnica względem CAN</th><th>Różnica %</th>
      </tr></thead>
      <tbody><tr v-for="method in methods" :key="method.label" class="ui-table-row divide-x divide-ui-divider [&>td]:whitespace-nowrap [&>td]:px-3 [&>td]:py-3">
        <td class="font-medium">{{ method.label }}</td><td>{{ amount(method.liters, 'l') }}</td><td>{{ amount(method.rate, 'l/100 km') }}</td>
        <td>{{ amount(method.difference, 'l') }}</td><td>{{ amount(method.percent, '%') }}</td>
      </tr></tbody>
    </table>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import type { AutomaticCycleResult } from '@/services/fuelConsumptionService'
const props = defineProps<{ result: AutomaticCycleResult }>()
const amount = (value: number | null | undefined, unit: string) => value == null ? '—' : value.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + unit
const methods = computed(() => {
  const r = props.result
  return [
    { label: 'CAN', liters: r.canLiters, rate: r.canPer100Km, difference: r.differenceLiters == null ? null : 0, percent: r.differencePercent == null ? null : 0 },
    { label: 'Transakcje paliwowe', liters: r.purchasedLiters, rate: r.purchasesPer100Km, difference: r.differenceLiters, percent: r.differencePercent },
    { label: 'Skorygowane', liters: r.adjusted?.adjustedFuelConsumedLiters, rate: r.adjusted?.adjustedConsumptionL100km, difference: r.adjusted?.differenceLiters, percent: r.adjusted?.differencePercent },
  ]
})
</script>
