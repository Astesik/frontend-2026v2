<template>
  <div class="space-y-4">
    <section v-for="(vehicle, index) in vehicles.filter(Boolean)" :key="vehicle!.id" class="min-w-0" :class="index ? 'border-t border-ui-border-strong pt-4' : ''">
      <div class="mb-3 flex items-center justify-between gap-3 border-l-2 border-ui-border-strong pl-2">
        <h3 class="ui-label text-ui-mutedText">{{ vehicle!.type.toUpperCase() === 'TRAILER' ? 'Naczepa' : 'Ciągnik' }}</h3>
        <p class="ui-label text-ui-text">{{ vehicle!.licensePlate }}</p>
      </div>
      <div v-if="vehicle!.activeRepairs.length" class="space-y-2">
        <article v-for="repair in vehicle!.activeRepairs" :key="repair.id" class="rounded-[6px] border border-ui-border bg-ui-muted p-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="ui-body-sm font-semibold text-ui-text">#{{ repair.id }} · {{ repair.placeName || 'Bez miejsca' }}</span>
            <AppBadge>{{ statusLabel(repair.status) }}</AppBadge>
          </div>
          <p class="mt-1 ui-caption">Dodał: {{ returnCreatorLabel(repair.createdBy, repair.createdByUsername) }}</p>
          <ul class="mt-2 space-y-1.5">
            <li v-for="fault in repair.faults" :key="fault.id" class="flex items-start gap-2 ui-body-sm text-ui-text-secondary">
              <CircleCheck v-if="fault.status.toLowerCase() === 'done'" class="mt-0.5 h-4 w-4 shrink-0 text-success-600 dark:text-success-400" />
              <Circle v-else class="mt-0.5 h-4 w-4 shrink-0 text-ui-icon" />
              <span class="min-w-0 whitespace-pre-wrap break-words">{{ fault.description }}</span>
            </li>
            <li v-if="!repair.faults.length" class="ui-caption">Brak usterek.</li>
          </ul>
          <p v-if="repair.description" class="mt-2 ui-caption whitespace-pre-wrap">{{ repair.description }}</p>
          <RouterLink v-if="canReadRepairs" :to="`/repairs/${repair.id}`" class="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-ui-text underline-offset-4 hover:underline">Przejdź do naprawy<ArrowRight class="h-3.5 w-3.5" /></RouterLink>
        </article>
      </div>
      <p v-else class="ui-caption">Brak aktywnych napraw.</p>
    </section>
  </div>
</template>
<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { ArrowRight, Circle, CircleCheck } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import type { ReturnVehicle } from '@/types/vehicleReturn'
import { returnCreatorLabel } from '@/utils/vehicleReturnPresentation'
defineProps<{ vehicles: (ReturnVehicle | null)[]; canReadRepairs: boolean }>()
function statusLabel(value: string) {
  const labels: Record<string, string> = { new: 'Nowa', planned: 'Zaplanowana', ready_to_be_repaired: 'Gotowa do naprawy', at_location: 'W lokalizacji', in_field: 'W terenie' }
  return labels[value.toLowerCase()] || value
}
</script>
