<template>
  <table class="ui-table block lg:table" role="table" aria-label="Historia tankowań">
    <thead class="ui-table-head sr-only lg:not-sr-only lg:table-header-group" role="rowgroup">
      <tr role="row">
        <th v-for="column in columns" :key="column" scope="col" class="ui-table-cell" role="columnheader">{{ column }}</th>
      </tr>
    </thead>
    <tbody class="block lg:table-row-group" role="rowgroup">
      <tr
        v-for="item in rows" :key="item.row"
        class="ui-table-row grid grid-cols-2 gap-x-3 gap-y-3 px-3 py-3 lg:table-row lg:p-0"
        role="row"
      >
        <td class="min-w-0 lg:table-cell lg:px-3 lg:py-3 lg:align-top" role="cell">
          <p class="flex items-start gap-1.5 font-medium text-ui-text">
            <component
              :is="item.vehicleId != null ? IconCircleCheck : IconAlertTriangle"
              class="mt-0.5 h-4 w-4 shrink-0"
              :class="item.vehicleId != null ? 'text-success-600 dark:text-success-400' : 'text-warning-600 dark:text-warning-400'"
              :aria-label="item.vehicleId != null ? 'Karta przypisana' : undefined"
              :aria-hidden="item.vehicleId == null ? true : undefined"
            />
            <span class="break-words">{{ item.vehiclePlate || 'Brak przypisania' }}</span>
          </p>
          <p class="ui-caption mt-0.5 tabular-nums">{{ item.provider ?? 'IDS' }}: {{ item.cardNumberSuffix ?? item.maskedCard }}</p>
          <p
            v-if="item.reportedRegistration && item.reportedRegistration !== item.vehiclePlate"
            class="ui-caption mt-1 flex items-start gap-1.5"
          >
            <IconHelpCircle class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span class="break-words">Sugestia: {{ item.reportedRegistration }}</span>
          </p>
        </td>
        <td class="min-w-0 lg:table-cell lg:px-3 lg:py-3 lg:align-top" role="cell">
          <div class="flex items-start gap-1.5">
            <img
              v-if="item.country && /^[A-Z]{2}$/i.test(item.country)"
              :src="flagUrl(item.country)" :alt="item.country" loading="lazy" width="20" height="20"
              class="mt-0.5 h-4 w-5 shrink-0 object-contain"
            />
            <div class="min-w-0">
              <p v-if="item.stationName || item.stationKnown" class="break-words font-medium text-ui-text">{{ item.stationName || item.stationCode }}</p>
              <p v-if="!item.stationKnown" class="ui-caption flex items-center gap-1.5 text-warning-600 dark:text-warning-400">
                <IconAlertTriangle class="h-4 w-4 shrink-0" aria-hidden="true" />
                Nieznana stacja
              </p>
              <p v-if="item.stationName || !item.stationKnown" class="ui-caption break-words">{{ item.stationCode }}</p>
            </div>
          </div>
        </td>
        <td class="min-w-0 lg:table-cell lg:px-3 lg:py-3 lg:align-top" role="cell">
          <p class="font-medium tabular-nums text-ui-text">{{ quantity.format(item.quantity) }} {{ item.unit }}</p>
          <p class="ui-caption break-words">{{ item.product || 'Produkt nieokreślony' }}</p>
        </td>
        <td class="lg:table-cell lg:px-3 lg:py-3 lg:align-top" role="cell">
          <time :datetime="item.reportedAt" class="block font-medium tabular-nums text-ui-text">
            {{ item.reportedAt.slice(0, 10).split('-').reverse().join('.') }}
            <span class="ui-caption block tabular-nums">{{ item.reportedAt.slice(11, 16) }}</span>
          </time>
        </td>
        <td class="lg:table-cell lg:px-3 lg:py-3 lg:align-top" role="cell">
          <p class="ui-caption mb-0.5 lg:hidden">Cena</p>
          <p v-if="item.amountEur != null" class="whitespace-nowrap font-medium tabular-nums text-ui-text">{{ euro.format(item.amountEur) }}</p>
          <p
            v-if="item.grossUnitEur != null" class="whitespace-nowrap tabular-nums"
            :class="item.amountEur == null ? 'font-medium text-ui-text' : 'ui-caption'"
          >
            {{ euro.format(item.grossUnitEur) }}/{{ item.unit }}
          </p>
          <p v-if="item.amountEur == null && item.grossUnitEur == null" class="ui-caption" aria-label="Brak ceny">—</p>
        </td>
        <td class="min-w-0 lg:table-cell lg:px-3 lg:py-3 lg:align-top" role="cell">
          <div class="flex items-start justify-between gap-1.5">
            <FuelVerificationSteps
              :vehicle-assigned="item.vehicleId != null" :station-known="item.stationKnown"
              :gps-status="canViewVerification ? item.gpsStatus : null"
            />
            <AppIconButton v-if="canViewVerification" label="Weryfikacja GPS" size="sm" class="shrink-0" @click="emit('verify', item)">
              <IconMapSearch class="h-4 w-4" />
            </AppIconButton>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { IconAlertTriangle, IconCircleCheck, IconHelpCircle, IconMapSearch } from '@tabler/icons-vue'
import FuelVerificationSteps from '@/components/fuel/FuelVerificationSteps.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import type { FuelTransactionRow } from '@/services/fuelImportService'

defineProps<{ rows: FuelTransactionRow[]; canViewVerification: boolean }>()
const emit = defineEmits<{ verify: [item: FuelTransactionRow] }>()
const columns = ['Pojazd i karta', 'Lokalizacja', 'Ilość i produkt', 'Data', 'Cena', 'Weryfikacja']
const quantity = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 4 })
const euro = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 4 })
const flagUrl = (country: string) => `https://flagsapi.com/${country.toUpperCase() === 'UK' ? 'GB' : country.toUpperCase()}/flat/64.png`
</script>
