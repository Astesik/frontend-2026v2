<template>
  <component :is="icon" class="h-3.5 w-3.5 shrink-0" />
  <span class="truncate">{{ title }}</span>
  <Pin v-if="pinned" class="h-3 w-3 shrink-0 text-ui-text" aria-label="Przypięta zakładka" />
  <span v-if="dirty" class="h-1.5 w-1.5 shrink-0 rounded-full bg-warning-400" aria-label="Niezapisane zmiany" />
</template>
<script setup lang="ts">
import type { Component } from 'vue'
import { Pin } from 'lucide-vue-next'
defineProps<{ icon: Component; title: string; pinned: boolean; dirty: boolean }>()
</script>
