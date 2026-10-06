<template>
  <span v-if="alerts.length" class="inline-flex items-center" @click.stop>
  <AppPopover v-model:open="open" open-on-hover :hover-delay="150" content-class="p-3">
    <template #trigger>
      <button type="button" class="inline-flex shrink-0 items-center text-warning-600 dark:text-warning-400" :aria-label="'Terminy pojazdu ' + vehicle.licensePlate" :aria-expanded="open">
        <TriangleAlert class="h-4 w-4" />
      </button>
    </template>
    <div class="w-64 max-w-[calc(100vw-3rem)] space-y-2 text-xs">
      <p class="font-semibold text-ui-text">{{ vehicle.licensePlate }} · terminy</p>
      <div v-for="alert in alerts" :key="alert.key" class="border-t border-ui-divider pt-2">
        <p class="text-ui-text">{{ alert.label }}</p>
        <p class="mt-1 flex justify-between gap-3 font-medium" :class="returnDeadlineColor(alert.days)">
          <span>{{ formatDisplayDate(alert.date!) }}</span><span>{{ returnDeadlineLabel(alert.days) }}</span>
        </p>
      </div>
    </div>
  </AppPopover>
  </span>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import AppPopover from '@/components/ui/AppPopover.vue'
import type { ReturnVehicle } from '@/types/vehicleReturn'
import { formatDisplayDate } from '@/utils/date'
import { returnDeadlines, returnDeadlineColor, returnDeadlineLabel } from '@/utils/vehicleReturnPresentation'
const props = defineProps<{ vehicle: ReturnVehicle; timezone: string }>()
const open = ref(false)
const alerts = computed(() => returnDeadlines(props.vehicle, props.timezone).filter((field) => field.days !== null && field.days < 30))
</script>
