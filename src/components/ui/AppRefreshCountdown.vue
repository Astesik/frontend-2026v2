<template>
  <span class="relative inline-flex h-8 w-8 shrink-0 items-center justify-center text-ui-mutedText" role="status" :aria-label="loading ? 'Odświeżanie danych' : `Odświeżenie za ${remaining} sekund`" :title="loading ? 'Odświeżanie danych' : `Odświeżenie za ${remaining} s`">
    <svg class="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="13" stroke="currentColor" stroke-width="2" class="text-ui-border" />
      <circle cx="16" cy="16" r="13" stroke="currentColor" stroke-width="2" stroke-linecap="round" :stroke-dasharray="circumference" :stroke-dashoffset="circumference * (1 - remaining / seconds)" class="text-ui-icon transition-[stroke-dashoffset] duration-500" />
    </svg>
    <LoaderCircle v-if="loading" class="h-3.5 w-3.5 animate-spin" />
    <span v-else class="text-[10px] font-medium tabular-nums">{{ remaining }}</span>
  </span>
</template>
<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'
defineProps<{ remaining: number; seconds: number; loading: boolean }>()
const circumference = 2 * Math.PI * 13
</script>
