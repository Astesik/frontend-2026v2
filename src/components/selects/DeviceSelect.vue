<template>
  <AppSearchSelect
    :model-value="modelValue"
    :label="label"
    :placeholder="placeholder"
    :options="options"
    :disabled="disabled || deviceStore.isSelectLoading"
    :size="size"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import AppSearchSelect, { type AppSearchSelectOption } from '@/components/ui/AppSearchSelect.vue'
import { useDeviceStore } from '@/stores/deviceStore'

const props = withDefaults(defineProps<{
  modelValue: string
  label?: string
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md'
  reloadKey?: string | number
}>(), {
  label: undefined,
  placeholder: 'Wybierz urządzenie',
  disabled: false,
  size: 'md',
  reloadKey: 0,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const deviceStore = useDeviceStore()

const options = computed<AppSearchSelectOption[]>(() => deviceStore.selectDevices.map((device) => ({
  value: String(device.id),
  label: device.assigned ? `${device.deviceName} - przypisane` : device.deviceName,
  description: `ID: ${device.id}`,
  disabled: device.assigned,
  searchText: `${device.id} ${device.deviceName}`,
})))

async function loadDevices(silent = false) {
  try {
    await deviceStore.loadSelectDevices({ silent })
  } catch {
    // API errors are handled globally unless this is a silent reload.
  }
}

onMounted(() => {
  void loadDevices()
})

watch(() => props.reloadKey, () => {
  void loadDevices(true)
})
</script>
