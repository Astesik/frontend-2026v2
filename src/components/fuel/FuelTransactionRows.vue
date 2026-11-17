<template>
  <ul class="divide-y divide-ui-divider" aria-label="Transakcje paliwowe">
    <li
      v-for="item in rows" :key="item.row"
      class="grid gap-x-4 gap-y-2 px-3 py-3 text-sm sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.2fr_1fr_auto]"
    >
      <div>
        <p class="font-medium tabular-nums text-ui-text">{{ dateLabel(item.reportedAt) }}</p>
        <p class="ui-caption">IDS {{ item.transactionNumber }} · wersja {{ item.version }}</p>
      </div>
      <div>
        <p v-if="item.vehiclePlate" class="font-medium text-ui-text">{{ item.vehiclePlate }}</p>
        <AppBadge v-else-if="!item.timeResolved" variant="warning">Godzina do wyjaśnienia</AppBadge>
        <AppBadge v-else variant="warning">Brak przypisania</AppBadge>
        <p class="ui-caption tabular-nums">{{ item.maskedCard }}</p>
        <p v-if="item.reportedRegistration && item.reportedRegistration !== item.vehiclePlate" class="ui-caption">Z pliku {{ item.reportedRegistration }}</p>
      </div>
      <div class="min-w-0">
        <p class="break-words font-medium text-ui-text">{{ item.stationName || item.stationCode }}</p>
        <p class="ui-caption">{{ [item.country, item.stationCode].filter(Boolean).join(' · ') }}</p>
        <AppBadge v-if="!item.stationKnown" variant="warning">Stacja poza katalogiem</AppBadge>
      </div>
      <div>
        <p class="font-medium text-ui-text">{{ item.product || 'Produkt' }}</p>
        <p class="ui-caption tabular-nums">{{ quantity.format(item.quantity) }} {{ item.unit }}</p>
      </div>
      <div class="min-w-24 xl:text-right">
        <p class="font-medium tabular-nums text-ui-text">{{ item.amountEur === null ? '—' : euro.format(item.amountEur) }}</p>
        <AppBadge v-if="item.status === 'DUPLICATE'" variant="neutral">Powtórzona wersja</AppBadge>
        <AppBadge v-else-if="item.status === 'REVISION'" variant="info">Inna wersja</AppBadge>
        <AppBadge v-else-if="item.status === 'NEW'" variant="success">Nowa</AppBadge>
        <slot name="actions" :item="item" />
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import type { FuelTransactionRow } from '@/services/fuelImportService'

defineProps<{ rows: FuelTransactionRow[] }>()

const quantity = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 4 })
const euro = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'EUR' })

function dateLabel(value: string) {
  return value.slice(0, 10).split('-').reverse().join('.') + ' ' + value.slice(11, 16)
}
</script>
