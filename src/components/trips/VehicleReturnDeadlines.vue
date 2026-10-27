<template>
  <div class="space-y-2.5">
    <section v-for="vehicle in presentVehicles" :key="vehicle.id" class="min-w-0 border-l-2 border-ui-border-strong pl-2.5">
      <div class="flex items-center justify-between gap-2">
        <p class="ui-label text-ui-text-secondary">{{ vehicle.type.toUpperCase() === 'TRAILER' ? 'Naczepa' : 'Ciągnik' }}</p>
        <p class="ui-label text-ui-text">{{ vehicle.licensePlate }}</p>
      </div>
      <dl class="mt-1 divide-y divide-ui-divider text-xs">
        <div v-for="field in returnDeadlines(vehicle, timezone)" :key="field.key" class="flex items-center justify-between gap-2 py-1.5">
          <dt class="min-w-0 text-ui-mutedText">{{ field.label }}</dt>
          <dd class="flex max-w-[65%] shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-right font-medium" :class="returnDeadlineColor(field.days)">
            <span class="tabular-nums">{{ field.date ? formatDisplayDate(field.date) : '—' }}</span>
            <span v-if="field.days !== null" class="rounded-[6px] bg-ui-hover px-1.5 py-0.5 text-[11px]" :title="returnDeadlineLabel(field.days)">{{ field.days < 0 ? Math.abs(field.days) + ' dni po terminie' : field.days === 0 ? 'Dzisiaj' : field.days + ' dni' }}</span>
          </dd>
        </div>
      </dl>
    </section>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import type { ReturnVehicle } from '@/types/vehicleReturn'
import { formatDisplayDate } from '@/utils/date'
import { returnDeadlines, returnDeadlineColor, returnDeadlineLabel } from '@/utils/vehicleReturnPresentation'
const props = defineProps<{ vehicles: (ReturnVehicle | null)[]; timezone: string }>()
const presentVehicles = computed(() => props.vehicles.filter((vehicle): vehicle is ReturnVehicle => vehicle !== null))
</script>
