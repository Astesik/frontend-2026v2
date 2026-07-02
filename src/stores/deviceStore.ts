import { defineStore } from 'pinia'
import { ref } from 'vue'
import { deviceService } from '@/services/deviceService'
import type {
  DeviceDetails,
  DeviceListItem,
  DeviceListParams,
  DevicePatchPayload,
  DeviceSelectItem,
} from '@/types/device'

export const useDeviceStore = defineStore('devices', () => {
  const devices = ref<DeviceListItem[]>([])
  const selectDevices = ref<DeviceSelectItem[]>([])
  const currentDevice = ref<DeviceDetails | null>(null)
  const isLoading = ref(false)
  const isDetailLoading = ref(false)
  const isSelectLoading = ref(false)
  const isMutating = ref(false)

  function upsertDevice(device: DeviceDetails | DeviceListItem) {
    const index = devices.value.findIndex((item) => item.id === device.id)

    if (index >= 0) {
      devices.value.splice(index, 1, device)
    } else {
      devices.value = [...devices.value, device]
    }
  }

  async function loadDevices(params?: DeviceListParams, options?: { silent?: boolean }) {
    isLoading.value = true

    try {
      devices.value = await deviceService.getDevices(params, options)
      return devices.value
    } finally {
      isLoading.value = false
    }
  }

  async function loadDevice(id: number | string, options?: { silent?: boolean }) {
    isDetailLoading.value = true

    try {
      const device = await deviceService.getDevice(id, options)
      currentDevice.value = device
      upsertDevice(device)
      return device
    } finally {
      isDetailLoading.value = false
    }
  }

  async function loadSelectDevices(options?: { silent?: boolean }) {
    isSelectLoading.value = true

    try {
      selectDevices.value = await deviceService.getDeviceSelect(options)
      return selectDevices.value
    } finally {
      isSelectLoading.value = false
    }
  }

  async function updateDevice(id: number | string, payload: DevicePatchPayload) {
    isMutating.value = true

    try {
      const device = await deviceService.updateDevice(id, payload)
      currentDevice.value = device
      upsertDevice(device)
      return device
    } finally {
      isMutating.value = false
    }
  }

  async function deleteDevice(id: number | string) {
    isMutating.value = true

    try {
      await deviceService.deleteDevice(id)
      devices.value = devices.value.filter((device) => String(device.id) !== String(id))
      selectDevices.value = selectDevices.value.filter((device) => String(device.id) !== String(id))

      if (String(currentDevice.value?.id) === String(id)) {
        currentDevice.value = null
      }
    } finally {
      isMutating.value = false
    }
  }

  function clearCurrentDevice() {
    currentDevice.value = null
  }

  return {
    devices,
    selectDevices,
    currentDevice,
    isLoading,
    isDetailLoading,
    isSelectLoading,
    isMutating,
    loadDevices,
    loadDevice,
    loadSelectDevices,
    updateDevice,
    deleteDevice,
    clearCurrentDevice,
  }
})
