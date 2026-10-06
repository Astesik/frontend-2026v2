<template>
  <div class="grid min-w-0 gap-4 p-4 text-left lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
    <section class="min-w-0 space-y-3">
      <h3 class="flex items-center gap-2 ui-label text-ui-text"><Info class="h-4 w-4 text-ui-icon" />Informacje</h3>
      <VehicleReturnInlineEditor v-if="editing" :timezone="timezone" @cancel="emit('cancel-edit')" @saved="emit('saved')" />
      <dl v-else class="divide-y divide-ui-border text-xs">
        <div v-for="row in information" :key="row.label" class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] items-center gap-3 py-2">
          <dt class="text-ui-mutedText">{{ row.label }}</dt>
          <dd class="min-w-0 break-words text-right font-medium text-ui-text">{{ row.value }}</dd>
        </div>
      </dl>
      <div v-if="!editing && entry.notes" class="border-l-2 border-ui-border-strong bg-ui-surface p-3">
        <p class="ui-label text-ui-text">Uwagi</p>
        <p class="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ui-text">{{ entry.notes }}</p>
      </div>
    </section>
    <section class="min-w-0 space-y-3 border-t border-ui-border-strong pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
      <h3 class="flex items-center gap-2 ui-label text-ui-text"><CalendarCheck class="h-4 w-4 text-ui-icon" />Terminy pojazdów</h3>
      <VehicleReturnDeadlines :vehicles="[entry.truck, entry.trailer]" :timezone="timezone" />
    </section>
    <section class="min-w-0 space-y-3 border-t border-ui-border-strong pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
      <h3 class="flex items-center gap-2 ui-label text-ui-text"><Wrench class="h-4 w-4 text-ui-icon" />Naprawy i usterki</h3>
      <VehicleReturnRepairs :vehicles="[entry.truck, entry.trailer]" :can-read-repairs="canReadRepairs" />
    </section>
    <p class="border-t border-ui-divider pt-2 text-right ui-caption lg:col-span-3">
      Utworzono: {{ formatStatisticsDate(entry.createdAt, timezone) }} · {{ returnCreatorLabel(entry.createdBy, entry.createdByUsername) }}
    </p>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { CalendarCheck, Info, Wrench } from 'lucide-vue-next'
import type { VehicleReturnEntry } from '@/types/vehicleReturn'
import { formatDisplayDate } from '@/utils/date'
import { formatStatisticsDate, formatStatisticsMetric } from '@/utils/dailyStatistics'
import { returnCreatorLabel } from '@/utils/vehicleReturnPresentation'
import VehicleReturnRepairs from './VehicleReturnRepairs.vue'
import VehicleReturnDeadlines from './VehicleReturnDeadlines.vue'
import VehicleReturnInlineEditor from './VehicleReturnInlineEditor.vue'
const props = defineProps<{ entry: VehicleReturnEntry; timezone: string; canReadRepairs: boolean; showFuel?: boolean; editing?: boolean }>()
const emit = defineEmits<{ 'cancel-edit': []; saved: [] }>()
const information = computed(() => [
  { label: 'Ciągnik', value: props.entry.truck.licensePlate },
  { label: 'Naczepa', value: props.entry.trailer?.licensePlate || '—' },
  { label: 'Kierowca zjazdu', value: props.entry.returnDriver?.name || props.entry.returnDriver?.externalId || '—' },
  { label: 'Kierowca wyjazdu', value: props.entry.departureDriver?.name || props.entry.departureDriver?.externalId || '—' },
  { label: 'Rozpoczęcie trasy', value: props.entry.tripStartedOn ? formatDisplayDate(props.entry.tripStartedOn) : '—' },
  { label: 'Dni w trasie', value: props.entry.daysOnRoad ?? '—' },
  ...(props.showFuel ? [{ label: 'Aktualne paliwo', value: formatStatisticsMetric(props.entry.truck.currentFuel.percent, '%', 0) + ' / ' + formatStatisticsMetric(props.entry.truck.currentFuel.liters, 'l', 0) }] : []),
])
</script>
