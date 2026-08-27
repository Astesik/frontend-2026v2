<template>
  <AppFormField v-bind="$attrs" :id="selectId" :label="label" :hint="hint" :error="error" :compact="size === 'sm'">
    <template #default="{ describedBy }">
      <button
        :id="selectId"
        ref="buttonElement"
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        :aria-expanded="isOpen"
        :aria-controls="listboxId"
        :aria-describedby="describedBy"
        :disabled="disabled"
        class="ui-field-control flex items-center justify-between gap-3 text-left"
        :class="[size === 'sm' ? 'ui-field-sm' : 'ui-field-md', isOpen ? '!border-ui-input-focus ring-2 ring-ui-focus/60' : '']"
        @click="isOpen = !isOpen"
        @keydown.escape.prevent="isOpen = false"
        @keydown.enter.prevent="isOpen = !isOpen"
        @keydown.space.prevent="isOpen = !isOpen"
      >
        <span class="min-w-0 flex-1 truncate" :class="modelValue.length ? 'text-ui-text' : 'text-ui-mutedText'">{{ displayValue }}</span>
        <ChevronDown class="h-4 w-4 shrink-0 text-ui-icon transition" :class="isOpen ? 'rotate-180' : ''" />
      </button>
    </template>
  </AppFormField>

  <AppDropdown :open="isOpen" :anchor="buttonElement" role="listbox" @close="isOpen = false">
    <div :id="listboxId" class="p-1" role="listbox" aria-multiselectable="true">
      <AppDropdownItem v-if="showSelectAll && enabledOptions.length" :selected="allOptionsSelected" @click="toggleAllOptions">
        <span
          class="flex h-4 w-4 shrink-0 items-center justify-center rounded border"
          :class="allOptionsSelected || someOptionsSelected ? 'border-ui-text bg-ui-text text-ui-surface' : 'border-ui-input-border bg-ui-input text-transparent'"
        >
          <Check v-if="allOptionsSelected" class="h-3 w-3" />
          <Minus v-else-if="someOptionsSelected" class="h-3 w-3" />
        </span>
        <span class="min-w-0 flex-1 truncate font-medium">{{ selectAllLabel }}</span>
      </AppDropdownItem>
      <div v-if="showSelectAll && enabledOptions.length" class="mx-2 my-1 h-px bg-ui-divider"></div>
      <AppDropdownItem
        v-for="option in options"
        :key="option.value"
        :selected="modelValue.includes(option.value)"
        :disabled="option.disabled"
        @click="toggleOption(option)"
      >
        <span class="flex h-4 w-4 shrink-0 items-center justify-center rounded border" :class="modelValue.includes(option.value) ? 'border-ui-text bg-ui-text text-ui-surface' : 'border-ui-input-border bg-ui-input text-transparent'">
          <Check class="h-3 w-3" />
        </span>
        <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
      </AppDropdownItem>
    </div>
  </AppDropdown>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

import { computed, ref } from 'vue'
import { Check, ChevronDown, Minus } from 'lucide-vue-next'
import AppDropdown from './AppDropdown.vue'
import AppDropdownItem from './AppDropdownItem.vue'
import AppFormField from './AppFormField.vue'
import type { AppSelectOption } from './AppSelect.vue'

const props = withDefaults(defineProps<{
  modelValue: string[]
  options: AppSelectOption[]
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  allSelectedLabel?: string
  showSelectAll?: boolean
  selectAllLabel?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}>(), {
  label: undefined,
  hint: undefined,
  error: undefined,
  placeholder: 'Wybierz',
  allSelectedLabel: undefined,
  showSelectAll: true,
  selectAllLabel: 'Zaznacz wszystko',
  disabled: false,
  size: 'md',
})

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()
const isOpen = ref(false)
const buttonElement = ref<HTMLElement | null>(null)
const selectId = `multi-select-${Math.random().toString(16).slice(2)}`
const listboxId = `${selectId}-listbox`
const displayValue = computed(() => {
  const labels = props.options.filter((option) => props.modelValue.includes(option.value)).map((option) => option.label)
  if (props.allSelectedLabel && props.options.length && labels.length === props.options.length) {
    return props.allSelectedLabel
  }
  return labels.length ? labels.join(', ') : props.placeholder
})
const enabledOptions = computed(() => props.options.filter((option) => !option.disabled))
const allOptionsSelected = computed(() => (
  enabledOptions.value.length > 0
  && enabledOptions.value.every((option) => props.modelValue.includes(option.value))
))
const someOptionsSelected = computed(() => (
  !allOptionsSelected.value
  && enabledOptions.value.some((option) => props.modelValue.includes(option.value))
))

function toggleOption(option: AppSelectOption) {
  if (option.disabled) return
  emit('update:modelValue', props.modelValue.includes(option.value)
    ? props.modelValue.filter((value) => value !== option.value)
    : [...props.modelValue, option.value])
}

function toggleAllOptions() {
  const enabledValues = new Set(enabledOptions.value.map((option) => option.value))

  if (allOptionsSelected.value) {
    emit('update:modelValue', props.modelValue.filter((value) => !enabledValues.has(value)))
    return
  }

  emit('update:modelValue', Array.from(new Set([
    ...props.modelValue,
    ...enabledValues,
  ])))
}
</script>
