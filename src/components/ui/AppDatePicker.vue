<template>
  <AppFormField v-bind="$attrs" :id="inputId" :label="label" :hint="hint" :error="error" :required="required" :compact="size === 'sm'" :class="inline ? 'ui-inline-field' : ''">
    <template #default="{ describedBy }">
      <div class="relative">
        <div v-if="editable" class="ui-field-control flex items-center gap-1 focus-within:!border-ui-input-focus focus-within:ring-2 focus-within:ring-ui-focus/60" :class="[inline ? 'ui-inline-field-control' : size === 'sm' ? 'ui-field-sm' : 'ui-field-md', error || manualError ? '!border-danger-500' : '', disabled ? 'opacity-50' : '']">
          <input
            :id="inputId"
            ref="inputElement"
            :value="typedValue"
            type="text"
            autocomplete="off"
            class="min-w-0 flex-1 bg-transparent text-ui-text outline-none placeholder:text-ui-mutedText disabled:cursor-not-allowed"
            :placeholder="placeholder === 'Wybierz datę' ? 'DD.MM.RRRR' : placeholder"
            :aria-label="ariaLabel || label"
            :aria-describedby="describedBy"
            :aria-invalid="Boolean(error || manualError)"
            :title="manualError || undefined"
            :disabled="disabled"
            :required="required"
            @input="handleManualInput"
            @focus="isTyping = true"
            @blur="finishManualInput"
            @keydown.escape="isOpen = false"
          />
          <button ref="buttonElement" type="button" class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-ui-icon hover:text-ui-text disabled:cursor-not-allowed" :disabled="disabled" :aria-expanded="isOpen" :aria-label="`Otwórz kalendarz: ${ariaLabel || label || 'data'}`" title="Wybierz z kalendarza" aria-haspopup="dialog" @click="toggleOpen">
            <CalendarDays class="h-4 w-4" />
          </button>
          <button v-if="typedValue && !disabled && !inline" type="button" class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-ui-icon hover:text-ui-text" aria-label="Wyczyść datę" title="Wyczyść datę" @click="clearDate"><X class="h-3.5 w-3.5" /></button>
        </div>
        <button
          v-else
          :id="inputId"
          ref="buttonElement"
          type="button"
          :disabled="disabled"
          class="ui-field-control flex items-center gap-2 text-left"
          :class="[
            inline ? 'ui-inline-field-control' : size === 'sm' ? 'ui-field-sm' : 'ui-field-md',
            modelValue && !disabled && !inline ? 'pr-10' : '',
            isOpen ? '!border-ui-input-focus !bg-ui-input-hover ring-2 ring-ui-focus/60' : '',
            error ? '!border-danger-500' : '',
          ]"
          :aria-expanded="isOpen"
          :aria-label="ariaLabel"
          aria-haspopup="dialog"
          :aria-describedby="describedBy"
          @click="toggleOpen"
          @keydown.escape.prevent="isOpen = false"
          @keydown.enter.prevent="isOpen = !isOpen"
        >
          <CalendarDays v-if="!inline" class="h-4 w-4 shrink-0 text-ui-icon" />
          <span class="min-w-0 flex-1 truncate" :class="modelValue ? 'text-ui-text' : 'text-ui-mutedText'">{{ displayValue }}</span>
          <CalendarDays v-if="inline" class="h-4 w-4 shrink-0 text-ui-icon" />
        </button>
        <AppIconButton
          v-if="!editable && modelValue && !disabled && !inline"
          label="Wyczyść datę"
          size="sm"
          variant="ghost"
          class="absolute right-1 top-1/2 -translate-y-1/2"
          @click="clearDate"
        >
          <X class="h-3.5 w-3.5" />
        </AppIconButton>
      </div>
    </template>
  </AppFormField>

  <AppDropdown :open="isOpen" :anchor="buttonElement" role="dialog" :match-width="false" :max-height="390" content-class="p-3" @close="isOpen = false">
    <AppCalendarPanel :model-value="modelValue" @select="selectDate" />
    <div class="mt-3 flex items-center justify-between border-t border-ui-divider pt-3">
      <AppButton size="sm" variant="ghost" @click="selectDate(toDateValue(new Date()))">Dzisiaj</AppButton>
      <AppButton size="sm" variant="ghost" @click="clearDate">Wyczyść</AppButton>
    </div>
  </AppDropdown>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
import { computed, ref, watch } from 'vue'
import { CalendarDays, X } from 'lucide-vue-next'
import AppButton from './AppButton.vue'
import AppCalendarPanel from './AppCalendarPanel.vue'
import AppDropdown from './AppDropdown.vue'
import AppFormField from './AppFormField.vue'
import AppIconButton from './AppIconButton.vue'
import { formatDisplayDate, parseTypedDate, toDateValue } from '@/utils/date'

const props = withDefaults(defineProps<{
  modelValue: string
  editable?: boolean
  inline?: boolean
  ariaLabel?: string
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  size?: 'sm' | 'md'
}>(), {
  inline: false,
  editable: false,
  ariaLabel: undefined,
  label: undefined,
  hint: undefined,
  error: undefined,
  placeholder: 'Wybierz datę',
  disabled: false,
  required: false,
  size: 'md',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const buttonElement = ref<HTMLElement | null>(null)
const inputElement = ref<HTMLInputElement | null>(null)
const typedValue = ref(props.modelValue ? formatDisplayDate(props.modelValue) : '')
const manualError = ref('')
const isTyping = ref(false)
const isOpen = ref(false)
const inputId = `date-picker-${Math.random().toString(16).slice(2)}`
const displayValue = computed(() => props.modelValue ? formatDisplayDate(props.modelValue) : props.placeholder)

function toggleOpen() {
  if (!props.disabled) isOpen.value = !isOpen.value
}

function selectDate(value: string) {
  syncTypedValue(value)
  emit('update:modelValue', value)
  isOpen.value = false
}

function clearDate() {
  syncTypedValue('')
  emit('update:modelValue', '')
  isOpen.value = false
}

function syncTypedValue(value: string) {
  typedValue.value = value ? formatDisplayDate(value) : ''
  manualError.value = ''
  inputElement.value?.setCustomValidity('')
}

function handleManualInput(event: Event) {
  typedValue.value = (event.target as HTMLInputElement).value
  const parsed = parseTypedDate(typedValue.value)
  manualError.value = parsed === null ? 'Wpisz poprawną datę w formacie DD.MM.RRRR lub RRRR-MM-DD.' : ''
  inputElement.value?.setCustomValidity(manualError.value)
  if (parsed !== null) emit('update:modelValue', parsed)
}

function finishManualInput() {
  isTyping.value = false
  const parsed = parseTypedDate(typedValue.value)
  if (parsed !== null) syncTypedValue(parsed)
}

watch(() => props.modelValue, value => {
  if (!isTyping.value) syncTypedValue(value)
})
</script>
