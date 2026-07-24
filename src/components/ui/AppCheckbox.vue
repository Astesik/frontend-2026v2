<template>
  <button
    type="button"
    role="checkbox"
    :aria-checked="modelValue"
    :aria-label="ariaLabel || label"
    :disabled="disabled"
    class="inline-flex items-center gap-2 rounded-xl text-left transition disabled:cursor-not-allowed disabled:opacity-50"
    :class="label ? 'min-h-8 px-1.5 py-1' : 'h-8 w-8 justify-center'"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span
      class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition"
      :class="modelValue
        ? 'border-slate-950 bg-slate-950 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-app-dark'
        : 'border-slate-300 bg-white text-transparent dark:border-app-border dark:bg-app-panel'"
    >
      <Check class="h-3.5 w-3.5" />
    </span>
    <span v-if="label" class="min-w-0 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
      {{ label }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { Check } from 'lucide-vue-next'

withDefaults(defineProps<{
  modelValue: boolean
  label?: string
  ariaLabel?: string
  disabled?: boolean
}>(), {
  label: undefined,
  ariaLabel: undefined,
  disabled: false,
})

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>
