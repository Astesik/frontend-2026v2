<template>
  <ul class="space-y-1 text-sm" aria-label="Etapy weryfikacji tankowania">
    <li v-for="step in steps" :key="step.label" class="flex min-w-0 items-start gap-1.5" :title="step.detail">
      <component
        :is="step.ok ? IconCircleCheck : IconAlertTriangle"
        class="mt-0.5 h-4 w-4 shrink-0"
        :class="step.ok ? 'text-success-600 dark:text-success-400' : 'text-warning-600 dark:text-warning-400'"
        aria-hidden="true"
      />
      <span class="text-ui-text">{{ step.label }}</span>
      <span :class="expanded ? 'ui-caption pt-0.5' : 'sr-only'">{{ step.detail }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-vue'
import { fuelGpsLabels, type FuelGpsStatus } from '@/services/fuelVerificationService'

const props = defineProps<{
  vehicleAssigned: boolean
  stationKnown: boolean
  gpsStatus: FuelGpsStatus | null
  expanded?: boolean
}>()

const steps = computed(() => [
  {
    label: 'Pojazd',
    ok: props.vehicleAssigned,
    detail: props.vehicleAssigned ? 'Karta przypisana w chwili tankowania' : 'Brak przypisania karty w chwili tankowania',
  },
  {
    label: 'Stacja',
    ok: props.stationKnown,
    detail: props.stationKnown ? 'Znaleziona w katalogu' : 'Nieznana stacja',
  },
  ...(props.gpsStatus ? [{
    label: 'Tankowanie',
    ok: props.gpsStatus === 'AT_STATION',
    detail: fuelGpsLabels[props.gpsStatus],
  }] : []),
])
</script>
