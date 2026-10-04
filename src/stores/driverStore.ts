import { defineStore } from 'pinia'
import { ref } from 'vue'
import { driverService } from '@/services/driverService'
import type { DriverListItem, DriverPatchPayload, DriverSelectItem } from '@/types/driver'

export const useDriverStore = defineStore('drivers', () => {
  const drivers = ref<DriverListItem[]>([])
  const selectDrivers = ref<DriverSelectItem[]>([])
  const currentDriver = ref<DriverListItem | null>(null)
  const isLoading = ref(false)
  const isSelectLoading = ref(false)
  const isMutating = ref(false)

  function upsertDriver(driver: DriverListItem) {
    const index = drivers.value.findIndex((item) => item.id === driver.id)

    if (index >= 0) drivers.value.splice(index, 1, driver)
    else drivers.value = [...drivers.value, driver]
  }

  async function loadDrivers(options?: { silent?: boolean }) {
    isLoading.value = true
    try {
      drivers.value = await driverService.getDrivers(options)
      return drivers.value
    } finally {
      isLoading.value = false
    }
  }

  async function loadSelectDrivers(options?: { silent?: boolean }) {
    isSelectLoading.value = true
    try {
      selectDrivers.value = await driverService.getDriverSelect(options)
      return selectDrivers.value
    } finally {
      isSelectLoading.value = false
    }
  }

  async function loadDriver(id: number | string, options?: { silent?: boolean }) {
    const driver = await driverService.getDriver(id, options)
    currentDriver.value = driver
    upsertDriver(driver)
    return driver
  }

  async function updateDriver(id: number | string, payload: DriverPatchPayload) {
    isMutating.value = true
    try {
      const driver = await driverService.updateDriver(id, payload)
      currentDriver.value = driver
      upsertDriver(driver)
      await Promise.allSettled([loadDrivers({ silent: true }), loadSelectDrivers({ silent: true })])
      return driver
    } finally {
      isMutating.value = false
    }
  }

  async function deleteDriver(id: number | string) {
    isMutating.value = true
    try {
      await driverService.deleteDriver(id)
      drivers.value = drivers.value.filter((driver) => String(driver.id) !== String(id))
      selectDrivers.value = selectDrivers.value.filter((driver) => String(driver.id) !== String(id))
      if (String(currentDriver.value?.id) === String(id)) currentDriver.value = null
    } finally {
      isMutating.value = false
    }
  }

  function resetApiState() {
    drivers.value = []
    selectDrivers.value = []
    currentDriver.value = null
    isLoading.value = false
    isSelectLoading.value = false
    isMutating.value = false
  }

  return {
    drivers,
    selectDrivers,
    currentDriver,
    isLoading,
    isSelectLoading,
    isMutating,
    loadDrivers,
    loadSelectDrivers,
    loadDriver,
    updateDriver,
    deleteDriver,
    resetApiState,
  }
})
