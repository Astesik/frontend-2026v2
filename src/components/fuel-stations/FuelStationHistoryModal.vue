<template>
  <AppModal :open="Boolean(store.selectedStation)" :title="`Historia cen · ${store.selectedStation?.stationName || ''}`" size="lg" center-in-viewport @close="store.closeHistory">
    <form class="mb-3 flex flex-wrap items-end gap-3" @submit.prevent="store.loadHistory()">
      <AppDatePicker v-model="store.historyDates.from" label="Od" size="sm" editable class="w-40" />
      <AppDatePicker v-model="store.historyDates.to" label="Do" size="sm" editable class="w-40" />
      <AppButton size="sm" :disabled="store.isHistoryLoading" type="submit"><Search class="h-4 w-4" />Szukaj</AppButton>
    </form>
    <p v-if="store.historyError" role="alert" class="ui-error mb-3">{{ store.historyError }}</p>
    <div class="relative min-h-48 overflow-hidden rounded-lg border border-ui-divider" :aria-busy="store.isHistoryLoading">
      <div class="max-h-[50dvh] overflow-auto">
        <table class="ui-table min-w-[32rem] table-fixed whitespace-nowrap">
          <colgroup><col class="w-28" /><col class="w-32" /><col class="w-32" /><col class="w-20" /><col class="w-20" /></colgroup>
          <thead class="ui-table-head">
            <tr class="divide-x divide-ui-divider [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:h-11 [&>th]:bg-ui-muted [&>th]:px-3 [&>th]:py-1 [&>th]:leading-tight">
              <th scope="col">Data ceny</th>
              <th scope="col">Cena bazowa</th>
              <th scope="col">Cena końcowa</th>
              <th scope="col">VAT</th>
              <th scope="col">Waluta</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="price in store.prices" :key="price.id" class="ui-table-row divide-x divide-ui-divider [&>td]:px-3 [&>td]:py-2">
              <td class="tabular-nums">{{ dateLabel(price.priceDate) }}</td>
              <td class="font-medium tabular-nums text-ui-text">{{ formatFuelPrice(price.priceBase) }}</td>
              <td class="font-medium tabular-nums text-ui-text">{{ formatFuelPrice(price.priceFinal) }}</td>
              <td class="tabular-nums">{{ price.vat ?? '—' }}</td>
              <td>{{ price.currency || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!store.isHistoryLoading && !store.prices.length" class="pointer-events-none absolute inset-x-0 top-16 px-3 text-center ui-caption">Brak cen w wybranym zakresie.</p>
      <AppLoadingIndicator v-if="store.isHistoryLoading" class="absolute inset-0 z-20 bg-ui-surface/85" />
    </div>
  </AppModal>
</template>
<script setup lang="ts">
import { IconSearch as Search } from '@tabler/icons-vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppLoadingIndicator from '@/components/ui/AppLoadingIndicator.vue'
import { useFuelStationStore } from '@/stores/fuelStationStore'
import { formatFuelPrice } from '@/utils/fuelStation'
const store = useFuelStationStore()
function dateLabel(value: string) { return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
</script>
