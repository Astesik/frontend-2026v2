import { api } from './api'

export interface DeviceSelectItem {
  id: number
  deviceName: string
  assigned: boolean
}

export const deviceService = {
  async getDeviceSelect(options?: { silent?: boolean }) {
    const { data } = await api.get<DeviceSelectItem[]>('/api/devices/select', {
      skipErrorToast: options?.silent,
    })
    return data
  },
}
