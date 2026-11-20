<template>
  <span class="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-ui-text" :title="detail">
    <component
      :is="approved ? IconCircleCheck : IconAlertTriangle" class="h-4 w-4 shrink-0"
      :class="approved ? 'text-success-600 dark:text-success-400' : 'text-warning-600 dark:text-warning-400'"
      aria-hidden="true"
    />
    {{ approved ? 'Zatwierdzone' : 'Wymaga uwagi' }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-vue'
import { fuelGpsLabels, type FuelGpsStatus } from '@/services/fuelVerificationService'

const props = defineProps<{
  vehicleAssigned: boolean
  stationKnown: boolean
  gpsStatus: FuelGpsStatus | null
}>()

const approved = computed(() => props.vehicleAssigned && props.stationKnown && props.gpsStatus === 'AT_STATION')
const detail = computed(() => [
  !props.vehicleAssigned && 'Brak przypisania karty',
  !props.stationKnown && 'Nieznana stacja',
  fuelGpsLabels[props.gpsStatus ?? 'NOT_CHECKED'],
].filter(Boolean).join(' · '))
</script>
