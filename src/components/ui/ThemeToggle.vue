<template>
  <button
    type="button"
    class="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-app-border dark:bg-app-panel dark:text-slate-200 dark:hover:bg-app-elevated"
    :class="compact ? 'w-10 px-0' : ''"
    :aria-label="uiStore.isDark ? 'Wlacz jasny motyw' : 'Wlacz ciemny motyw'"
    @click="uiStore.toggleTheme()"
  >
    <Sun v-if="uiStore.isDark" class="h-4 w-4" />
    <Moon v-else class="h-4 w-4" />
    <span v-if="!compact">{{ uiStore.isDark ? 'Jasny' : 'Ciemny' }}</span>
  </button>
</template>

<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import { useUiStore } from '@/stores/uiStore'

withDefaults(defineProps<{
  compact?: boolean
}>(), {
  compact: false,
})

const uiStore = useUiStore()
</script>
