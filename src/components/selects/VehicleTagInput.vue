<template>
  <AppFormField :id="inputId" :label="label" :compact="compact">
    <template #default="{ describedBy }">
      <div class="relative" :class="floating ? 'min-h-9' : ''">
        <div ref="fieldElement" :class="tagFieldClasses" @click="focusInput">
          <span
            v-for="vehicle in selectedVehicles"
            :key="vehicle.id"
            class="inline-flex max-w-full items-center gap-1 rounded-[var(--rw-radius-item)] border border-ui-border bg-ui-muted px-2 py-1 text-xs font-medium text-ui-text-secondary"
          >
            <span class="truncate">{{ vehicle.licensePlate }}</span>
            <button
              v-if="!disabled"
              type="button"
              class="inline-flex h-4 w-4 items-center justify-center rounded-full text-ui-icon transition hover:bg-ui-hover hover:text-ui-text"
              :aria-label="`Usuń ${vehicle.licensePlate}`"
              @click.stop="removeVehicle(vehicle.id)"
            >
              <X class="h-3 w-3" />
            </button>
          </span>

          <input
            :id="inputId"
            ref="inputElement"
            v-model="query"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            :aria-expanded="isOpen"
            :aria-controls="listboxId"
            :aria-activedescendant="isOpen && activeIndex >= 0 ? optionId(activeIndex) : undefined"
            :aria-describedby="describedBy"
            class="min-w-[7rem] flex-1 bg-transparent text-ui-text outline-none placeholder:text-ui-mutedText"
            :class="compact ? 'text-xs' : 'text-sm'"
            :disabled="disabled"
            :placeholder="selectedVehicles.length ? 'Dodaj pojazd' : placeholder"
            @focus="openMenu"
            @input="handleInput"
            @keydown="handleKeydown"
          />
        </div>
      </div>
    </template>
  </AppFormField>

  <AppDropdown
    :open="isOpen"
    :anchor="fieldElement"
    :max-height="288"
    role="listbox"
    @close="closeMenu"
  >
    <div :id="listboxId" class="p-1" role="listbox" :aria-labelledby="inputId">
      <AppDropdownItem
        v-for="(vehicle, index) in filteredVehicles"
        :id="optionId(index)"
        :key="vehicle.id"
        :class="activeIndex === index ? '!bg-ui-dropdown-hover !text-ui-text' : ''"
        @mouseenter="activeIndex = index"
        @mousedown.prevent
        @click="selectVehicle(vehicle.id)"
      >
        <span class="min-w-0 flex-1 truncate font-medium">{{ vehicle.licensePlate }}</span>
        <Plus class="h-4 w-4 shrink-0 text-ui-icon" />
      </AppDropdownItem>

      <div v-if="!filteredVehicles.length" class="px-3 py-2 ui-body-sm text-ui-mutedText">
        Brak pojazdów do dodania.
      </div>
    </div>
  </AppDropdown>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Plus, X } from 'lucide-vue-next'
import AppDropdown from '@/components/ui/AppDropdown.vue'
import AppDropdownItem from '@/components/ui/AppDropdownItem.vue'
import AppFormField from '@/components/ui/AppFormField.vue'
import type { ApiVehicle } from '@/types/fleet'

const props = withDefaults(defineProps<{
  modelValue: string[]
  vehicles: ApiVehicle[]
  label?: string
  placeholder?: string
  floating?: boolean
  compact?: boolean
  disabled?: boolean
}>(), {
  label: undefined,
  placeholder: 'Wpisz numer rejestracyjny',
  floating: false,
  compact: false,
  disabled: false,
})

const emit = defineEmits<{
  add: [vehicleId: string]
  remove: [vehicleId: string]
}>()

const fieldElement = ref<HTMLElement | null>(null)
const inputElement = ref<HTMLInputElement | null>(null)
const query = ref('')
const isOpen = ref(false)
const activeIndex = ref(-1)
const inputId = `vehicle-tags-${Math.random().toString(16).slice(2)}`
const listboxId = `${inputId}-listbox`

const tagFieldClasses = computed(() => [
  'flex w-full flex-wrap items-center gap-1.5 rounded-[var(--rw-radius-control)] border border-ui-input-border bg-ui-input text-ui-text shadow-soft transition hover:border-ui-border-strong focus-within:border-ui-input-focus focus-within:bg-ui-input-hover focus-within:ring-2 focus-within:ring-ui-focus/60',
  props.compact ? 'text-xs' : 'text-sm',
  props.disabled ? 'cursor-not-allowed border-ui-border bg-ui-disabled text-ui-disabled-text' : 'cursor-text',
  props.floating && isOpen.value
    ? 'absolute inset-x-0 top-0 z-[220] max-h-40 min-h-9 overflow-y-auto px-3 py-2'
    : props.floating
      ? 'h-9 overflow-hidden px-3 py-1'
      : 'min-h-11 px-3 py-2',
])

const selectedIds = computed(() => new Set(props.modelValue.map(String)))
const selectedVehicles = computed(() => props.modelValue
  .map((id) => props.vehicles.find((vehicle) => String(vehicle.id) === String(id)))
  .filter(Boolean) as ApiVehicle[])

const filteredVehicles = computed(() => {
  const normalizedQuery = query.value.trim().toLocaleLowerCase('pl')
  return props.vehicles
    .filter((vehicle) => !selectedIds.value.has(String(vehicle.id)))
    .filter((vehicle) => !normalizedQuery || vehicle.licensePlate.toLocaleLowerCase('pl').includes(normalizedQuery))
    .slice(0, 50)
})

function optionId(index: number) {
  return `${inputId}-option-${index}`
}

function openMenu() {
  if (props.disabled) return
  isOpen.value = true
  activeIndex.value = filteredVehicles.value.length ? 0 : -1
}

function closeMenu() {
  isOpen.value = false
  activeIndex.value = -1
  query.value = ''
}

function handleInput() {
  openMenu()
}

function moveActive(direction: 1 | -1) {
  if (!filteredVehicles.value.length) return
  activeIndex.value = (activeIndex.value + direction + filteredVehicles.value.length) % filteredVehicles.value.length
  void nextTick(() => document.getElementById(optionId(activeIndex.value))?.scrollIntoView({ block: 'nearest' }))
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!isOpen.value) openMenu()
    else moveActive(event.key === 'ArrowDown' ? 1 : -1)
  } else if (event.key === 'Enter' && isOpen.value && activeIndex.value >= 0) {
    event.preventDefault()
    selectVehicle(filteredVehicles.value[activeIndex.value].id)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closeMenu()
  } else if (event.key === 'Tab') {
    closeMenu()
  }
}

function selectVehicle(vehicleId: number) {
  if (props.disabled) return
  emit('add', String(vehicleId))
  query.value = ''
  activeIndex.value = 0
  if (!props.floating) isOpen.value = false
  else requestAnimationFrame(() => inputElement.value?.focus())
}

function removeVehicle(vehicleId: number) {
  if (!props.disabled) emit('remove', String(vehicleId))
}

function focusInput() {
  if (!props.disabled) inputElement.value?.focus()
}
</script>
