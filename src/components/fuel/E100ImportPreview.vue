<template>
  <section class="space-y-3">
    <dl class="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div v-for="item in counts" :key="item.label" class="rounded-md border border-ui-border bg-ui-muted p-3">
        <dt class="ui-caption">{{ item.label }}</dt><dd class="font-semibold tabular-nums">{{ item.value }}</dd>
      </div>
    </dl>
    <details v-if="preview.errors.length" class="rounded-md border border-ui-border p-2">
      <summary class="cursor-pointer">Błędy w pliku ({{ preview.errors.length }})</summary>
      <p v-for="e in preview.errors" :key="e.line" class="ui-body-sm">Wiersz {{ e.line }} · {{ e.reason }}</p>
    </details>
    <div v-if="preview.rows.length" class="max-h-[52vh] overflow-auto rounded-md border border-ui-border">
      <table class="ui-table min-w-[58rem]" aria-label="Podgląd transakcji E100">
        <thead class="ui-table-head sticky top-0 bg-ui-surface"><tr>
          <th v-for="label in headers" :key="label" class="px-3 py-2 text-left">{{ label }}</th>
        </tr></thead>
        <tbody>
          <tr v-for="r in preview.rows" :key="r.line" class="ui-table-row align-top [&>td]:px-3 [&>td]:py-2">
            <td>#{{ r.line }}<div class="ui-caption">{{ time.format(new Date(r.at)) }}</div></td>
            <td>{{ r.vehicle || (r.cardConflict ? 'Konflikt numerów kart' : 'Brak przypisania') }}<div>E100: {{ r.suffix }}</div>
              <div v-if="r.registration && r.vehicle !== r.registration" class="ui-caption">Z raportu: {{ r.registration }}</div></td>
            <td>{{ r.country }} · {{ r.stationCode }}<div>{{ r.station }}</div><div v-if="!r.stationKnown" class="ui-caption">Nieznana stacja</div></td>
            <td>{{ r.product }}<div>{{ format(r.amounts.quantity) }} {{ r.unit }}</div>
              <div v-if="r.productType === 'OTHER'" class="ui-caption">Inna usługa</div></td>
            <td>{{ price(r.amounts.unitNet, r.amounts.currency) }}<div>{{ price(r.amounts.unitGross, r.amounts.currency) }}</div></td>
            <td>{{ price(r.amounts.net, r.amounts.currency) }}<div>{{ price(r.amounts.gross, r.amounts.currency) }}</div></td>
            <td>{{ statuses[r.status] }}
              <details v-if="r.previous"><summary class="cursor-pointer">Porównaj wartości</summary>
                <div class="ui-caption">Drugi wariant · {{ format(r.previous.quantity) }} {{ r.unit }}</div>
                <div>Cena netto / brutto: {{ price(r.previous.unitNet, r.previous.currency) }} / {{ price(r.previous.unitGross, r.previous.currency) }}</div>
                <div>Kwota netto / brutto: {{ price(r.previous.net, r.previous.currency) }} / {{ price(r.previous.gross, r.previous.currency) }}</div>
              </details>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import type { E100Preview } from '@/services/fuelImportService'
const props = defineProps<{ preview: E100Preview }>()
const headers = ['Wiersz i czas (PL)', 'Pojazd i karta', 'Stacja', 'Usługa i ilość', 'Cena jedn. netto / brutto', 'Kwota netto / brutto', 'Status']
const statuses = { NEW: 'Nowa', DUPLICATE: 'Duplikat', REVIEW: 'Możliwa korekta' }
const time = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'Europe/Warsaw' })
const decimals = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 10 })
const format = (value: number) => decimals.format(value)
const price = (value: number, currency: string) => value == null ? '—' : format(value) + ' ' + currency
const counts = computed(() => [
  { label: 'Wiersze pliku', value: props.preview.rows.length + props.preview.errors.length + (props.preview.skippedZero ?? 0) },
  { label: 'Pominięte 0 l', value: props.preview.skippedZero ?? 0 },
  { label: 'Karty', value: props.preview.cards },
  { label: 'Olej napędowy', value: props.preview.rows.filter(row => row.productType === 'DIESEL').length },
  { label: 'AdBlue', value: props.preview.rows.filter(row => row.productType === 'ADBLUE').length },
])
</script>
