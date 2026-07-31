import { api } from './api'
import type { ApiVehicle, SelectOption, VehiclePhoto } from '@/types/fleet'

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

  async getVehiclePhotos(vehicleId: number | string, options?: { silent?: boolean }) {
    const { data } = await api.get<VehiclePhoto[]>(`/api/vehicles/${vehicleId}/photos`, {
      skipErrorToast: options?.silent,
    })
    return Array.isArray(data) ? data : []
  },

  async uploadVehiclePhoto(vehicleId: number | string, file: File) {
    const formData = new FormData()
    formData.append('file', file, file.name)
    const { data } = await api.post<VehiclePhoto>(`/api/vehicles/${vehicleId}/photos`, formData)
    return data
  },

  async loadVehiclePhotoBlob(photo: VehiclePhoto, options?: { silent?: boolean }) {
    const { data } = await api.get<Blob>(photo.url, {
      responseType: 'blob',
      skipErrorToast: options?.silent,
    })
    return data
  },

  async downloadVehiclePhotoBlob(photo: VehiclePhoto) {
    const { data } = await api.get<Blob>(photo.downloadUrl || photo.url, {
      responseType: 'blob',
    })
    return data
  },

  async deleteVehiclePhoto(vehicleId: number | string, photoId: number | string) {
    await api.delete(`/api/vehicles/${vehicleId}/photos/${photoId}`)
  },
}
