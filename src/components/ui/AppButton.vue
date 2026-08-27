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
  primary: 'border-ui-text bg-ui-text text-ui-surface hover:opacity-[0.88] active:opacity-80',
  secondary: 'border-ui-border bg-ui-surface text-ui-text-secondary hover:border-ui-border-strong hover:bg-ui-hover hover:text-ui-text active:bg-ui-selected',
  ghost: 'border-transparent bg-transparent text-ui-text-secondary shadow-none hover:bg-ui-hover hover:text-ui-text active:bg-ui-selected',
  danger: 'border-danger-100 bg-ui-surface text-danger-600 hover:bg-danger-50 active:bg-danger-100 dark:border-danger-400/30 dark:text-danger-400 dark:hover:bg-danger-500/10',
}

const sizes = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

const buttonClasses = computed(() => [
  'inline-flex items-center justify-center gap-2 rounded-[6px] border font-medium shadow-soft transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ui-canvas disabled:cursor-not-allowed disabled:border-ui-border disabled:bg-ui-disabled disabled:text-ui-disabled-text disabled:opacity-100',
  variants[props.variant],
  sizes[props.size],
  props.fullWidth ? 'w-full' : '',
])
</script>
