<template>
  <div ref="rootElement" class="relative">
    <label v-if="label" :for="selectId" class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
      {{ label }}
    </label>

    <button
      :id="selectId"
      type="button"
      :disabled="disabled"
      class="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white text-left text-slate-950 shadow-sm outline-none transition hover:bg-slate-50 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-app-border dark:bg-app-panel dark:text-slate-50 dark:hover:bg-app-elevated dark:focus:border-app-muted dark:focus:ring-app-elevated"
      :class="size === 'sm' ? 'h-9 px-3 text-xs' : 'h-11 px-4 text-sm'"
      @click="toggleOpen"
      @keydown.escape.prevent="isOpen = false"
    >
      <span class="truncate" :class="selectedOption ? '' : 'text-slate-400 dark:text-app-muted'">
        {{ selectedOption?.label || placeholder }}
      </span>
      <ChevronDown class="h-4 w-4 shrink-0 text-slate-400 transition" :class="isOpen ? 'rotate-180' : ''" />
    </button>

    <div
      v-if="isOpen"
      class="absolute z-30 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-app-border dark:bg-app-panel"
      :class="openUpwards ? 'bottom-full mb-2' : 'top-full mt-2'"
    >
      <button
        v-for="option in options"
        :key="String(option.value)"
        type="button"
        :disabled="option.disabled"
        class="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50"
        :class="[size === 'sm' ? 'text-xs' : 'text-sm', option.value === modelValue ? 'bg-slate-100 text-slate-950 dark:bg-app-elevated dark:text-slate-50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-app-elevated dark:hover:text-slate-50']"
        @click="selectOption(option)"
      >
        <span class="truncate">{{ option.label }}</span>
        <Check v-if="option.value === modelValue" class="h-4 w-4 shrink-0" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, ChevronDown } from 'lucide-vue-next'

export interface AppSelectOption {
  label: string
  value: string
  disabled?: boolean
}

const props = withDefaults(defineProps<{
  modelValue: string
  options: AppSelectOption[]
  label?: string
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}>(), {
  label: undefined,
  placeholder: 'Wybierz',
  disabled: false,
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const rootElement = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const openUpwards = ref(false)
const selectId = `select-${Math.random().toString(16).slice(2)}`

const selectedOption = computed(() => props.options.find((option) => option.value === props.modelValue))

function toggleOpen() {
  if (props.disabled) return

  if (!isOpen.value) updateDropdownDirection()
  isOpen.value = !isOpen.value
}

function updateDropdownDirection() {
  if (!rootElement.value) return

  const rect = rootElement.value.getBoundingClientRect()
  const optionHeight = props.size === 'sm' ? 36 : 40
  const dropdownHeight = Math.min(props.options.length * optionHeight + 8, 288)
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top

  openUpwards.value = spaceBelow < dropdownHeight + 8 && spaceAbove > spaceBelow
}

function selectOption(option: AppSelectOption) {
  if (option.disabled) {
    return
  }

  emit('update:modelValue', option.value)
  isOpen.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (!rootElement.value?.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('scroll', updateDropdownDirection, true)
  window.addEventListener('resize', updateDropdownDirection)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('scroll', updateDropdownDirection, true)
  window.removeEventListener('resize', updateDropdownDirection)
})
</script>
