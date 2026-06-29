<template>
  <div ref="rootElement" class="relative">
    <label v-if="label" :for="inputId" class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
      {{ label }}
    </label>

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
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        class="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-app-border dark:bg-app-panel dark:text-slate-50 dark:placeholder:text-app-muted dark:focus:border-app-muted dark:focus:ring-app-elevated"
        :class="countryCode ? 'pl-10' : ''"
        @focus="isOpen = true"
        @input="onInput"
        @keydown.escape.prevent="isOpen = false"
      />
      <LoaderCircle v-if="isLoading" class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
      <Search v-else class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>

    <div
      v-if="isOpen && (suggestions.length || emptyMessage)"
      class="absolute z-40 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-app-border dark:bg-app-panel"
    >
      <button
        v-for="item in suggestions"
        :key="item.id"
        type="button"
        class="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-app-elevated"
        @click="selectSuggestion(item)"
      >
        <img
          v-if="item.countryCode"
          class="mt-0.5 h-5 w-5 shrink-0 rounded-full"
          :src="`https://flagsapi.com/${item.countryCode}/flat/64.png`"
          alt=""
          loading="lazy"
          referrerpolicy="no-referrer"
        />
        <span v-else class="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-slate-100 dark:bg-app-elevated"></span>
        <span class="min-w-0">
          <span class="block truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{{ item.title }}</span>
          <span class="mt-1 block truncate text-xs text-slate-500 dark:text-app-muted">{{ item.addressLabel }}</span>
        </span>
      </button>

      <div v-if="emptyMessage && !suggestions.length" class="px-3 py-2 text-xs text-slate-500 dark:text-app-muted">
        {{ emptyMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { LoaderCircle, Search } from 'lucide-vue-next'
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
  placeholder: 'Wpisz lokalizacje',
  disabled: false,
  at: null,
  countryCode: null,
  debugLogger: null,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [item: HereAutosuggestItem]
}>()

const rootElement = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const isLoading = ref(false)
const suggestions = ref<HereAutosuggestItem[]>([])
const queryTouched = ref(false)
const inputId = `here-location-${Math.random().toString(16).slice(2)}`
let debounceTimer: number | null = null
let requestId = 0

const emptyMessage = computed(() => {
  if (!props.apiKey) {
    return 'Brak klucza HERE'
  }

  if (queryTouched.value && props.modelValue.trim().length >= 3 && !isLoading.value) {
    return 'Brak podpowiedzi'
  }

  return ''
})

function onInput(event: Event) {
  queryTouched.value = true
  emit('update:modelValue', (event.target as HTMLInputElement).value)
  isOpen.value = true
}

function selectSuggestion(item: HereAutosuggestItem) {
  emit('update:modelValue', item.addressLabel || item.title)
  emit('select', item)
  isOpen.value = false
  suggestions.value = []
  queryTouched.value = false
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
    }
  } catch {
    if (currentRequestId === requestId) {
      suggestions.value = []
    }
  } finally {
    if (currentRequestId === requestId) {
      isLoading.value = false
    }
  }
}

function scheduleSuggestions(query: string) {
  if (debounceTimer !== null) {
    window.clearTimeout(debounceTimer)
  }

  debounceTimer = window.setTimeout(() => {
    void loadSuggestions(query)
  }, 260)
}

function onDocumentClick(event: MouseEvent) {
  if (!rootElement.value?.contains(event.target as Node)) {
    isOpen.value = false
  }
}

watch(() => props.modelValue, (value) => {
  if (!isOpen.value && !queryTouched.value) {
    return
  }

  scheduleSuggestions(value)
})

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)

  if (debounceTimer !== null) {
    window.clearTimeout(debounceTimer)
  }
})
</script>
