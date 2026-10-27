<template>
  <div class="return-entry-details min-w-0 bg-ui-canvas p-3 text-left">
    <AppTabs v-model="tab" :items="tabs" size="sm" aria-label="Szczegóły zjazdu i wyjazdu" class="mb-3 w-full sm:w-auto" />
    <div v-if="tab === 'information'" class="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section class="min-w-0">
        <h3 class="mb-2 flex items-center gap-2 ui-label text-ui-text"><Info class="h-4 w-4 text-ui-icon" />Informacje</h3>
        <VehicleReturnInlineEditor v-if="editing" :timezone="timezone" @cancel="emit('cancel-edit')" @saved="emit('saved')" />
        <template v-else>
          <dl class="divide-y divide-ui-divider rounded-md border border-ui-border bg-ui-surface px-2.5 text-xs">
            <div v-for="row in information" :key="row.label" class="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] items-center gap-2 py-1.5">
              <dt class="text-ui-mutedText">{{ row.label }}</dt>
              <dd class="min-w-0 break-words font-medium text-ui-text">{{ row.value }}</dd>
            </div>
          </dl>
          <section class="mt-2 border-l-2 border-ui-border-strong bg-ui-surface px-2.5 py-2">
            <h3 class="ui-label text-ui-text-secondary">Uwagi</h3>
            <p class="mt-1 whitespace-pre-wrap break-words ui-body-sm text-ui-text">{{ entry.notes || '—' }}</p>
          </section>
        </template>
      </section>
      <section class="min-w-0 border-t border-ui-border pt-3 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
        <h3 class="mb-2 flex items-center gap-2 ui-label text-ui-text"><CalendarCheck class="h-4 w-4 text-ui-icon" />Terminy przeglądów i legalizacji</h3>
        <VehicleReturnDeadlines :vehicles="[entry.truck, entry.trailer]" :timezone="timezone" />
      </section>
    </div>
    <VehicleReturnRepairs v-else-if="tab === 'repairs'" :vehicles="[entry.truck, entry.trailer]" :can-read-repairs="canReadRepairs" />
    <VehicleReturnTripSummary v-else-if="features.vehicleReturnTripSummary && tab === 'summary'" :entry="entry" :timezone="timezone" :editing="editing" />
    <p class="mt-3 border-t border-ui-divider pt-1.5 text-right ui-caption">
      Utworzono: {{ formatStatisticsDate(entry.createdAt, timezone) }} · {{ returnCreatorLabel(entry.createdBy, entry.createdByUsername) }}
    </p>
  </div>
</template>
<script setup lang="ts">
import { features } from '@/config/features'
import { computed, ref, watch } from 'vue'
import { CalendarCheck, Info } from 'lucide-vue-next'
import AppTabs from '@/components/ui/AppTabs.vue'
import type { VehicleReturnEntry } from '@/types/vehicleReturn'
import { formatDisplayDate } from '@/utils/date'
import { formatStatisticsDate, formatStatisticsMetric } from '@/utils/dailyStatistics'
import { returnCreatorLabel } from '@/utils/vehicleReturnPresentation'
import VehicleReturnRepairs from './VehicleReturnRepairs.vue'
import VehicleReturnDeadlines from './VehicleReturnDeadlines.vue'
import VehicleReturnInlineEditor from './VehicleReturnInlineEditor.vue'
import VehicleReturnTripSummary from './VehicleReturnTripSummary.vue'
const props = defineProps<{ entry: VehicleReturnEntry; timezone: string; canReadRepairs: boolean; showFuel?: boolean; editing?: boolean }>()
const emit = defineEmits<{ 'cancel-edit': []; saved: [] }>()
const tab = ref('information')
const tabs = computed(()=>[
  {value:'information',label:'Informacje'},
  {value:'repairs',label:'Naprawy',disabled:Boolean(props.editing) || !props.canReadRepairs},
  ...(features.vehicleReturnTripSummary ? [{value:'summary',label:'Podsumowanie trasy',disabled:Boolean(props.editing)}] : []),
])
watch(()=>props.editing,editing=>{if(editing)tab.value='information'})
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
<style scoped>
.return-entry-details :deep([role="tab"]) {flex:1 0 auto;white-space:nowrap;}
@media (max-width: 400px) {
  .return-entry-details :deep([role="tab"]) {font-size:11px;padding-left:6px;padding-right:6px;}
}
</style>
