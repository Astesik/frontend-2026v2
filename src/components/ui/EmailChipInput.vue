<template>
  <label class="block">
    <span v-if="label" class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">{{ label }}</span>
    <div
      class="flex min-h-11 flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm transition focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200 dark:border-app-border dark:bg-app-panel dark:focus-within:border-app-muted dark:focus-within:ring-app-elevated"
    >
      <span
        v-for="email in modelValue"
        :key="email"
        class="inline-flex max-w-full items-center gap-1 rounded-xl bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-app-elevated dark:text-slate-200"
      >
        <span class="truncate">{{ email }}</span>
        <button type="button" class="shrink-0 rounded-md p-0.5 transition hover:bg-slate-200 dark:hover:bg-app-hover" :aria-label="`Usuń ${email}`" @click.prevent="removeEmail(email)">
          <X class="h-3 w-3" />
        </button>
      </span>
      <input
        v-model="draft"
        type="email"
        class="h-7 min-w-40 flex-1 bg-transparent px-1 text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-slate-50 dark:placeholder:text-app-muted"
        :placeholder="modelValue.length ? '' : placeholder"
        @blur="commitDraft"
        @keydown="handleKeydown"
        @paste="handlePaste"
      />
    </div>
    <p v-if="error" class="mt-1.5 text-xs font-medium text-danger-600 dark:text-danger-400">{{ error }}</p>
  </label>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue: string[]
  label?: string
  placeholder?: string
}>(), {
  label: undefined,
  placeholder: 'Wpisz adres i naciśnij Enter',
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const draft = ref('')
const error = ref('')
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
  emit('update:modelValue', props.modelValue.filter((item) => item !== email))
}

function handlePaste(event: ClipboardEvent) {
  const value = event.clipboardData?.getData('text') || ''
  if (!/[;,\s]/.test(value.trim())) return
  event.preventDefault()
  addEmails(value.split(/[;,\s]+/))
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ',' && event.key !== ';') return
  event.preventDefault()
  commitDraft()
}
</script>
