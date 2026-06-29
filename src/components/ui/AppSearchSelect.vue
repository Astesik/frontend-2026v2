<template>
  <div ref="rootElement" class="relative">
    <label v-if="label" :for="inputId" class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
      {{ label }}
    </label>

    <div class="relative">
      <input
        :id="inputId"
        v-model="query"
        :placeholder="placeholder"
        :disabled="disabled"
        class="w-full rounded-2xl border border-slate-200 bg-white pr-9 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-app-border dark:bg-app-panel dark:text-slate-50 dark:placeholder:text-app-muted dark:focus:border-app-muted dark:focus:ring-app-elevated"
        :class="size === 'sm' ? 'h-9 px-3 text-xs' : 'h-11 px-4 text-sm'"
        @focus="isOpen = true"
        @input="isOpen = true"
        @keydown.escape.prevent="closeDropdown"
      />
      <Search class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>

    <div
      v-if="isOpen"
      class="absolute z-40 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-app-border dark:bg-app-panel"
    >
      <button
        v-for="option in filteredOptions"
        :key="option.value"
        type="button"
        :disabled="option.disabled"
        class="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50"
        :class="[size === 'sm' ? 'text-xs' : 'text-sm', option.value === modelValue ? 'bg-slate-100 text-slate-950 dark:bg-app-elevated dark:text-slate-50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-app-elevated dark:hover:text-slate-50']"
        @click="selectOption(option)"
      >
        <span class="min-w-0">
          <span class="block truncate">{{ option.label }}</span>
          <span v-if="option.description" class="mt-0.5 block truncate text-[11px] text-slate-400 dark:text-app-muted">
            {{ option.description }}
          </span>
        </span>
        <Check v-if="option.value === modelValue" class="h-4 w-4 shrink-0" />
      </button>

      <div v-if="!filteredOptions.length" class="px-3 py-2 text-xs text-slate-500 dark:text-app-muted">
        {{ emptyText }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check, Search } from 'lucide-vue-next'

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
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  emptyText?: string
}>(), {
  label: undefined,
  placeholder: 'Szukaj',
  disabled: false,
  size: 'md',
  emptyText: 'Brak wyników',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const rootElement = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const query = ref('')
const inputId = `search-select-${Math.random().toString(16).slice(2)}`

const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue))

const filteredOptions = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()

  return props.options.filter((option) => {
    if (!normalizedQuery) {
      return true
    }

    return [
      option.label,
      option.description,
      option.searchText,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedQuery))
  })
})

function closeDropdown() {
  isOpen.value = false
  query.value = selectedOption.value?.label || ''
}

function selectOption(option: AppSearchSelectOption) {
  if (option.disabled) {
    return
  }

  emit('update:modelValue', option.value)
  query.value = option.label
  isOpen.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (!rootElement.value?.contains(event.target as Node)) {
    closeDropdown()
  }
}

watch(() => props.modelValue, () => {
  query.value = selectedOption.value?.label || ''
}, { immediate: true })

watch(() => props.options, () => {
  query.value = selectedOption.value?.label || ''
})

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>
