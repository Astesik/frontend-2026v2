<template>
  <div class="block">
    <label v-if="label" :for="inputId" class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
      {{ label }}
    </label>
    <div class="relative">
      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :disabled="disabled"
        :required="required"
        :class="inputClasses"
        @input="onInput"
        @blur="emit('blur', $event)"
        @keydown="emit('keydown', $event)"
      />
      <button
        v-if="clearable && !disabled"
        type="button"
        class="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-app-elevated dark:hover:text-slate-100 dark:disabled:hover:bg-transparent"
        :disabled="!modelValue"
        aria-label="Wyczyść pole"
        @click="emit('update:modelValue', '')"
      >
        <X class="h-3.5 w-3.5" />
      </button>
    </div>
    <span v-if="error" class="mt-2 block text-sm text-slate-700 dark:text-slate-300">
      {{ error }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue: string
  id?: string
  label?: string
  type?: string
  placeholder?: string
  autocomplete?: string
  error?: string
  disabled?: boolean
  required?: boolean
  clearable?: boolean
  size?: 'sm' | 'md'
}>(), {
  id: undefined,
  label: undefined,
  type: 'text',
  placeholder: '',
  autocomplete: undefined,
  error: undefined,
  disabled: false,
  required: false,
  clearable: false,
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  blur: [event: FocusEvent]
  keydown: [event: KeyboardEvent]
}>()

const generatedId = `input-${Math.random().toString(16).slice(2)}`
const inputId = computed(() => props.id || generatedId)

const inputClasses = computed(() => [
  'w-full rounded-2xl border bg-white text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:bg-app-panel dark:text-slate-50 dark:placeholder:text-app-muted dark:focus:border-app-muted dark:focus:ring-app-elevated',
  props.size === 'sm'
    ? `h-9 pl-3 ${props.clearable ? 'pr-10' : 'pr-3'} text-xs`
    : `h-11 pl-4 ${props.clearable ? 'pr-11' : 'pr-4'} text-sm`,
  props.error ? 'border-slate-500 dark:border-danger-400' : 'border-slate-200 dark:border-app-border',
])

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>
