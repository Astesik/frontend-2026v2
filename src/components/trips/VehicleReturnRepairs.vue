<template>
  <div class="grid min-w-0 gap-3 lg:grid-cols-2">
    <section v-for="(vehicle, index) in vehicles.filter(Boolean)" :key="vehicle!.id" class="min-w-0" :class="index ? 'border-t border-ui-border-strong pt-3 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0' : ''">
      <div class="mb-2 flex items-center justify-between gap-2">
        <h3 class="flex items-center gap-2 ui-label text-ui-text-secondary"><component :is="vehicle!.type.toUpperCase() === 'TRAILER' ? Container : Truck" class="h-4 w-4 text-ui-icon" />{{ vehicle!.type.toUpperCase() === 'TRAILER' ? 'Naczepa' : 'Ciągnik' }}</h3>
        <p class="ui-body-sm font-semibold text-ui-text">{{ vehicle!.licensePlate }}</p>
      </div>
      <div v-if="vehicle!.activeRepairs.length" class="space-y-2">
        <article v-for="repair in vehicle!.activeRepairs" :key="repair.id" class="overflow-hidden rounded-[6px] border border-ui-border bg-ui-surface shadow-soft">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-ui-divider bg-ui-muted px-2.5 py-2">
            <span class="flex min-w-0 items-center gap-2 ui-body-sm font-semibold text-ui-text"><Wrench class="h-3.5 w-3.5 shrink-0 text-ui-icon" /><span class="min-w-0 break-words">#{{ repair.id }} · {{ repair.placeName || 'Bez miejsca' }}</span></span>
            <AppBadge :variant="statusVariant(repair.status)">{{ statusLabel(repair.status) }}</AppBadge>
          </div>
          <div class="px-2.5 py-2">
            <p class="ui-caption">Dodał: {{ returnCreatorLabel(repair.createdBy, repair.createdByUsername) }}</p>
            <ul class="mt-1.5 divide-y divide-ui-divider">
              <li v-for="fault in repair.faults" :key="fault.id" class="flex items-start gap-2 py-1.5 ui-body-sm text-ui-text">
                <CircleCheck v-if="fault.status.toLowerCase() === 'done'" class="mt-0.5 h-4 w-4 shrink-0 text-success-600 dark:text-success-400" />
                <Circle v-else class="mt-0.5 h-4 w-4 shrink-0 text-ui-icon" />
                <span class="min-w-0 whitespace-pre-wrap break-words">{{ fault.description }}</span>
              </li>
              <li v-if="!repair.faults.length" class="ui-caption">Brak usterek.</li>
            </ul>
            <p v-if="repair.description" class="mt-2 ui-caption whitespace-pre-wrap">{{ repair.description }}</p>
            <RouterLink v-if="canReadRepairs" :to="`/repairs/${repair.id}`" class="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-ui-text-secondary underline-offset-4 hover:text-ui-text hover:underline">Przejdź do naprawy<ArrowRight class="h-3.5 w-3.5" /></RouterLink>
          </div>
        </article>
      </div>
      <p v-else class="ui-caption">Brak aktywnych napraw.</p>
    </section>
  </div>
</template>
<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowRight, Circle, CircleCheck, Container, Truck, Wrench } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import type { ReturnVehicle } from '@/types/vehicleReturn'
import { returnCreatorLabel } from '@/utils/vehicleReturnPresentation'
defineProps<{ vehicles: (ReturnVehicle | null)[]; canReadRepairs: boolean }>()
function statusLabel(value: string) {
  const labels: Record<string, string> = { new: 'Nowa', planned: 'Zaplanowana', ready_to_be_repaired: 'Gotowa do naprawy', at_location: 'W lokalizacji', in_field: 'W terenie' }
  return labels[value.toLowerCase()] || value
}
function statusVariant(value: string): 'neutral' | 'warning' | 'success' {
  const status = value.toLowerCase()
  if (status === 'done') return 'success'
  if (['ready_to_be_repaired', 'at_location', 'in_field', 'infield'].includes(status)) return 'warning'
  return 'neutral'
}
</script>
