<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="ui-icon-button"
    :class="[sizeClasses[size], variantClasses[variant]]"
    :aria-label="label"
    :title="title || label"
  >
    <LoaderCircle v-if="loading" class="h-4 w-4 animate-spin" />
    <slot v-else />
  </button>
</template>

<script setup lang="ts">
import { LoaderCircle } from 'lucide-vue-next'

withDefaults(defineProps<{
  label: string
  title?: string
  type?: 'button' | 'submit' | 'reset'
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'danger'
  disabled?: boolean
  loading?: boolean
}>(), {
  title: undefined,
  type: 'button',
  size: 'md',
  variant: 'default',
  disabled: false,
  loading: false,
})

const sizeClasses = {
  sm: '!h-8 !w-8',
  md: '',
  lg: '!h-10 !w-10',
}

const variantClasses = {
  default: '',
  ghost: '!border-transparent !bg-transparent !shadow-none hover:!bg-ui-hover',
  danger: 'hover:!border-danger-100 hover:!bg-danger-50 hover:!text-danger-600 dark:hover:!border-danger-400/40 dark:hover:!bg-danger-500/10 dark:hover:!text-danger-400',
}
</script>
