<template>
  <AppFormField :id="inputId" :label="label" :hint="hint" :error="error" :required="required" :compact="size === 'sm'">
    <template #default="{ describedBy }">
    <div class="relative">
      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :disabled="disabled"
        :required="required"
        :readonly="readonly"
        :aria-invalid="Boolean(error)"
        :aria-describedby="describedBy"
        :class="inputClasses"
        @input="onInput"
        @blur="emit('blur', $event)"
        @keydown="emit('keydown', $event)"
      />
      <button
        v-if="clearable && !disabled"
        type="button"
        class="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-ui-icon transition hover:bg-ui-hover hover:text-ui-text disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
        :disabled="!modelValue"
        aria-label="Wyczyść pole"
        @click="emit('update:modelValue', '')"
      >
        <X class="h-3.5 w-3.5" />
      </button>
    </div>
    </template>
  </AppFormField>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import AppFormField from './AppFormField.vue'

const props = withDefaults(defineProps<{
  modelValue: string
  id?: string
  label?: string
  type?: string
  placeholder?: string
  autocomplete?: string
  error?: string
  hint?: string
  disabled?: boolean
  readonly?: boolean
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
  hint: undefined,
  disabled: false,
  readonly: false,
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
  'ui-field-control',
  props.size === 'sm'
    ? `ui-field-sm pl-3 ${props.clearable ? 'pr-10' : 'pr-3'}`
    : `ui-field-md pl-3.5 ${props.clearable ? 'pr-11' : 'pr-3.5'}`,
  props.error ? '!border-danger-500 focus:!ring-danger-100 dark:!border-danger-400' : '',
])

function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>
