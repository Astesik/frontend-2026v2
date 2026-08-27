<template>
  <AppSearchSelect
    :model-value="modelValue"
    :label="label"
    :options="options"
    :placeholder="placeholder"
    :disabled="disabled"
    :size="size"
    :empty-text="emptyText"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import AppSearchSelect, { type AppSearchSelectOption } from '@/components/ui/AppSearchSelect.vue'
import { useFleetStore } from '@/stores/fleetStore'

const props = withDefaults(defineProps<{
  modelValue: string
  fleetId?: string
  vehicleType?: 'all' | 'truck' | 'trailer'
  label?: string
  placeholder?: string
  includeAll?: boolean
  disabled?: boolean
  size?: 'sm' | 'md'
}>(), {
  fleetId: 'all',
  vehicleType: 'all',
  label: undefined,
  placeholder: 'Wybierz pojazd',
  includeAll: true,
  disabled: false,
  size: 'sm',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const fleetStore = useFleetStore()

const availableVehicles = computed(() => fleetStore.vehicles.filter((vehicle) => (
  (props.fleetId === 'all' || fleetStore.isVehicleInGroup(props.fleetId, vehicle.id)) &&
  (props.vehicleType === 'all' || vehicle.vehicleType === props.vehicleType)
)))

const options = computed<AppSearchSelectOption[]>(() => [
  ...(props.includeAll ? [{ value: 'all', label: 'Wszystkie pojazdy' }] : []),
  ...availableVehicles.value.map((vehicle) => ({
    value: vehicle.id,
    label: vehicle.plateNumber,
    searchText: vehicle.plateNumber,
  })),
])

const emptyText = computed(() => availableVehicles.value.length
  ? 'Brak pasujących numerów rejestracyjnych'
  : 'Brak pojazdów')

watch(() => props.fleetId, (fleetId) => {
  if (fleetId !== 'all') {
    void fleetStore.fetchVehicleGroup(fleetId, { silent: true })
  }

  if (props.modelValue !== 'all' && !availableVehicles.value.some((vehicle) => vehicle.id === props.modelValue)) {
    emit('update:modelValue', props.includeAll ? 'all' : '')
  }
}, { immediate: true })
</script>
