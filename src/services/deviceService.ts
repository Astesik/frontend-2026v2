import { api } from './api'
import type {
  DeviceDetails,
  DeviceListItem,
  DeviceListParams,
  DevicePatchPayload,
  DeviceProvider,
  DeviceSelectItem,
  DeviceStatus,
  DeviceType,
} from '@/types/device'

function normalizeDevice<T extends DeviceListItem>(device: T): T {
  return {
    ...device,
    type: String(device.type || 'NEW').toUpperCase() as DeviceType,
    status: String(device.status || 'ACTIVE').toUpperCase() as DeviceStatus,
    provider: String(device.provider || 'LOCAL').toUpperCase() as DeviceProvider,
  }
}

export const deviceService = {
  async getDevices(params?: DeviceListParams, options?: { silent?: boolean }) {
    const { data } = await api.get<DeviceListItem[]>('/api/devices', {
      params,
      skipErrorToast: options?.silent,
    })
    return Array.isArray(data) ? data.map(normalizeDevice) : []
  },

  async getDevice(id: number | string, options?: { silent?: boolean }) {
    const { data } = await api.get<DeviceDetails>(`/api/devices/${id}`, {
      skipErrorToast: options?.silent,
    })
    return normalizeDevice(data)
  },

  async updateDevice(id: number | string, payload: DevicePatchPayload) {
    const { data } = await api.patch<DeviceDetails>(`/api/devices/${id}`, payload)
    return normalizeDevice(data)
  },

  async deleteDevice(id: number | string) {
    await api.delete(`/api/devices/${id}`)
  },

  async getDeviceSelect(options?: { silent?: boolean }) {
    const { data } = await api.get<DeviceSelectItem[]>('/api/devices/select', {
      skipErrorToast: options?.silent,
    })
    return Array.isArray(data) ? data : []
  },
}
