<template>
  <span v-if="column === 'truck'" class="inline-flex items-center gap-1.5 font-semibold text-ui-text">{{ entry.truck.licensePlate }}<VehicleReturnInspectionAlert :vehicle="entry.truck" :timezone="timezone" /></span>
  <span v-else-if="column === 'trailer'" class="inline-flex items-center gap-1.5">{{ entry.trailer?.licensePlate || '—' }}<VehicleReturnInspectionAlert v-if="entry.trailer" :vehicle="entry.trailer" :timezone="timezone" /></span>
  <span v-else-if="column === 'returnDriver'">{{ entry.returnDriver?.name || entry.returnDriver?.externalId || '—' }}</span>
  <span v-else-if="column === 'departureDriver'">{{ entry.departureDriver?.name || entry.departureDriver?.externalId || '—' }}</span>
  <span v-else-if="column === 'started'">{{ entry.tripStartedOn ? formatDisplayDate(entry.tripStartedOn) : '—' }}</span>
  <span v-else-if="column === 'days'" class="tabular-nums">{{ entry.daysOnRoad ?? '—' }}</span>
  <span v-else-if="column === 'notes'" class="block max-w-full truncate text-ui-text lg:w-[22rem]" :title="entry.notes || undefined">{{ entry.notes || '—' }}</span>
  <span v-else-if="column === 'fuel'" class="tabular-nums" :title="`Odczyt: ${formatStatisticsDate(entry.truck.currentFuel.observedAt, timezone)}`">{{ formatStatisticsMetric(entry.truck.currentFuel.percent, '%', 0) }} · {{ formatStatisticsMetric(entry.truck.currentFuel.liters, 'l', 0) }}</span>
  <span v-else :class="returnDeadlineColor(returnDeadlineDays(deadline, timezone))" :title="returnDeadlineLabel(returnDeadlineDays(deadline, timezone))">{{ deadline ? formatDisplayDate(deadline) : '—' }}<span v-if="deadline" class="ml-1 text-[11px]">({{ returnDeadlineLabel(returnDeadlineDays(deadline, timezone)) }})</span></span>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import VehicleReturnInspectionAlert from './VehicleReturnInspectionAlert.vue'
import { returnDeadlineDays, returnDeadlineColor, returnDeadlineLabel } from '@/utils/vehicleReturnPresentation'
import type { VehicleReturnEntry } from '@/types/vehicleReturn'
import type { ReturnColumnKey } from '@/utils/vehicleReturnColumns'
import { formatDisplayDate } from '@/utils/date'
import { formatStatisticsDate, formatStatisticsMetric } from '@/utils/dailyStatistics'
const props = defineProps<{ entry: VehicleReturnEntry; column: ReturnColumnKey; timezone: string }>()
const deadline = computed(() => props.column === 'truckInspection' ? props.entry.truck.technicalInspection : props.column === 'truckTachograph' ? props.entry.truck.tachographInspection : props.entry.trailer?.technicalInspection)
</script>
