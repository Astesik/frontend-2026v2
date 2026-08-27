<template>
  <AppFormField v-bind="$attrs" :id="inputId" :label="label" :hint="hint" :error="error" :required="required" :compact="size === 'sm'">
    <template #default="{ describedBy }">
      <div class="relative">
        <input
          :id="inputId"
          ref="inputElement"
          v-model="query"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          :aria-expanded="isOpen"
          :aria-controls="listboxId"
          :aria-activedescendant="isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined"
          :aria-describedby="describedBy"
          :aria-invalid="Boolean(error)"
          :placeholder="placeholder"
          :disabled="disabled"
          class="ui-field-control pr-10"
          :class="[
            size === 'sm' ? 'ui-field-sm' : 'ui-field-md',
            error ? '!border-danger-500 focus:!ring-danger-100 dark:!border-danger-400' : '',
            isOpen ? '!border-ui-input-focus !bg-ui-input-hover ring-2 ring-ui-focus/60' : '',
          ]"
          @focus="openDropdown"
          @click="openDropdown"
          @input="handleInput"
          @keydown="handleKeydown"
        />
        <Search class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-icon" />
      </div>
    </template>
  </AppFormField>

  <AppDropdown :open="isOpen" :anchor="inputElement" :max-height="maxHeight" role="listbox" @close="closeDropdown">
    <div :id="listboxId" class="p-1" role="listbox" :aria-labelledby="inputId">
      <AppDropdownItem
        v-for="(option, index) in filteredOptions"
        :id="optionId(index)"
        :key="option.value"
        :selected="option.value === modelValue"
        :disabled="option.disabled"
        :class="activeIndex === index ? '!bg-ui-dropdown-hover !text-ui-text' : ''"
        @mouseenter="activeIndex = index"
        @mousedown.prevent
        @click="selectOption(option)"
      >
        <span class="min-w-0 flex-1">
          <span class="block truncate" :class="size === 'sm' ? 'text-xs' : 'text-sm'">{{ option.label }}</span>
          <span v-if="option.description" class="mt-0.5 block truncate ui-caption">{{ option.description }}</span>
        </span>
        <Check v-if="option.value === modelValue" class="h-4 w-4 shrink-0 text-ui-icon" />
      </AppDropdownItem>
      <div v-if="!filteredOptions.length" class="px-3 py-2 ui-body-sm text-ui-mutedText">{{ emptyText }}</div>
    </div>
  </AppDropdown>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })

import { computed, nextTick, ref, watch } from 'vue'
import { Check, Search } from 'lucide-vue-next'
import AppDropdown from './AppDropdown.vue'
import AppDropdownItem from './AppDropdownItem.vue'
import AppFormField from './AppFormField.vue'

export interface AppSearchSelectOption {
  label: string
  value: string
  description?: string
  disabled?: boolean
  searchText?: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  options: AppSearchSelectOption[]
  label?: string
  hint?: string
  error?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  size?: 'sm' | 'md'
  emptyText?: string
  showAllOnOpen?: boolean
  maxHeight?: number
}>(), {
  label: undefined,
  hint: undefined,
  error: undefined,
  placeholder: 'Szukaj',
  disabled: false,
  required: false,
  size: 'md',
  emptyText: 'Brak wyników',
  showAllOnOpen: true,
  maxHeight: 288,
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const inputElement = ref<HTMLInputElement | null>(null)
const isOpen = ref(false)
const activeIndex = ref(-1)
const query = ref('')
const inputId = `search-select-${Math.random().toString(16).slice(2)}`
const listboxId = `${inputId}-listbox`
const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue))
const filteredOptions = computed(() => {
  const normalizedQuery = query.value.trim().toLocaleLowerCase('pl')
  if (!normalizedQuery) return props.options
  return props.options.filter((option) => [option.label, option.description, option.searchText]
    .filter(Boolean)
    .some((value) => String(value).toLocaleLowerCase('pl').includes(normalizedQuery)))
})

function optionId(index: number) {
  return `${inputId}-option-${index}`
}

function firstEnabledIndex() {
  return filteredOptions.value.findIndex((option) => !option.disabled)
}

function syncSelectedLabel() {
  query.value = selectedOption.value?.label || ''
}

function openDropdown() {
  if (props.disabled) return
  if (!isOpen.value && props.showAllOnOpen) query.value = ''
  isOpen.value = true
  activeIndex.value = firstEnabledIndex()
}

function closeDropdown() {
  isOpen.value = false
  activeIndex.value = -1
  syncSelectedLabel()
}

function handleInput() {
  isOpen.value = true
  activeIndex.value = firstEnabledIndex()
}

function moveActive(direction: 1 | -1) {
  const options = filteredOptions.value
  if (!options.length) return
  let index = activeIndex.value
  for (let attempts = 0; attempts < options.length; attempts += 1) {
    index = (index + direction + options.length) % options.length
    if (!options[index].disabled) {
      activeIndex.value = index
      void nextTick(() => document.getElementById(optionId(index))?.scrollIntoView({ block: 'nearest' }))
      return
    }
  }
}

function selectOption(option: AppSearchSelectOption) {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  query.value = option.label
  isOpen.value = false
  activeIndex.value = -1
  inputElement.value?.focus()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!isOpen.value) openDropdown()
    else moveActive(event.key === 'ArrowDown' ? 1 : -1)
    return
  }
  if (event.key === 'Enter' && isOpen.value && activeIndex.value >= 0) {
    event.preventDefault()
    selectOption(filteredOptions.value[activeIndex.value])
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closeDropdown()
  } else if (event.key === 'Tab') closeDropdown()
  else if (event.key === 'Home' && isOpen.value) {
    event.preventDefault()
    activeIndex.value = firstEnabledIndex()
  } else if (event.key === 'End' && isOpen.value) {
    event.preventDefault()
    activeIndex.value = filteredOptions.value.length - 1
  }
}

watch(() => props.modelValue, syncSelectedLabel, { immediate: true })
watch(() => props.options, syncSelectedLabel)
</script>
