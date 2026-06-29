<template>
  <AppSearchSelect
    :model-value="modelValue"
    :label="label"
    :placeholder="placeholder"
    :options="options"
    :disabled="disabled || isLoading"
    :size="size"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AppSearchSelect, { type AppSearchSelectOption } from '@/components/ui/AppSearchSelect.vue'
import { deviceService, type DeviceSelectItem } from '@/services/deviceService'

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

const devices = ref<DeviceSelectItem[]>([])
const isLoading = ref(false)

const options = computed<AppSearchSelectOption[]>(() => devices.value.map((device) => ({
  value: String(device.id),
  label: device.assigned ? `${device.deviceName} - przypisane` : device.deviceName,
  description: `ID: ${device.id}`,
  disabled: device.assigned,
  searchText: `${device.id} ${device.deviceName}`,
})))

async function loadDevices(silent = false) {
  isLoading.value = true

  try {
    devices.value = await deviceService.getDeviceSelect({ silent })
  } catch {
    devices.value = []
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadDevices()
})

watch(() => props.reloadKey, () => {
  void loadDevices(true)
})
</script>
