<template>
  <div ref="rootElement" class="relative">
    <label v-if="label" class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
      {{ label }}
    </label>

    <div
      class="flex min-h-11 w-full flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm transition focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200 dark:border-app-border dark:bg-app-panel dark:text-slate-50 dark:focus:border-app-muted dark:focus:ring-app-elevated"
      @click="inputElement?.focus()"
    >
      <span
        v-for="vehicle in selectedVehicles"
        :key="vehicle.id"
        class="inline-flex max-w-full items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 dark:border-app-border dark:bg-app-elevated dark:text-slate-100"
      >
        <span class="truncate">{{ vehicle.licensePlate }}</span>
        <button
          type="button"
          class="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-slate-950 dark:hover:bg-app-panel dark:hover:text-slate-50"
          :aria-label="`Usuń ${vehicle.licensePlate}`"
          @click.stop="$emit('remove', String(vehicle.id))"
        >
          <X class="h-3 w-3" />
        </button>
      </span>

      <input
        ref="inputElement"
        v-model="query"
        type="text"
        class="min-w-[9rem] flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-slate-50 dark:placeholder:text-app-muted"
        :placeholder="selectedVehicles.length ? 'Dodaj pojazd' : placeholder"
        @focus="isOpen = true"
        @input="isOpen = true"
        @keydown.escape.prevent="isOpen = false"
      />
    </div>

    <div
      v-if="isOpen"
      class="absolute z-40 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-app-border dark:bg-app-panel"
    >
      <button
        v-for="vehicle in filteredVehicles"
        :key="vehicle.id"
        type="button"
        class="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-app-elevated dark:hover:text-slate-50"
        @click="selectVehicle(vehicle.id)"
      >
        <span class="min-w-0">
          <span class="block truncate font-semibold">{{ vehicle.licensePlate }}</span>
          <span class="mt-0.5 block truncate text-[11px] text-slate-400 dark:text-app-muted">
            {{ [vehicle.make, vehicle.vin].filter(Boolean).join(' • ') || 'Pojazd' }}
          </span>
        </span>
        <Plus class="h-4 w-4 shrink-0" />
      </button>

      <div v-if="!filteredVehicles.length" class="px-3 py-2 text-xs text-slate-500 dark:text-app-muted">
        Brak pojazdów do dodania.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Plus, X } from 'lucide-vue-next'
import type { ApiVehicle } from '@/types/fleet'

const props = withDefaults(defineProps<{
  modelValue: string[]
  vehicles: ApiVehicle[]
  label?: string
  placeholder?: string
}>(), {
  label: undefined,
  placeholder: 'Wpisz numer rejestracyjny',
})

const emit = defineEmits<{
  add: [vehicleId: string]
  remove: [vehicleId: string]
}>()

const rootElement = ref<HTMLElement | null>(null)
const inputElement = ref<HTMLInputElement | null>(null)
const query = ref('')
const isOpen = ref(false)

const selectedIds = computed(() => new Set(props.modelValue.map(String)))
const selectedVehicles = computed(() => props.modelValue
  .map((id) => props.vehicles.find((vehicle) => String(vehicle.id) === String(id)))
  .filter(Boolean) as ApiVehicle[])

const filteredVehicles = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()

  return props.vehicles
    .filter((vehicle) => !selectedIds.value.has(String(vehicle.id)))
    .filter((vehicle) => {
      if (!normalizedQuery) {
        return true
      }

      return [
        vehicle.licensePlate,
        vehicle.make,
        vehicle.vin,
        vehicle.productionYear,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery))
    })
    .slice(0, 20)
})

function selectVehicle(vehicleId: number) {
  emit('add', String(vehicleId))
  query.value = ''
  isOpen.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (!rootElement.value?.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>
