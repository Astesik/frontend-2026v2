<template>
  <div class="flex min-w-0 flex-wrap items-center gap-1.5">
    <AppBadge :variant="repairStatusVariant(repair.status)" class="max-w-full !whitespace-normal break-words">{{ repairStatusBadgeLabel(repair) }}</AppBadge>
    <AppBadge v-if="repair.urgent" variant="error">Pilne</AppBadge>
  </div>
</template>

<script setup lang="ts">
import AppBadge from '@/components/ui/AppBadge.vue'
import type { Repair } from '@/types/repair'
import { repairStatusBadgeLabel, repairStatusVariant } from '@/utils/repairPresentation'

defineProps<{ repair: Pick<Repair, 'status' | 'urgent' | 'currentPlaces'> }>()
</script>
