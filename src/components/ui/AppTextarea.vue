<template>
  <div class="block">
    <div v-if="label || showCounter" class="mb-2 flex items-center justify-between gap-3">
      <label v-if="label" :for="textareaId" class="text-sm font-medium text-slate-700 dark:text-slate-200">
        {{ label }}
      </label>
      <span v-if="showCounter" class="ml-auto shrink-0 text-xs tabular-nums text-slate-500 dark:text-app-muted">
        {{ modelValue.length }} / {{ maxlength }}
      </span>
    </div>

    <textarea
      :id="textareaId"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :maxlength="maxlength"
      :disabled="disabled"
      :readonly="readonly"
      class="min-h-24 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-app-border dark:bg-app-panel dark:text-slate-50 dark:placeholder:text-app-muted dark:focus:border-app-muted dark:focus:ring-app-elevated"
      @input="onInput"
    ></textarea>

    <span v-if="error" class="mt-2 block text-sm text-slate-700 dark:text-slate-300">
      {{ error }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  id?: string
  label?: string
  placeholder?: string
  rows?: number
  maxlength?: number
  showCounter?: boolean
  disabled?: boolean
  readonly?: boolean
  error?: string
}>(), {
  id: undefined,
  label: undefined,
  placeholder: '',
  rows: 4,
  maxlength: 1000,
  showCounter: false,
  disabled: false,
  readonly: false,
  error: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const generatedId = `textarea-${Math.random().toString(16).slice(2)}`
const textareaId = computed(() => props.id || generatedId)

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value.slice(0, props.maxlength))
}
</script>
