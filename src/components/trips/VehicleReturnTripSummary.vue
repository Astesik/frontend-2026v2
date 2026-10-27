<template>
  <section class="min-w-0">
    <div v-if="!canReadDriverTrip" class="ui-empty-state">Brak dostępu do historii trasy.</div>
    <div v-else-if="!request" class="rounded-md border border-ui-border bg-ui-surface p-4 text-sm text-ui-mutedText">Uzupełnij ciągnik, rozpoczęcie trasy i kierowcę zjazdu, aby pobrać podsumowanie.</div>
    <template v-else>
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p class="min-w-0 text-xs text-ui-mutedText">{{ entry.truck.licensePlate }} · {{ entry.returnDriver?.name || entry.returnDriver?.externalId || '—' }}</p>
        <AppButton size="sm" variant="secondary" :disabled="loading" @click="reload"><RefreshCw class="h-3.5 w-3.5" />Odśwież raport</AppButton>
      </div>
      <div v-if="loading" class="mb-3 space-y-1" role="status">
        <div class="flex justify-between text-xs text-ui-mutedText"><span>{{ report ? 'Wczytywanie historii' : 'Ustalanie początku trasy' }}</span><span>{{ progress == null ? loaded + ' punktów' : progress + '%' }}</span></div>
        <div class="h-1.5 overflow-hidden rounded-full bg-ui-muted" role="progressbar" :aria-valuenow="progress ?? undefined" aria-valuemin="0" aria-valuemax="100" aria-label="Wczytywanie trasy"><div class="h-full bg-ui-icon transition-[width]" :class="progress == null ? 'w-1/3 animate-pulse' : ''" :style="progress == null ? {} : {width:progress+'%'}" /></div>
      </div>
      <p v-if="error" class="mb-3 ui-error" role="alert">{{ error }}<span v-if="records.length" class="block">Widoczna jest tylko wczytana część historii.</span></p>
      <p v-if="report?.status === 'DRIVER_NOT_OBSERVED'" class="rounded-md border border-ui-border bg-ui-surface p-4 text-sm text-ui-mutedText">Brak odczytu karty tego kierowcy w wybranym dniu.</p>
      <div v-else-if="report?.status === 'RESOLVED'" class="grid min-w-0 gap-4 lg:grid-cols-[minmax(14rem,0.65fr)_minmax(0,2fr)]">
        <div class="min-w-0 space-y-3">
          <dl class="divide-y divide-ui-divider rounded-md border border-ui-border bg-ui-surface px-3">
            <div v-for="metric in metrics" :key="metric.label" class="py-3"><dt class="flex items-center gap-2 text-xs text-ui-mutedText"><component :is="metric.icon" class="h-3.5 w-3.5" />{{ metric.label }}</dt><dd class="mt-1 text-lg font-semibold tabular-nums text-ui-text">{{ metric.value }}</dd></div>
          </dl>
          <p class="text-xs leading-relaxed text-ui-mutedText">{{ formatStatisticsDate(report.resolvedFrom, report.timezone) }} — {{ formatStatisticsDate(report.to, report.timezone) }}</p>
          <p v-if="summary?.distanceSource === 'GPS_ESTIMATE'" class="text-xs text-warning-600 dark:text-warning-400">Kilometry są szacunkiem odległości między odczytami GPS, nie rzeczywistym przebiegiem drogowym.</p>
          <p v-if="report.possibleContinuation" class="text-xs text-ui-mutedText">Karta była odczytana także poprzedniego dnia — trasa mogła rozpocząć się wcześniej.</p>
          <p v-if="report.startEvidence === 'IDENTIFIER_WITHOUT_ABSENCE_FLAG'" class="text-xs text-ui-mutedText">Obecność karty została wywnioskowana z identyfikatora, bez jawnej flagi obecności.</p>
          <ul class="space-y-2 text-xs leading-relaxed text-ui-mutedText"><li v-for="warning in warnings" :key="warning">{{ localHistoryWarning(warning) }}</li></ul>
        </div>
        <LocalVehicleHistoryMap :records="records" :events="summary?.fuelEvents || []" :complete="complete" :loading="loading" :total="summary?.sampleCount || 0" :timezone="report.timezone" class="lg:min-h-[30rem]" />
      </div>
      <section v-if="summary?.fuelEvents.length" class="mt-4 min-w-0">
        <h3 class="ui-section-title mb-2">Zdarzenia paliwowe</h3>
        <div class="space-y-2">
          <article v-for="(event,index) in summary.fuelEvents" :key="event.detectedAt + index" class="flex flex-wrap items-start justify-between gap-2 rounded-md border border-ui-border bg-ui-surface p-3 text-xs">
            <div><p class="font-medium text-ui-text">{{ fuelEventLabel(event) }}</p><p class="mt-1 text-ui-mutedText">{{ formatStatisticsDate(event.detectedAt, report?.timezone || timezone) }}</p></div>
            <div class="text-right"><p class="font-medium">{{ historyMetric(event.estimatedAmountLiters,'l') }}</p><p class="mt-1 text-ui-mutedText">{{ historyMetric(event.beforeLiters,'l') }} → {{ historyMetric(event.afterLiters,'l') }}</p></div>
            <p class="w-full text-ui-mutedText">{{ event.levelSource === 'SENSOR_LITERS' ? 'Pomiar czujnika w litrach' : 'Szacunek z procentu obecnej pojemności zbiornika' }} · {{ event.consumptionAdjusted ? 'Uwzględniono zużycie z licznika' : 'Bez korekty zużycia' }}</p>
          </article>
        </div>
        <p class="mt-2 text-xs text-ui-mutedText">Zdarzenia są szacunkowe. Potencjalny ubytek nie potwierdza kradzieży paliwa.</p>
      </section>
    </template>
  </section>
