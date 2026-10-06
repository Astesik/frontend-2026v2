<template>
  <div class="space-y-4">
    <section v-for="(vehicle, index) in presentVehicles" :key="vehicle.id" class="min-w-0" :class="index ? 'border-t border-ui-border-strong pt-4' : ''">
      <div class="flex items-center justify-between gap-3 border-l-2 border-ui-border-strong pl-2">
        <p class="ui-label text-ui-mutedText">{{ vehicle.type.toUpperCase() === 'TRAILER' ? 'Naczepa' : 'Ciągnik' }}</p>
        <p class="ui-label text-ui-text">{{ vehicle.licensePlate }}</p>
      </div>
      <dl class="mt-1 divide-y divide-ui-divider text-xs">
        <div v-for="field in returnDeadlines(vehicle, timezone)" :key="field.key" class="flex items-center justify-between gap-3 py-2">
          <dt class="min-w-0 text-ui-mutedText">{{ field.label }}</dt>
          <dd class="shrink-0 text-right font-medium" :class="returnDeadlineColor(field.days)">
            <p>{{ field.date ? formatDisplayDate(field.date) : '—' }}</p>
            <p v-if="field.days !== null" class="mt-0.5 text-[11px]">{{ returnDeadlineLabel(field.days) }}</p>
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
