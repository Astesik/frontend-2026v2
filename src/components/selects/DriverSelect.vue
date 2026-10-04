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
import { computed, onMounted } from 'vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { useDriverStore } from '@/stores/driverStore'

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

const driverStore = useDriverStore()

const options = computed(() => [
  ...(props.includeAll ? [{ value: 'all', label: 'Wszyscy kierowcy' }] : []),
  ...driverStore.selectDrivers.map((option) => ({
    value: String(option.id),
    label: option.label?.trim() || `Kierowca #${option.id}`,
  })),
])

onMounted(() => {
  if (!driverStore.selectDrivers.length && !driverStore.isSelectLoading) {
    void driverStore.loadSelectDrivers()
  }
})
</script>
