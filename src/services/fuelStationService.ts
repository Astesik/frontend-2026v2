import { api } from './api'
import type { FuelStation, FuelStationCountry, FuelStationProvider, FuelStationPrice, FuelStationSearch, FuelStationPage, FuelStationWrite, FuelStationImportResult, FuelStationActiveResult } from '@/types/fuelStation'
const config = { skipErrorToast: true }
export const fuelStationService = {
  async providers() { return (await api.get<FuelStationProvider[]>('/api/fuel-stations/providers', config)).data },
  async countries(provider?: string) { return (await api.get<FuelStationCountry[]>('/api/fuel-stations/countries', { ...config, params: { provider: provider || undefined } })).data },
  async search(filters: FuelStationSearch) { return (await api.post<FuelStationPage>('/api/fuel-stations/search', filters, config)).data },
  async prices(id: number, from?: string, to?: string) {
    return (await api.get<FuelStationPrice[]>(`/api/fuel-stations/${id}/prices`, { ...config, params: { from: from || undefined, to: to || undefined, limit: 1000 } })).data
  },
  async importFile(provider: string, file: File) {
    const data = new FormData()
    data.append('provider', provider)
    data.append('file', file, file.name)
    return (await api.post<FuelStationImportResult>('/api/fuel-stations/import', data, config)).data
  },
  async create(data: FuelStationWrite) { return (await api.post<FuelStation>('/api/fuel-stations', data, config)).data },
  async update(id: number, data: Omit<FuelStationWrite, 'provider'>) { return (await api.patch<FuelStation>(`/api/fuel-stations/${id}`, data, config)).data },
  async setActive(id: number, active: boolean) { return (await api.patch<FuelStation>(`/api/fuel-stations/${id}`, { active }, config)).data },
  async setActiveBulk(stationIds: number[], active: boolean) { return (await api.patch<FuelStationActiveResult>('/api/fuel-stations/active', { stationIds, active }, config)).data },
}
