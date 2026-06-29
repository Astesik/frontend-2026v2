import { api } from './api'
import type { ApiVehicleGroup, ApiVehicleGroupDetails, VehicleGroup, VehicleGroupDetails } from '@/types/fleet'

function normalizeVehicleGroup(group: ApiVehicleGroup): VehicleGroup {
  return {
    id: String(group.id),
    name: group.name,
    vehiclesCount: group.vehiclesCount,
  }
}

function normalizeVehicleGroupDetails(group: ApiVehicleGroupDetails): VehicleGroupDetails {
  return {
    id: String(group.id),
    name: group.name,
    vehicleIds: group.vehicleIds.map(String),
  }
}

export const vehicleGroupService = {
  async getVehicleGroups(options?: { silent?: boolean }) {
    const { data } = await api.get<ApiVehicleGroup[]>('/api/vehicle-groups', {
      skipErrorToast: options?.silent,
    })
    return data.map(normalizeVehicleGroup)
  },

  async getVehicleGroup(groupId: string, options?: { silent?: boolean }) {
    const { data } = await api.get<ApiVehicleGroupDetails>(`/api/vehicle-groups/${groupId}`, {
      skipErrorToast: options?.silent,
    })

    return normalizeVehicleGroupDetails(data)
  },

  async createVehicleGroup(payload: { name: string }) {
    const { data } = await api.post<ApiVehicleGroupDetails>('/api/vehicle-groups', payload)
    return normalizeVehicleGroupDetails(data)
  },

  async updateVehicleGroup(groupId: string, payload: { name?: string }) {
    const { data } = await api.patch<ApiVehicleGroupDetails>(`/api/vehicle-groups/${groupId}`, payload)
    return normalizeVehicleGroupDetails(data)
  },

  async deleteVehicleGroup(groupId: string) {
    await api.delete(`/api/vehicle-groups/${groupId}`)
  },

  async addVehicleToGroup(groupId: string, vehicleId: string | number) {
    const { data } = await api.post<ApiVehicleGroupDetails>(`/api/vehicle-groups/${groupId}/vehicles`, {
      vehicleId: Number(vehicleId),
    })
    return normalizeVehicleGroupDetails(data)
  },

  async removeVehicleFromGroup(groupId: string, vehicleId: string | number) {
    const { data } = await api.delete<ApiVehicleGroupDetails>(`/api/vehicle-groups/${groupId}/vehicles/${vehicleId}`)
    return normalizeVehicleGroupDetails(data)
  },
}
