import { api } from './api'
import type { ReturnPreview, VehicleReturnEntry, VehicleReturnWeek, VehicleReturnWrite } from '@/types/vehicleReturn'

const config = { skipErrorToast: true }
export const vehicleReturnService = {
  async search(weekStart: string) {
    return (await api.post<VehicleReturnWeek>('/api/vehicle-returns/search', { weekStart }, config)).data
  },
  async details(id: number) {
    return (await api.post<VehicleReturnEntry>('/api/vehicle-returns/details', { id }, config)).data
  },
  async preview(truckId: number, trailerId: number | null) {
    return (await api.post<ReturnPreview>('/api/vehicle-returns/preview', { truckId, trailerId }, config)).data
  },
  async create(data: VehicleReturnWrite) {
    return (await api.post<VehicleReturnEntry>('/api/vehicle-returns/create', data, config)).data
  },
  async update(id: number, version: number, data: VehicleReturnWrite) {
    return (await api.post<VehicleReturnEntry>('/api/vehicle-returns/update', { id, version, data }, config)).data
  },
  async delete(id: number, version: number) {
    await api.post('/api/vehicle-returns/delete', { id, version }, config)
  },
}
