import { api } from './api'
import type { FuelRouteRequest, FuelRouteResult } from '@/types/fuelRoute'
export const fuelRouteService = {
  async search(body: FuelRouteRequest, signal?: AbortSignal) { return (await api.post<FuelRouteResult>('/api/fuel-stations/along-route', body, { signal, skipErrorToast: true })).data },
}
