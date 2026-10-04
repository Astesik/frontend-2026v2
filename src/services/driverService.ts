import { api } from './api'
import type {
  DriverListItem,
  DriverPatchPayload,
  DriverSelectItem,
  DriverStatus,
} from '@/types/driver'

function normalizeDriver(driver: DriverListItem): DriverListItem {
  return {
    ...driver,
    status: String(driver.status || 'ACTIVE').toUpperCase() as DriverStatus,
    firstName: driver.firstName || null,
    lastName: driver.lastName || null,
    fullName: driver.fullName || null,
  }
}

export const driverService = {
  async getDrivers(options?: { silent?: boolean }) {
    const { data } = await api.get<DriverListItem[]>('/api/drivers', {
      skipErrorToast: options?.silent,
    })
    return Array.isArray(data) ? data.map(normalizeDriver) : []
  },

  async getActiveDrivers(options?: { silent?: boolean }) {
    const { data } = await api.get<DriverListItem[]>('/api/drivers/active', {
      skipErrorToast: options?.silent,
    })
    return Array.isArray(data) ? data.map(normalizeDriver) : []
  },

  async getDriverSelect(options?: { silent?: boolean }) {
    const { data } = await api.get<DriverSelectItem[]>('/api/drivers/select', {
      skipErrorToast: options?.silent,
    })
    return Array.isArray(data) ? data : []
  },

  async getDriver(id: number | string, options?: { silent?: boolean }) {
    const { data } = await api.get<DriverListItem>(`/api/drivers/${id}`, {
      skipErrorToast: options?.silent,
    })
    return normalizeDriver(data)
  },

  async getDriverByTachoid(tachoid: number | string, options?: { silent?: boolean }) {
    const { data } = await api.get<DriverListItem>(`/api/drivers/by-tachoid/${tachoid}`, {
      skipErrorToast: options?.silent,
    })
    return normalizeDriver(data)
  },

  async updateDriver(id: number | string, payload: DriverPatchPayload) {
    const { data } = await api.patch<DriverListItem>(`/api/drivers/${id}`, payload)
    return normalizeDriver(data)
  },

  async deleteDriver(id: number | string) {
    await api.delete(`/api/drivers/${id}`)
  },
}
