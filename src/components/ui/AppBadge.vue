<template>
  <span :class="badgeClasses">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'neutral' | 'success' | 'warning' | 'error' | 'info'
}>(), {
  variant: 'neutral',
})

const variants = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-app-border dark:bg-app-elevated dark:text-slate-300',
  success: 'border-success-100 bg-success-50 text-success-600 dark:border-success-400 dark:bg-app-elevated dark:text-success-400',
  warning: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400 dark:bg-app-elevated dark:text-amber-300',
  error: 'border-danger-100 bg-danger-50 text-danger-600 dark:border-danger-400 dark:bg-app-elevated dark:text-danger-400',
  info: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-app-border dark:bg-app-elevated dark:text-slate-300',
}

const badgeClasses = computed(() => [
  'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
  variants[props.variant],
])
</script>
