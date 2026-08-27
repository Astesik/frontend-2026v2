<template>
  <AppFormField :id="inputId" :label="label">
    <template #default="{ describedBy }">
      <div class="relative">
        <img
          v-if="countryCode"
          class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full"
          :src="`https://flagsapi.com/${countryCode}/flat/64.png`"
          alt=""
          loading="lazy"
          referrerpolicy="no-referrer"
        />
        <input
          :id="inputId"
          ref="inputElement"
          :value="modelValue"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          :aria-expanded="dropdownOpen"
          :aria-controls="listboxId"
          :aria-activedescendant="dropdownOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined"
          :aria-describedby="describedBy"
          :placeholder="placeholder"
          :disabled="disabled"
          class="ui-field-control ui-field-md pr-10"
          :class="countryCode ? '!pl-10' : ''"
          @focus="openDropdown"
          @input="onInput"
          @keydown="handleKeydown"
        />
        <LoaderCircle v-if="isLoading" class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ui-icon" />
        <Search v-else class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-icon" />
      </div>
    </template>
  </AppFormField>

  <AppDropdown :open="dropdownOpen" :anchor="inputElement" :max-height="288" role="listbox" @close="closeDropdown">
    <div :id="listboxId" class="p-1" role="listbox" :aria-labelledby="inputId">
      <AppDropdownItem
        v-for="(item, index) in suggestions"
        :id="optionId(index)"
        :key="item.id"
        :class="activeIndex === index ? '!bg-ui-dropdown-hover !text-ui-text' : ''"
        @mouseenter="activeIndex = index"
        @mousedown.prevent
        @click="selectSuggestion(item)"
      >
        <img
          v-if="item.countryCode"
          class="h-5 w-5 shrink-0 rounded-full"
          :src="`https://flagsapi.com/${item.countryCode}/flat/64.png`"
          alt=""
          loading="lazy"
          referrerpolicy="no-referrer"
        />
        <span v-else class="h-5 w-5 shrink-0 rounded-full bg-ui-muted"></span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium text-ui-text">{{ item.title }}</span>
          <span class="mt-0.5 block truncate ui-caption">{{ item.addressLabel }}</span>
        </span>
      </AppDropdownItem>

      <div v-if="emptyMessage && !suggestions.length" class="px-3 py-2 ui-body-sm text-ui-mutedText">
        {{ emptyMessage }}
      </div>
    </div>
  </AppDropdown>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { LoaderCircle, Search } from 'lucide-vue-next'
import AppDropdown from '@/components/ui/AppDropdown.vue'
import AppDropdownItem from '@/components/ui/AppDropdownItem.vue'
import AppFormField from '@/components/ui/AppFormField.vue'
import {
  autosuggestHereLocations,
  type HereAutosuggestItem,
  type HereCoordinate,
  type HereDebugLogger,
} from '@/services/hereRouteService'

const props = withDefaults(defineProps<{
  modelValue: string
  apiKey?: string
  label?: string
  placeholder?: string
  disabled?: boolean
  at?: HereCoordinate | null
  countryCode?: string | null
  debugLogger?: HereDebugLogger | null
}>(), {
  apiKey: undefined,
  label: undefined,
  placeholder: 'Wpisz lokalizację',
  disabled: false,
  at: null,
  countryCode: null,
  debugLogger: null,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [item: HereAutosuggestItem]
}>()

const inputElement = ref<HTMLInputElement | null>(null)
const isOpen = ref(false)
const isLoading = ref(false)
const suggestions = ref<HereAutosuggestItem[]>([])
const queryTouched = ref(false)
const activeIndex = ref(-1)
const inputId = `here-location-${Math.random().toString(16).slice(2)}`
const listboxId = `${inputId}-listbox`
let debounceTimer: number | null = null
let requestId = 0

const emptyMessage = computed(() => {
  if (!props.apiKey) return 'Brak klucza HERE'
  if (queryTouched.value && props.modelValue.trim().length >= 3 && !isLoading.value) return 'Brak podpowiedzi'
  return ''
})
const dropdownOpen = computed(() => isOpen.value && Boolean(suggestions.value.length || emptyMessage.value))

function optionId(index: number) {
  return `${inputId}-option-${index}`
}

function openDropdown() {
  if (!props.disabled) isOpen.value = true
}

function closeDropdown() {
  isOpen.value = false
  activeIndex.value = -1
}

function onInput(event: Event) {
  queryTouched.value = true
  emit('update:modelValue', (event.target as HTMLInputElement).value)
  isOpen.value = true
  activeIndex.value = 0
}

function selectSuggestion(item: HereAutosuggestItem) {
  emit('update:modelValue', item.addressLabel || item.title)
  emit('select', item)
  closeDropdown()
  suggestions.value = []
  queryTouched.value = false
  inputElement.value?.focus()
}

function moveActive(direction: 1 | -1) {
  if (!suggestions.value.length) return
  activeIndex.value = (activeIndex.value + direction + suggestions.value.length) % suggestions.value.length
  void nextTick(() => document.getElementById(optionId(activeIndex.value))?.scrollIntoView({ block: 'nearest' }))
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!isOpen.value) openDropdown()
    else moveActive(event.key === 'ArrowDown' ? 1 : -1)
  } else if (event.key === 'Enter' && dropdownOpen.value && activeIndex.value >= 0) {
    event.preventDefault()
    selectSuggestion(suggestions.value[activeIndex.value])
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closeDropdown()
  } else if (event.key === 'Tab') {
    closeDropdown()
  }
}

async function loadSuggestions(query: string) {
  if (!props.apiKey || query.trim().length < 3) {
    suggestions.value = []
    return
  }

  const currentRequestId = ++requestId
  isLoading.value = true
  try {
    const items = await autosuggestHereLocations(query, props.apiKey, {
      at: props.at || undefined,
      onDebug: props.debugLogger || undefined,
    })
    if (currentRequestId === requestId) {
      suggestions.value = items
      activeIndex.value = items.length ? 0 : -1
    }
  } catch {
    if (currentRequestId === requestId) suggestions.value = []
  } finally {
    if (currentRequestId === requestId) isLoading.value = false
  }
}

function scheduleSuggestions(query: string) {
  if (debounceTimer !== null) window.clearTimeout(debounceTimer)
  debounceTimer = window.setTimeout(() => void loadSuggestions(query), 260)
}

watch(() => props.modelValue, (value) => {
  if (isOpen.value || queryTouched.value) scheduleSuggestions(value)
})

onBeforeUnmount(() => {
  if (debounceTimer !== null) window.clearTimeout(debounceTimer)
})
</script>
