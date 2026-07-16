<template>
  <label class="flex min-h-9 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-200">
    <span class="min-w-0 truncate">{{ label }}</span>
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :disabled="disabled"
      class="relative h-5 w-9 shrink-0 rounded-full transition focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-slate-600"
      :class="modelValue ? 'bg-slate-950 dark:bg-slate-100' : 'bg-slate-200 dark:bg-app-elevated'"
      @click="$emit('update:modelValue', !modelValue)"
    >
      <span
        class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition dark:bg-app-dark"
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