</template>
<script setup lang="ts">
import { computed, watch } from 'vue'
import { Fuel, Gauge, Milestone, RefreshCw } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import LocalVehicleHistoryMap from '@/components/map/LocalVehicleHistoryMap.vue'
import { useLocalVehicleHistory } from '@/composables/useLocalVehicleHistory'
import { useVehicleReturnPermissions } from '@/composables/useVehicleReturnPermissions'
import { useAuthStore } from '@/stores/authStore'
import { fuelEventLabel, historyMetric, localHistoryWarning, returnTripRequest } from '@/utils/localPositionHistory'
import { formatStatisticsDate } from '@/utils/dailyStatistics'
import type { VehicleReturnEntry } from '@/types/vehicleReturn'
const props = defineProps<{entry:VehicleReturnEntry;timezone:string;editing?:boolean}>()
const {canReadDriverTrip} = useVehicleReturnPermissions(), auth = useAuthStore()
const history = useLocalVehicleHistory()
const {records,report,loading,error,loaded,complete,progress} = history
const request = computed(()=>returnTripRequest(props.entry))
const summary = computed(()=>report.value?.summary || null)
const warnings = computed(()=>[...new Set([...(report.value?.warnings || []),...(summary.value?.warnings || [])])])
const metrics = computed(()=>[
  {label:'Kilometry łącznie',value:historyMetric(summary.value?.distanceKm,'km'),icon:Milestone},
  {label:'Zużyte paliwo',value:historyMetric(summary.value?.fuelUsedLiters,'l'),icon:Fuel},
  {label:'Średnie spalanie',value:historyMetric(summary.value?.consumptionLPer100Km,'l/100 km'),icon:Gauge},
])
function reload(){if(request.value && canReadDriverTrip.value && !props.editing)void history.load(request.value)}
watch(()=>JSON.stringify([auth.activeCompanyId,canReadDriverTrip.value,request.value,props.editing]),()=>{history.clear();reload()},{immediate:true})
</script>
