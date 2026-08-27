<template>
  <button
    type="button"
    role="checkbox"
    :aria-checked="modelValue"
    :aria-label="ariaLabel || label"
    :disabled="disabled"
    class="inline-flex items-center gap-2 rounded-[var(--rw-radius-item)] text-left transition focus-visible:ring-2 focus-visible:ring-ui-focus disabled:cursor-not-allowed disabled:text-ui-disabled-text"
    :class="label ? 'min-h-8 px-1.5 py-1' : 'h-8 w-8 justify-center'"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span
      class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition"
      :class="modelValue
        ? 'border-ui-text bg-ui-text text-ui-surface'
        : 'border-ui-input-border bg-ui-input text-transparent'"
    >
      <Check class="h-3.5 w-3.5" />
    </span>
    <span v-if="label" class="min-w-0 truncate text-sm font-medium text-ui-text-secondary">
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
