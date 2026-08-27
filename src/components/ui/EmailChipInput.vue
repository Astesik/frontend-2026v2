<template>
  <AppFormField :id="inputId" :label="label" :hint="hint" :error="error">
    <template #default="{ describedBy }">
      <div class="flex min-h-11 flex-wrap items-center gap-1.5 rounded-[var(--rw-radius-control)] border border-ui-input-border bg-ui-input px-2.5 py-2 shadow-soft transition hover:border-ui-border-strong focus-within:border-ui-input-focus focus-within:bg-ui-input-hover focus-within:ring-2 focus-within:ring-ui-focus/60">
        <span
          v-for="email in modelValue"
          :key="email"
          class="inline-flex max-w-full items-center gap-1 rounded-[var(--rw-radius-item)] border border-ui-border bg-ui-muted px-2 py-1 text-xs font-medium text-ui-text-secondary"
        >
          <span class="truncate">{{ email }}</span>
          <button
            type="button"
            class="shrink-0 rounded-md p-0.5 text-ui-icon transition hover:bg-ui-hover hover:text-ui-text"
            :aria-label="`Usuń ${email}`"
            :disabled="disabled"
            @click.prevent="removeEmail(email)"
          >
            <X class="h-3 w-3" />
          </button>
        </span>
        <input
          :id="inputId"
          v-model="draft"
          type="email"
          class="h-7 min-w-40 flex-1 bg-transparent px-1 text-sm text-ui-text outline-none placeholder:text-ui-mutedText disabled:cursor-not-allowed disabled:text-ui-disabled-text"
          :placeholder="modelValue.length ? '' : placeholder"
          :disabled="disabled"
          :aria-describedby="describedBy"
          :aria-invalid="Boolean(error)"
          @blur="commitDraft"
          @keydown="handleKeydown"
          @paste="handlePaste"
        />
      </div>
    </template>
  </AppFormField>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import AppFormField from './AppFormField.vue'

const props = withDefaults(defineProps<{
  modelValue: string[]
  label?: string
  hint?: string
  placeholder?: string
  disabled?: boolean
}>(), {
  label: undefined,
  hint: undefined,
  placeholder: 'Wpisz adres i naciśnij Enter',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const draft = ref('')
const error = ref('')
const inputId = `email-tags-${Math.random().toString(16).slice(2)}`
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function addEmails(values: string[]) {
  const next = [...props.modelValue]
  const invalid: string[] = []

  values.map(normalize).filter(Boolean).forEach((email) => {
    if (!emailPattern.test(email)) invalid.push(email)
    else if (!next.includes(email)) next.push(email)
  })

  error.value = invalid.length ? `Nieprawidłowy adres: ${invalid[0]}` : ''
  emit('update:modelValue', next)
}

function commitDraft() {
  if (!draft.value.trim()) return
  addEmails(draft.value.split(/[;,\s]+/))
  draft.value = ''
}

function removeEmail(email: string) {
  if (!props.disabled) emit('update:modelValue', props.modelValue.filter((item) => item !== email))
}

function handlePaste(event: ClipboardEvent) {
  const value = event.clipboardData?.getData('text') || ''
  if (!/[;,\s]/.test(value.trim())) return
  event.preventDefault()
  addEmails(value.split(/[;,\s]+/))
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Backspace' && !draft.value && props.modelValue.length) {
    removeEmail(props.modelValue[props.modelValue.length - 1])
    return
  }
  if (event.key !== 'Enter' && event.key !== ',' && event.key !== ';') return
  event.preventDefault()
  commitDraft()
}
</script>
