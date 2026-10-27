<template>
  <span class="inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums text-ui-text" role="img" :aria-label="batteryLevel === null ? 'Poziom baterii: brak danych' : 'Poziom baterii: ' + batteryLevel + '%'">
    <component :is="batteryIcon" class="h-4 w-4 shrink-0" :class="iconClass" aria-hidden="true" />
    <span aria-hidden="true">{{ batteryLevel === null ? 'Brak danych' : batteryLevel + '%' }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Battery, BatteryFull, BatteryLow, BatteryMedium } from 'lucide-vue-next'

const props = defineProps<{ level?: number | null; iconClass?: string }>()
const batteryLevel = computed(() => typeof props.level === 'number' && Number.isFinite(props.level) && props.level >= 0 && props.level <= 100 ? Math.round(props.level) : null)
const batteryIcon = computed(() => batteryLevel.value === null || batteryLevel.value === 0 ? Battery : batteryLevel.value <= 25 ? BatteryLow : batteryLevel.value <= 75 ? BatteryMedium : BatteryFull)
</script>
