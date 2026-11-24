<template>
  <table class="ui-table table-fixed" :class="features.fuelTransactionPrices ? (canViewVerification ? 'min-w-[94rem]' : 'min-w-[82rem]') : (canViewVerification ? 'min-w-[80rem]' : 'min-w-[68rem]')" aria-label="Transakcje">
    <colgroup>
      <col v-for="column in columns" :key="column.label" :class="column.width" />
    </colgroup>
    <thead class="ui-table-head">
      <tr class="divide-x divide-ui-divider">
        <th v-for="column in columns" :key="column.label" scope="col" class="sticky top-0 z-10 h-11 bg-ui-muted px-3 py-1 leading-tight">
          {{ column.label }}
          <span v-if="column.excise" class="block whitespace-nowrap text-[10px] font-normal normal-case">Akcyza · {{ column.excise }}</span>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(item, index) in rows" :key="item.row"
        class="ui-table-row divide-x divide-ui-divider [&>td]:px-3 [&>td]:py-1 [&>td]:align-middle"
      >
        <td class="text-xs tabular-nums text-ui-mutedText">
          {{ index + 1 }}.
        </td>
        <td>
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
          <p class="ui-caption mt-0.5 flex items-center gap-2 whitespace-nowrap">
            <span class="shrink-0 tabular-nums">{{ item.provider ?? 'IDS' }}: {{ item.cardNumberSuffix ?? item.maskedCard }}</span>
            <span v-if="item.reportedRegistration && item.reportedRegistration !== item.vehiclePlate" class="group inline-flex min-w-0 items-center gap-1" :title="`Sugestia: ${item.reportedRegistration}`">
              <IconHelpCircle class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Sugestia:
              <RouterLink
                v-if="suggestedVehicleIds?.has(item.row)"
                :to="{ name: 'vehicle-detail', params: { id: suggestedVehicleIds.get(item.row) } }"
                class="-my-px whitespace-nowrap py-px underline-offset-2 group-hover:underline focus-visible:underline"
              >{{ item.reportedRegistration }}</RouterLink>
              <span v-else class="whitespace-nowrap">{{ item.reportedRegistration }}</span>
            </span>
          </p>
        </td>
        <td class="break-words">{{ item.driverName || (item.driverId != null ? `Kierowca #${item.driverId}` : '—') }}</td>
        <td>
          <FuelStationInfo
            :station-name="item.stationName" :station-code="item.stationCode" :country="item.country"
            :station-known="item.stationKnown" :can-create-station="canCreateStation"
            @create-station="emit('createStation', item)"
          />
        </td>
        <td class="whitespace-nowrap">
          <time :datetime="item.reportedAt" class="block font-medium tabular-nums text-ui-text">
            {{ item.reportedAt.slice(0, 10).split('-').reverse().join('.') }}
            <span class="ui-caption block tabular-nums">{{ item.reportedAt.slice(11, 16) }}</span>
          </time>
        </td>
        <td>
          <p class="whitespace-nowrap font-medium tabular-nums text-ui-text">{{ item.quantity == null ? '—' : quantity.format(item.quantity) }} {{ item.unit }}</p>
          <p class="ui-caption break-words">{{ item.product || 'Produkt nieokreślony' }}</p>
        </td>
        <td v-if="features.fuelTransactionPrices" class="whitespace-nowrap font-medium tabular-nums text-ui-text">
          {{ formatPrice(item, false) }}
        </td>
        <td v-if="features.fuelTransactionPrices" class="whitespace-nowrap font-medium tabular-nums text-ui-text">
          {{ formatPrice(item, true) }}
        </td>
        <td v-if="canViewVerification">
          <div class="flex items-center justify-between gap-2">
            <FuelVerificationStatus
              :vehicle-assigned="item.vehicleId != null" :station-known="item.stationKnown"
              :gps-status="item.gpsStatus"
            />
            <AppIconButton label="Weryfikacja GPS" size="sm" @click="emit('verify', item)">
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
import { computed } from 'vue'
import { features } from '@/config/features'
import FuelStationInfo from './FuelStationInfo.vue'
import FuelVerificationStatus from '@/components/fuel/FuelVerificationStatus.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import type { FuelTransactionRow } from '@/services/fuelImportService'

const props = defineProps<{
  rows: FuelTransactionRow[]
  gross: boolean
  exciseCountries: string[]
  canViewVerification: boolean
  canCreateStation?: boolean
  suggestedVehicleIds?: ReadonlyMap<number, number>
}>()
const emit = defineEmits<{ verify: [item: FuelTransactionRow]; createStation: [item: FuelTransactionRow] }>()
const columns = computed(() => {
  const mode = props.gross ? 'brutto' : 'netto'
  const excise = props.gross ? '' : [...props.exciseCountries].sort().join(', ')
  return [
    { label: 'Lp.', width: 'w-12' },
    { label: 'Pojazd i karta', width: 'w-[26rem]' },
    { label: 'Kierowca', width: 'w-[11rem]' },
    { label: 'Lokalizacja', width: 'w-auto' },
    { label: 'Data', width: 'w-[6.75rem]' },
    { label: 'Ilość i produkt', width: 'w-[7.5rem]' },
    ...(features.fuelTransactionPrices ? [
      { label: `Suma ${mode}`, width: 'w-[7rem]', excise },
      { label: `Cena ${mode}`, width: 'w-[7rem]', excise },
    ] : []),
    ...(props.canViewVerification ? [{ label: 'Weryfikacja', width: 'w-[12rem]' }] : []),
  ]
})
const quantity = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 4 })
function netPrices(row: FuelTransactionRow) {
  return row.excise && props.exciseCountries.includes(row.excise.country) ? row.excise : row
}
function formatPrice(row: FuelTransactionRow, perUnit: boolean) {
  const doc = row.documentPrices
  const currency = doc?.currency ?? 'EUR'
  let value
  if (doc && (currency !== 'EUR' || props.gross || netPrices(row) === row)) {
    value = perUnit ? (props.gross ? doc.unitGross : doc.unitNet) : (props.gross ? doc.gross : doc.net)
  } else if (perUnit) {
    value = props.gross ? row.grossUnitEur : netPrices(row).netUnitEur
  } else {
    value = props.gross ? row.amountEur : netPrices(row).netAmountEur
  }
  if (value == null) return '—'
  const label = value.toLocaleString('pl-PL', { style: 'currency', currency, maximumFractionDigits: doc && perUnit && (props.gross || currency !== 'PLN') ? 4 : 2 })
  return perUnit && row.unit ? label + '/' + row.unit : label
}
</script>
