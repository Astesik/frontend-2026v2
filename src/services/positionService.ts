import { api } from './api'
import type { ApiLastPosition, PositionDriver } from '@/types/fleet'

export type DeviceProvider = 'FLESPI' | 'GPS_ONLINE' | 'LOCAL' | 'ABERG'

export interface PositionHistoryRequest {
  from: string
  to: string
  device_id: number
}

export interface ApiPositionHistoryPoint {
  id: number | null
  deviceId: number
  vehicleId: number | null
  ts: string | null
  lat: number | null
  lon: number | null
  speedKph: number | null
  heading: number | null
  fuelPct: number | null
  countryCode: string | null
  ignitionState: string | null
  driverSlot0: string | null
  driverSlot1: string | null
  receivedAt: string | null
  raw: Record<string, unknown> | null
  driver0: PositionDriver | null
  driver1: PositionDriver | null
}

export interface PositionHistorySummary {
  recordCount: number
  firstMileageKm: number | null
  lastMileageKm: number | null
  mileageDifferenceKm: number | null
}

export interface PositionHistoryResponse {
  provider: DeviceProvider
  result: ApiPositionHistoryPoint[]
  summary: PositionHistorySummary
}

export const positionService = {
  async getLastPositions(options?: { silent?: boolean }) {
    const { data } = await api.get<ApiLastPosition[]>('/api/positions/last', {
      skipErrorToast: options?.silent,
    })

    return data
  },

  async getPositionHistory(payload: PositionHistoryRequest, options?: { silent?: boolean }) {
    const { data } = await api.post<PositionHistoryResponse>('/api/positions/history', payload, {
      skipErrorToast: options?.silent,
    })

    return data
  },
}
