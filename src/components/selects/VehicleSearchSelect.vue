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
        class="h-9 w-full rounded-2xl border border-slate-200 bg-white px-3 pr-9 text-xs text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-app-border dark:bg-app-panel dark:text-slate-50 dark:placeholder:text-app-muted dark:focus:border-app-muted dark:focus:ring-app-elevated"
        @focus="isOpen = true"
        @input="isOpen = true"
        @keydown.escape.prevent="isOpen = false"
      />
      <Search class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>

    <div
      v-if="isOpen"
      class="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-app-border dark:bg-app-panel"
    >
      <button
        v-if="includeAll"
        type="button"
        class="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs transition"
        :class="modelValue === 'all' ? 'bg-slate-100 text-slate-950 dark:bg-app-elevated dark:text-slate-50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-app-elevated dark:hover:text-slate-50'"
        @click="selectVehicle('all', allLabel)"
      >
        <span class="truncate">{{ allLabel }}</span>
        <Check v-if="modelValue === 'all'" class="h-4 w-4 shrink-0" />
      </button>

      <button
        v-for="vehicle in filteredVehicles"
        :key="vehicle.id"
        type="button"
        class="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs transition"
        :class="vehicle.id === modelValue ? 'bg-slate-100 text-slate-950 dark:bg-app-elevated dark:text-slate-50' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-app-elevated dark:hover:text-slate-50'"
        @click="selectVehicle(vehicle.id, vehicle.plateNumber)"
      >
        <span class="truncate">
          {{ vehicle.plateNumber }}
        </span>
        <Check v-if="vehicle.id === modelValue" class="h-4 w-4 shrink-0" />
      </button>

      <div v-if="!filteredVehicles.length" class="px-3 py-2 text-xs text-slate-500 dark:text-app-muted">
        Brak wynikow
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Check, Search } from 'lucide-vue-next'
import { useFleetStore } from '@/stores/fleetStore'

const props = withDefaults(defineProps<{
  modelValue: string
  fleetId?: string
  vehicleType?: 'all' | 'truck' | 'trailer'
  label?: string
  placeholder?: string
  includeAll?: boolean
  disabled?: boolean
}>(), {
  fleetId: 'all',
  vehicleType: 'all',
  label: undefined,
  placeholder: 'Pojazd',
  includeAll: true,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const fleetStore = useFleetStore()
const rootElement = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const query = ref('')
const inputId = `vehicle-search-${Math.random().toString(16).slice(2)}`
const allLabel = 'Wszystkie pojazdy'

const availableVehicles = computed(() => fleetStore.vehicles.filter((vehicle) => (
  (props.fleetId === 'all' || fleetStore.isVehicleInGroup(props.fleetId, vehicle.id)) &&
  (props.vehicleType === 'all' || vehicle.vehicleType === props.vehicleType)
)))

const filteredVehicles = computed(() => {
  const normalizedQuery = query.value.trim().toLowerCase()

  return availableVehicles.value.filter((vehicle) => !normalizedQuery ||
    vehicle.plateNumber.toLowerCase().includes(normalizedQuery) ||
    vehicle.name.toLowerCase().includes(normalizedQuery) ||
    vehicle.model.toLowerCase().includes(normalizedQuery))
})

function selectedLabel() {
  if (props.modelValue === 'all') {
    return ''
  }

  return fleetStore.vehicles.find((vehicle) => vehicle.id === props.modelValue)?.plateNumber || ''
}

function selectVehicle(vehicleId: string, label: string) {
  emit('update:modelValue', vehicleId)
  query.value = vehicleId === 'all' ? '' : label
  isOpen.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (!rootElement.value?.contains(event.target as Node)) {
    isOpen.value = false
    query.value = selectedLabel()
  }
}

watch(() => props.modelValue, () => {
  query.value = selectedLabel()
}, { immediate: true })

watch(() => props.fleetId, (fleetId) => {
  if (fleetId !== 'all') {
    void fleetStore.fetchVehicleGroup(fleetId, { silent: true })
  }

  if (props.modelValue !== 'all' && !availableVehicles.value.some((vehicle) => vehicle.id === props.modelValue)) {
    emit('update:modelValue', 'all')
  }
}, { immediate: true })

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>
