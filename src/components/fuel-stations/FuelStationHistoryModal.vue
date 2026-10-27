<template>
  <AppModal :open="Boolean(store.selectedStation)" :title="`Historia cen · ${store.selectedStation?.stationName || ''}`" size="lg" @close="store.closeHistory">
    <form class="mb-4 flex flex-wrap items-end gap-2" @submit.prevent="store.loadHistory()">
      <AppDatePicker v-model="store.historyDates.from" label="Od" class="w-40" />
      <AppDatePicker v-model="store.historyDates.to" label="Do" class="w-40" />
      <AppButton :disabled="store.isHistoryLoading" type="submit"><Search class="h-4 w-4" />Szukaj</AppButton>
    </form>
    <p v-if="store.historyError" role="alert" class="ui-error mb-3">{{ store.historyError }}</p>
    <p v-if="store.isHistoryLoading" class="ui-caption py-8 text-center">Pobieranie historii cen…</p>
    <div v-else class="overflow-auto">
      <table class="ui-table w-full whitespace-nowrap text-left text-sm">
        <thead class="ui-table-head"><tr><th class="ui-table-cell">Data ceny</th><th class="ui-table-cell">Cena bazowa</th><th class="ui-table-cell">Cena końcowa</th><th class="ui-table-cell">VAT</th><th class="ui-table-cell">Waluta</th></tr></thead>
        <tbody><tr v-for="price in store.prices" :key="price.id" class="ui-table-row"><td class="ui-table-cell">{{ dateLabel(price.priceDate) }}</td><td class="ui-table-cell">{{ formatFuelPrice(price.priceBase) }}</td><td class="ui-table-cell font-semibold">{{ formatFuelPrice(price.priceFinal) }}</td><td class="ui-table-cell">{{ price.vat ?? '—' }}</td><td class="ui-table-cell">{{ price.currency || '—' }}</td></tr>
          <tr v-if="!store.prices.length"><td colspan="5" class="ui-table-cell py-10 text-center text-ui-mutedText">Brak cen w wybranym zakresie.</td></tr>
        </tbody>
      </table>
    </div>
  </AppModal>
</template>
<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import AppModal from '@/components/ui/AppModal.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { useFuelStationStore } from '@/stores/fuelStationStore'
import { formatFuelPrice } from '@/utils/fuelStation'
const store = useFuelStationStore()
function dateLabel(value: string) { return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
</script>
