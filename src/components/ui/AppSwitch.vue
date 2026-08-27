<template>
  <label class="flex min-h-9 items-center justify-between gap-3 rounded-[var(--rw-radius-control)] border border-ui-border bg-ui-surface px-3 py-2 text-sm font-medium text-ui-text-secondary shadow-soft">
    <span class="min-w-0 truncate">{{ label }}</span>
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :disabled="disabled"
      class="relative h-5 w-9 shrink-0 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus disabled:cursor-not-allowed disabled:bg-ui-disabled"
      :class="modelValue ? 'bg-ui-text' : 'bg-ui-border-strong'"
      @click="$emit('update:modelValue', !modelValue)"
    >
      <span
        class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-ui-surface shadow-soft transition"
        :class="modelValue ? 'translate-x-4' : 'translate-x-0'"
      ></span>
    </button>
  </label>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: boolean
  label: string
  disabled?: boolean
}>(), {
  disabled: false,
})

defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>
