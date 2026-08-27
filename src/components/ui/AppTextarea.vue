<template>
  <AppFormField :id="textareaId" :hint="hint" :error="error" :required="required" :compact="size === 'sm'">
    <template v-if="label || showCounter" #label>
      <div class="flex w-full items-center justify-between gap-3">
        <span>{{ label }}</span>
        <span v-if="showCounter" class="ml-auto shrink-0 text-xs font-normal tabular-nums text-ui-mutedText">
        {{ modelValue.length }} / {{ maxlength }}
        </span>
      </div>
    </template>

    <template #default="{ describedBy }">
    <textarea
      :id="textareaId"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :maxlength="maxlength"
      :disabled="disabled"
      :readonly="readonly"
      :aria-invalid="Boolean(error)"
      :aria-describedby="describedBy"
      class="ui-field-control resize-y leading-5"
      :class="[
        size === 'sm' ? 'min-h-16 px-3 py-2 text-xs' : 'min-h-24 px-3.5 py-3 text-sm',
        error ? '!border-danger-500 focus:!ring-danger-100 dark:!border-danger-400' : '',
      ]"
      @input="onInput"
    ></textarea>
    </template>
  </AppFormField>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppFormField from './AppFormField.vue'

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
  hint?: string
  required?: boolean
  size?: 'sm' | 'md'
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
  hint: undefined,
  required: false,
  size: 'md',
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
