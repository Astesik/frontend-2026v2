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
          <CalendarDays class="h-4 w-4 shrink-0 text-ui-icon" />
          <span class="min-w-0 flex-1 truncate" :class="modelValue ? 'text-ui-text' : 'text-ui-mutedText'">{{ displayValue }}</span>
        </button>
        <AppIconButton
          v-if="modelValue && !disabled"
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
import { computed, ref } from 'vue'
import { CalendarDays, X } from 'lucide-vue-next'
import AppButton from './AppButton.vue'
import AppCalendarPanel from './AppCalendarPanel.vue'
import AppDropdown from './AppDropdown.vue'
import AppFormField from './AppFormField.vue'
import AppIconButton from './AppIconButton.vue'
import { formatDisplayDate, toDateValue } from '@/utils/date'

const props = withDefaults(defineProps<{
  modelValue: string
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  size?: 'sm' | 'md'
}>(), {
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
const isOpen = ref(false)
const inputId = `date-picker-${Math.random().toString(16).slice(2)}`
const displayValue = computed(() => props.modelValue ? formatDisplayDate(props.modelValue) : props.placeholder)

function toggleOpen() {
  if (!props.disabled) isOpen.value = !isOpen.value
}

function selectDate(value: string) {
  emit('update:modelValue', value)
  isOpen.value = false
}

function clearDate() {
  emit('update:modelValue', '')
  isOpen.value = false
}
</script>
