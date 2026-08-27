<template>
  <div class="w-full min-w-0 max-w-full" :class="compact ? 'space-y-1.5' : 'space-y-2'">
    <AppFormLabel v-if="label || $slots.label" :for-id="controlId" :required="required">
      <slot name="label">{{ label }}</slot>
    </AppFormLabel>

    <slot :id="controlId" :described-by="describedBy" />

    <AppFormError v-if="error || $slots.error" :id="errorId">
      <slot name="error">{{ error }}</slot>
    </AppFormError>
    <AppFormHint v-else-if="hint || $slots.hint" :id="hintId">
      <slot name="hint">{{ hint }}</slot>
    </AppFormHint>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppFormError from './AppFormError.vue'
import AppFormHint from './AppFormHint.vue'
import AppFormLabel from './AppFormLabel.vue'

const props = withDefaults(defineProps<{
  id?: string
  label?: string
  hint?: string
  error?: string
  required?: boolean
  compact?: boolean
}>(), {
  id: undefined,
  label: undefined,
  hint: undefined,
  error: undefined,
  required: false,
  compact: false,
})

const generatedId = `field-${Math.random().toString(16).slice(2)}`
const controlId = computed(() => props.id || generatedId)
const hintId = computed(() => `${controlId.value}-hint`)
const errorId = computed(() => `${controlId.value}-error`)
const describedBy = computed(() => props.error ? errorId.value : props.hint ? hintId.value : undefined)
</script>
