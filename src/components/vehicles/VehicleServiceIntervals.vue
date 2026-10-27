<template>
  <AppCard title="Interwały serwisowe" :icon="Gauge" compact content-class="!p-3">
    <template #actions><AppBadge>Mockup</AppBadge></template>
    <div class="mb-2 flex flex-wrap items-baseline justify-between gap-2"><span class="ui-caption">Przebieg pojazdu</span><strong class="text-sm tabular-nums text-ui-text">{{ km(schedule.odometerKm) }}</strong></div>
    <dl class="divide-y divide-ui-divider">
      <div v-for="interval in schedule.intervals" :key="interval.id" class="py-2 first:pt-0 last:pb-0">
        <dt class="text-sm font-semibold text-ui-text">{{ interval.name }}</dt>
        <dd class="mt-1 flex flex-wrap items-end justify-between gap-2"><div class="ui-caption"><p>Co {{ km(interval.intervalKm) }} · przy {{ km(interval.lastServiceKm + interval.intervalKm) }}</p></div><span class="text-xs font-semibold tabular-nums" :class="serviceIntervalRemaining(schedule, interval) <= 0 ? 'text-danger-600 dark:text-danger-400' : serviceIntervalRemaining(schedule, interval) <= 2000 ? 'text-warning-600 dark:text-warning-400' : 'text-ui-text'">{{ serviceIntervalRemaining(schedule, interval) < 0 ? `${km(Math.abs(serviceIntervalRemaining(schedule, interval)))} po terminie` : `Za ${km(serviceIntervalRemaining(schedule, interval))}` }}</span></dd>
      </div>
    </dl>
  </AppCard>
</template>
<script setup lang="ts">
import { Gauge } from 'lucide-vue-next'
import AppCard from '@/components/ui/AppCard.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { serviceIntervalRemaining } from '@/utils/vehicleMaintenance'
import type { VehicleServiceSchedule } from '@/types/vehicleMaintenance'
defineProps<{ schedule: VehicleServiceSchedule }>()
function km(value: number) { return `${value.toLocaleString('pl-PL')} km` }
</script>
