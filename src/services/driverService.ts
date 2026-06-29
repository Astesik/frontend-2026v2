import { api } from './api'
import type { Driver, SelectOption } from '@/types/fleet'

export const driverService = {
  async getDrivers() {
    const { data } = await api.get<Driver[]>('/api/drivers')
    return data
  },

  async getDriverSelect() {
    const { data } = await api.get<SelectOption[]>('/api/drivers/select')
    return data
  },
}
