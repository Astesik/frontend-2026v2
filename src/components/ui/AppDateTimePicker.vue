<template>
  <AppFormField :id="inputId" :label="label" :hint="hint" :error="error" :required="required" :compact="size === 'sm'">
    <template #default="{ describedBy }">
      <div class="relative">
        <button
          :id="inputId"
          ref="buttonElement"
          type="button"
          :disabled="disabled"
          class="ui-field-control flex items-center gap-2 text-left"
          :class="[
            size === 'sm' ? 'ui-field-sm' : 'ui-field-md',
            modelValue && !disabled ? 'pr-10' : '',
            isOpen ? '!border-ui-input-focus !bg-ui-input-hover ring-2 ring-ui-focus/60' : '',
            error ? '!border-danger-500' : '',
          ]"
          :aria-expanded="isOpen"
          aria-haspopup="dialog"
          :aria-describedby="describedBy"
          @click="toggleOpen"
          @keydown.escape.prevent="isOpen = false"
          @keydown.enter.prevent="isOpen = !isOpen"
        >
          <CalendarClock class="h-4 w-4 shrink-0 text-ui-icon" />
          <span class="min-w-0 flex-1 truncate" :class="modelValue ? 'text-ui-text' : 'text-ui-mutedText'">{{ displayValue }}</span>
        </button>
        <AppIconButton v-if="modelValue && !disabled" label="Wyczyść datę i godzinę" size="sm" variant="ghost" class="absolute right-1 top-1/2 -translate-y-1/2" @click="clearValue">
          <X class="h-3.5 w-3.5" />
        </AppIconButton>
      </div>
    </template>
  </AppFormField>

  <AppDropdown :open="isOpen" :anchor="buttonElement" role="dialog" :match-width="false" :max-height="480" content-class="p-3" @close="closeDropdown">
    <AppCalendarPanel :model-value="selectedDate" @select="selectDate" />

    <div class="mt-3 grid grid-cols-[1fr_auto_1fr] items-end gap-2 border-t border-ui-divider pt-3">
      <AppSelect v-model="selectedHour" label="Godzina" :options="hourOptions" size="sm" />
      <span class="pb-2 text-sm font-semibold text-ui-mutedText">:</span>
      <AppSelect v-model="selectedMinute" label="Minuta" :options="minuteOptions" size="sm" />
    </div>

    <div class="mt-3 flex items-center justify-between border-t border-ui-divider pt-3">
      <AppButton size="sm" variant="ghost" @click="selectNow">Teraz</AppButton>
      <div class="flex items-center gap-1">
        <AppButton size="sm" variant="ghost" @click="clearValue">Wyczyść</AppButton>
        <AppButton size="sm" @click="closeWithCurrentValue">Gotowe</AppButton>
      </div>
    </div>
  </AppDropdown>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CalendarClock, X } from 'lucide-vue-next'
import AppButton from './AppButton.vue'
import AppCalendarPanel from './AppCalendarPanel.vue'
import AppDropdown from './AppDropdown.vue'
import AppFormField from './AppFormField.vue'
import AppIconButton from './AppIconButton.vue'
import AppSelect, { type AppSelectOption } from './AppSelect.vue'
import { toDateValue } from '@/utils/date'

const props = withDefaults(defineProps<{
  modelValue: string
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  size?: 'sm' | 'md'
  defaultTime?: string
}>(), {
  label: undefined,
  hint: undefined,
  error: undefined,
  placeholder: 'Wybierz datę i godzinę',
  disabled: false,
  required: false,
  size: 'md',
  defaultTime: '08:00',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const buttonElement = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const selectedDate = ref(dateValueFromModel(props.modelValue))
const selectedHour = ref(timePartsFromValue(props.modelValue, props.defaultTime).hour)
const selectedMinute = ref(timePartsFromValue(props.modelValue, props.defaultTime).minute)
const inputId = `date-time-picker-${Math.random().toString(16).slice(2)}`
const hourOptions: AppSelectOption[] = Array.from({ length: 24 }, (_, index) => ({ value: String(index).padStart(2, '0'), label: String(index).padStart(2, '0') }))
const minuteOptions: AppSelectOption[] = Array.from({ length: 60 }, (_, index) => ({ value: String(index).padStart(2, '0'), label: String(index).padStart(2, '0') }))
const displayValue = computed(() => props.modelValue ? formatDisplayValue(props.modelValue) : props.placeholder)

interface TimeParts {
  hour: string
  minute: string
}

function fallbackTimeParts(fallback: string): TimeParts {
  const match = fallback.match(/^(\d{2}):(\d{2})$/)
  return { hour: match?.[1] || '08', minute: match?.[2] || '00' }
}

function parseDateTimeValue(value: string): Date | null {
  if (!value) return null
  const localMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|\s)(\d{2}):(\d{2})/)
  if (localMatch) return new Date(Number(localMatch[1]), Number(localMatch[2]) - 1, Number(localMatch[3]), Number(localMatch[4]), Number(localMatch[5]))
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnlyMatch) {
    const parts = fallbackTimeParts(props.defaultTime)
    return new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]), Number(parts.hour), Number(parts.minute))
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateValueFromModel(value: string): string {
  const date = parseDateTimeValue(value)
  return date ? toDateValue(date) : ''
}

function timePartsFromValue(value: string, fallback: string): TimeParts {
  const date = parseDateTimeValue(value)
  if (date) return { hour: String(date.getHours()).padStart(2, '0'), minute: String(date.getMinutes()).padStart(2, '0') }
  return fallbackTimeParts(fallback)
}

function formatDisplayValue(value: string) {
  const date = parseDateTimeValue(value)
  return date ? date.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : value
}

function currentValue() {
  return selectedDate.value ? `${selectedDate.value}T${selectedHour.value}:${selectedMinute.value}` : ''
}

function emitCurrentValue() {
  const value = currentValue()
  if (value) emit('update:modelValue', value)
}

function toggleOpen() {
  if (!props.disabled) isOpen.value = !isOpen.value
}

function closeDropdown() {
  isOpen.value = false
  syncFromModel(props.modelValue)
}

function selectDate(value: string) {
  selectedDate.value = value
  emitCurrentValue()
}

function selectNow() {
  const now = new Date()
  selectedDate.value = toDateValue(now)
  selectedHour.value = String(now.getHours()).padStart(2, '0')
  selectedMinute.value = String(now.getMinutes()).padStart(2, '0')
  emitCurrentValue()
}

function closeWithCurrentValue() {
  emitCurrentValue()
  isOpen.value = false
}

function clearValue() {
  selectedDate.value = ''
  emit('update:modelValue', '')
  isOpen.value = false
}

function syncFromModel(value: string) {
  selectedDate.value = dateValueFromModel(value)
  const parts = timePartsFromValue(value, props.defaultTime)
  selectedHour.value = parts.hour
  selectedMinute.value = parts.minute
}

watch(() => props.modelValue, syncFromModel)
watch([selectedHour, selectedMinute], () => {
  if (isOpen.value && selectedDate.value) emitCurrentValue()
})
</script>
