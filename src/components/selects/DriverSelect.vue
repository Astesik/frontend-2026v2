<template>
  <AppSelect
    :model-value="modelValue"
    :label="label"
    :options="options"
    :disabled="disabled"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { useFleetStore } from '@/stores/fleetStore'

const props = withDefaults(defineProps<{
  modelValue: string
  label?: string
  includeAll?: boolean
  disabled?: boolean
}>(), {
  label: undefined,
  includeAll: true,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const fleetStore = useFleetStore()

const options = computed(() => [
  ...(props.includeAll ? [{ value: 'all', label: 'Wszyscy kierowcy' }] : []),
  ...fleetStore.driverOptions.map((option) => ({
    value: String(option.id),
    label: option.label,
  })),
])
</script>
