import { api } from './api'
import type { ApiVehicle, SelectOption } from '@/types/fleet'

export type VehiclePayload = Partial<Omit<ApiVehicle, 'id' | 'lastPositionAt'>>

export const vehicleService = {
  async getVehicles(options?: { silent?: boolean }) {
    const { data } = await api.get<ApiVehicle[]>('/api/vehicles', {
      skipErrorToast: options?.silent,
    })
    return data
  },

  async getVehicleSelect() {
    const { data } = await api.get<SelectOption[]>('/api/vehicles/select')
    return data
  },

  async getAllVehicleSelect() {
    const { data } = await api.get<SelectOption[]>('/api/vehicles/select/all')
    return data
  },

  async createVehicle(payload: VehiclePayload) {
    const { data } = await api.post<ApiVehicle>('/api/vehicles', payload)
    return data
  },

  async updateVehicle(id: number | string, payload: VehiclePayload) {
    const { data } = await api.patch<ApiVehicle>(`/api/vehicles/${id}`, payload)
    return data
  },

  async deleteVehicle(id: number | string) {
    await api.delete(`/api/vehicles/${id}`)
  },

  async assignDevice(vehicleId: number | string, deviceId: number | string) {
    const { data } = await api.post<ApiVehicle>(`/api/vehicle/${vehicleId}/assign-device`, { deviceId })
    return data
  },

  async unassignDevice(vehicleId: number | string) {
    const { data } = await api.delete<ApiVehicle>(`/api/vehicle/${vehicleId}/assign-device`)
    return data
  },
}
