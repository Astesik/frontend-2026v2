<template>
  <span :class="badgeClasses">
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'neutral' | 'success' | 'warning' | 'error' | 'info'
  fixedWidth?: 'sm' | 'md' | 'lg'
}>(), {
  variant: 'neutral',
  fixedWidth: undefined,
})

const variants = {
  neutral: 'border-ui-border bg-ui-muted text-ui-text-secondary',
  success: 'border-success-100 bg-success-50 text-success-600 dark:border-success-400 dark:bg-app-elevated dark:text-success-400',
  warning: 'border-warning-100 bg-warning-50 text-warning-600 dark:border-warning-400/50 dark:bg-warning-400/10 dark:text-warning-400',
  error: 'border-danger-100 bg-danger-50 text-danger-600 dark:border-danger-400 dark:bg-app-elevated dark:text-danger-400',
  info: 'border-info-100 bg-info-50 text-info-600 dark:border-info-400/50 dark:bg-info-400/10 dark:text-info-400',
}

const fixedWidths = {
  sm: 'w-20 justify-center truncate',
  md: 'w-24 justify-center truncate',
  lg: 'w-32 justify-center truncate',
}

const badgeClasses = computed(() => [
  'inline-flex items-center rounded-[6px] border px-2 py-0.5 text-[11px] font-medium leading-4',
  variants[props.variant],
  props.fixedWidth ? fixedWidths[props.fixedWidth] : '',
])
</script>
