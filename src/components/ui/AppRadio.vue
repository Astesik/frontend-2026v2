<template>
  <button
    type="button"
    role="radio"
    :aria-checked="modelValue === value"
    :disabled="disabled"
    class="flex min-h-9 items-center gap-2 rounded-[var(--rw-radius-item)] px-1.5 text-left text-sm text-ui-text-secondary transition focus-visible:ring-2 focus-visible:ring-ui-focus disabled:cursor-not-allowed disabled:text-ui-disabled-text"
    @click="emit('update:modelValue', value)"
  >
    <span class="grid h-5 w-5 shrink-0 place-items-center rounded-full border transition" :class="modelValue === value ? 'border-ui-text' : 'border-ui-input-border bg-ui-input'">
      <span v-if="modelValue === value" class="h-2.5 w-2.5 rounded-full bg-ui-text"></span>
    </span>
    <span class="min-w-0"><slot>{{ label }}</slot></span>
  </button>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string
  value: string
  label?: string
  disabled?: boolean
}>(), {
  label: undefined,
  disabled: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>
