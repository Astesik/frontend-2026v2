<template>
  <AppFormField v-bind="$attrs" :id="selectId" :label="label" :hint="hint" :error="error" :required="required" :compact="size === 'sm'">
    <template #default="{ describedBy }">
      <button
        :id="selectId"
        ref="buttonElement"
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        :aria-expanded="isOpen"
        :aria-controls="listboxId"
        :aria-activedescendant="isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined"
        :aria-describedby="describedBy"
        :aria-invalid="Boolean(error)"
        :disabled="disabled"
        class="ui-field-control flex items-center justify-between gap-3 text-left"
        :class="[
          size === 'sm' ? 'ui-field-sm' : 'ui-field-md',
          error ? '!border-danger-500 focus:!ring-danger-100 dark:!border-danger-400' : '',
          isOpen ? '!border-ui-input-focus !bg-ui-input-hover ring-2 ring-ui-focus/60' : '',
        ]"
        @click="toggleOpen"
        @keydown="handleTriggerKeydown"
      >
        <span class="min-w-0 flex-1 truncate" :class="selectedOption ? 'text-ui-text' : 'text-ui-mutedText'">
          {{ selectedOption?.label || placeholder }}
        </span>
        <ChevronDown class="h-4 w-4 shrink-0 text-ui-icon transition" :class="isOpen ? 'rotate-180' : ''" />
      </button>
    </template>
  </AppFormField>

  <AppDropdown :open="isOpen" :anchor="buttonElement" :max-height="maxHeight" role="listbox" @close="closeDropdown">
    <div :id="listboxId" class="p-1" role="listbox" :aria-labelledby="selectId">
      <AppDropdownItem
        v-for="(option, index) in options"
        :id="optionId(index)"
        :key="String(option.value)"
        :selected="option.value === modelValue"
        :disabled="option.disabled"
        :class="activeIndex === index ? '!bg-ui-dropdown-hover !text-ui-text' : ''"
        @mouseenter="activeIndex = index"
        @click="selectOption(option)"
      >
        <span class="min-w-0 flex-1 truncate" :class="size === 'sm' ? 'text-xs' : 'text-sm'">{{ option.label }}</span>
        <Check v-if="option.value === modelValue" class="h-4 w-4 shrink-0 text-ui-icon" />
      </AppDropdownItem>
      <p v-if="!options.length" class="px-3 py-2 ui-body-sm text-ui-mutedText">{{ emptyText }}</p>
    </div>
  </AppDropdown>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

import { computed, nextTick, ref, watch } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'
import AppDropdown from './AppDropdown.vue'
import AppDropdownItem from './AppDropdownItem.vue'
import AppFormField from './AppFormField.vue'

export interface AppSelectOption {
  label: string
  value: string
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue: string
  options: AppSelectOption[]
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  required?: boolean
  size?: 'sm' | 'md'
  maxHeight?: number
}>(), {
  label: undefined,
  hint: undefined,
  error: undefined,
  placeholder: 'Wybierz',
  emptyText: 'Brak opcji',
  disabled: false,
  required: false,
  size: 'md',
  maxHeight: 288,
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const buttonElement = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const activeIndex = ref(-1)
const selectId = `select-${Math.random().toString(16).slice(2)}`
const listboxId = `${selectId}-listbox`
const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue))

function optionId(index: number) {
  return `${selectId}-option-${index}`
}

function firstEnabledIndex() {
  return props.options.findIndex((option) => !option.disabled)
}

function lastEnabledIndex() {
  for (let index = props.options.length - 1; index >= 0; index -= 1) {
    if (!props.options[index].disabled) return index
  }
  return -1
}

function selectedIndex() {
  const index = props.options.findIndex((option) => option.value === props.modelValue && !option.disabled)
  return index >= 0 ? index : firstEnabledIndex()
}

function openDropdown(direction: 1 | -1 = 1) {
  if (props.disabled) return
  isOpen.value = true
  activeIndex.value = selectedIndex()
  if (direction < 0 && !selectedOption.value) activeIndex.value = lastEnabledIndex()
  void nextTick(scrollActiveIntoView)
}

function closeDropdown() {
  isOpen.value = false
  activeIndex.value = -1
}

function toggleOpen() {
  if (isOpen.value) closeDropdown()
  else openDropdown()
}

function moveActive(direction: 1 | -1) {
  if (!props.options.length) return
  let index = activeIndex.value
  for (let attempts = 0; attempts < props.options.length; attempts += 1) {
    index = (index + direction + props.options.length) % props.options.length
    if (!props.options[index].disabled) {
      activeIndex.value = index
      void nextTick(scrollActiveIntoView)
      return
    }
  }
}

function scrollActiveIntoView() {
  document.getElementById(optionId(activeIndex.value))?.scrollIntoView({ block: 'nearest' })
}

function selectOption(option: AppSelectOption) {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  closeDropdown()
  buttonElement.value?.focus()
}

function handleTriggerKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!isOpen.value) openDropdown(event.key === 'ArrowDown' ? 1 : -1)
    else moveActive(event.key === 'ArrowDown' ? 1 : -1)
    return
  }
  if (event.key === 'Home' && isOpen.value) {
    event.preventDefault()
    activeIndex.value = firstEnabledIndex()
    void nextTick(scrollActiveIntoView)
    return
  }
  if (event.key === 'End' && isOpen.value) {
    event.preventDefault()
    activeIndex.value = lastEnabledIndex()
    void nextTick(scrollActiveIntoView)
    return
  }
  if ((event.key === 'Enter' || event.key === ' ') && isOpen.value && activeIndex.value >= 0) {
    event.preventDefault()
    selectOption(props.options[activeIndex.value])
    return
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    openDropdown()
  } else if (event.key === 'Escape') closeDropdown()
  else if (event.key === 'Tab') closeDropdown()
}

watch(() => props.options, () => {
  if (isOpen.value) activeIndex.value = selectedIndex()
})
</script>
