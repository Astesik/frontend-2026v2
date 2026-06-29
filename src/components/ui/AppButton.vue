<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
  >
    <LoaderCircle v-if="loading" class="h-4 w-4 animate-spin" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LoaderCircle } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  type?: 'button' | 'submit' | 'reset'
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  fullWidth?: boolean
}>(), {
  type: 'button',
  variant: 'primary',
  size: 'md',
  loading: false,
  disabled: false,
  fullWidth: false,
})

const variants = {
  primary: 'border-slate-950 bg-slate-950 text-white hover:bg-slate-800 dark:border-slate-100 dark:bg-slate-100 dark:text-app-dark dark:hover:bg-white',
  secondary: 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-app-border dark:bg-app-panel dark:text-slate-200 dark:hover:bg-app-elevated',
  ghost: 'border-transparent bg-transparent text-slate-600 hover:bg-white dark:text-app-muted dark:hover:bg-app-panel dark:hover:text-slate-50',
  danger: 'border-slate-300 bg-white text-slate-900 hover:bg-slate-100 dark:border-app-border dark:bg-app-panel dark:text-slate-100 dark:hover:bg-app-elevated',
}

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

const buttonClasses = computed(() => [
  'inline-flex items-center justify-center gap-2 rounded-2xl border font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-app-muted dark:focus:ring-offset-app-dark',
  variants[props.variant],
  sizes[props.size],
  props.fullWidth ? 'w-full' : '',
])
</script>
