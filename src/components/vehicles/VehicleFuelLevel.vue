<template>
  <button
    v-if="!combined && liters != null && percent != null"
    type="button" class="whitespace-nowrap tabular-nums underline-offset-2 hover:underline focus-visible:underline"
    :title="showPercent ? 'Pokaż litry' : 'Pokaż procent'"
    @click.stop="showPercent = !showPercent" @keydown.enter.stop @keydown.space.stop
  >{{ showPercent ? percent : liters }}</button>
  <span v-else class="whitespace-nowrap tabular-nums">{{ combined && liters && percent ? `${liters} (${percent})` : percent ?? '—' }}</span>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  reading?: { fuelPct: number | null; estimatedFuelLiters?: number | null } | null
  combined?: boolean
}>()
const showPercent = ref(false)
const percent = computed(() => {
  const value = props.reading?.fuelPct
  return value != null && value >= 0 && value <= 100 ? `${Math.round(value)}%` : null
})
const liters = computed(() => {
  const value = props.reading?.estimatedFuelLiters
  return value != null && Number.isFinite(value) && value >= 0 ? `${Math.round(value)}L` : null
})
</script>
