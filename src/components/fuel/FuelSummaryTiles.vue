<template>
  <div class="grid shrink-0 gap-3 sm:grid-cols-2">
    <AppCard v-for="tile in tiles" :key="tile.label" compact>
      <div class="flex min-h-12 items-center gap-3">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border" :class="tile.tone">
          <component :is="tile.icon" class="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h3 class="text-sm text-ui-mutedText">{{ tile.label }}</h3>
          <IconLoader2 v-if="loading && tile.value == null" class="mt-1 h-6 w-6 animate-spin text-ui-icon" aria-label="Ładowanie podsumowania" />
          <p v-else class="text-2xl font-semibold tabular-nums">{{ tile.value == null ? '—' : tile.value.toLocaleString('pl-PL') }}</p>
        </div>
      </div>
    </AppCard>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { IconAlertTriangle, IconReceipt, IconLoader2 } from '@tabler/icons-vue'
import AppCard from '@/components/ui/AppCard.vue'
const props = defineProps<{ total?: number | null; pending?: number | null; totalLabel: string; pendingLabel: string; loading: boolean }>()
const tiles = computed(() => [
  { label: props.totalLabel, value: props.total, icon: IconReceipt, tone: 'border-info-100 bg-info-50 text-info-600 dark:border-info-400/30 dark:bg-info-400/15 dark:text-info-400' },
  { label: props.pendingLabel, value: props.pending, icon: IconAlertTriangle, tone: 'border-warning-100 bg-warning-50 text-warning-600 dark:border-warning-400/30 dark:bg-warning-400/15 dark:text-warning-400' },
])
</script>

