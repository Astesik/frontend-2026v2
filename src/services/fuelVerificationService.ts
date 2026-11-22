import { api } from './api'
import type { FuelTankObservation } from './fuelTankService'

export type FuelVerificationStatus = 'AT_STATION' | 'LOCATION_MISMATCH' | 'INCONCLUSIVE' | 'NO_GPS'
  | 'NO_STATION_COORDINATES' | 'UNASSIGNED' | 'UNRESOLVED_TIME'

export type FuelGpsStatus = FuelVerificationStatus | 'NOT_CHECKED' | 'QUEUED' | 'FAILED'

export const fuelGpsLabels: Record<FuelGpsStatus, string> = {
  AT_STATION: 'Pojazd przy stacji',
  LOCATION_MISMATCH: 'Niezgodna lokalizacja',
  INCONCLUSIVE: 'Nierozstrzygnięte',
  NO_GPS: 'Brak danych GPS',
  NO_STATION_COORDINATES: 'Brak współrzędnych stacji',
  UNASSIGNED: 'Brak przypisania',
  UNRESOLVED_TIME: 'Godzina do wyjaśnienia',
  NOT_CHECKED: 'Oczekuje na zlecenie',
  QUEUED: 'W kolejce',
  FAILED: 'Błąd weryfikacji',
}

export const fuelTrendLabels = {
  RISE_OBSERVED: 'Wzrost w dwóch kolejnych odczytach',
  SINGLE_RISE: 'Wzrost w pojedynczym odczycie',
  NO_RISE_OBSERVED: 'Bez widocznego wzrostu',
  INSUFFICIENT_DATA: 'Za mało danych do porównania',
}

export function fuelGpsVariant(status: FuelGpsStatus) {
  if (status === 'AT_STATION') return 'success'
  if (status === 'LOCATION_MISMATCH' || status === 'FAILED') return 'error'
  if (status === 'QUEUED') return 'info'
  return status === 'NOT_CHECKED' ? 'neutral' : 'warning'
}

export interface FuelVerificationBatch {
  importId: number
  fileName: string
  importedAt: string
  total: number
  pending: number
  done: number
  failed: number
}

interface GpsPoint {
  readingId: string
  provider: string
  recordedAt: string
  distanceMeters: number
  secondsFromReport: number
  speedKph: number | null
}

export interface FuelVerification {
  id: number
  checkedAt: string
  algorithmVersion: string
  result: {
    status: FuelVerificationStatus
    samples: number
    usablePositions: number
    point: GpsPoint | null
    before: GpsPoint | null
    after: GpsPoint | null
    rules?: {
      reportPrecisionSeconds: number
      positionToleranceSeconds: number
      stationRadiusMeters: number
    }
    stationStop?: { from: string; to: string } | null
    fuel?: { before: FuelTankObservation | null; after: FuelTankObservation | null; trend?: keyof typeof fuelTrendLabels; sampleCountAfter?: number } | null
    mileage: {
      measuredAt: string
      kilometers: number
      source: 'VEHICLE_COUNTER' | 'GPS_ESTIMATE' | 'DEVICE_ESTIMATE'
      secondsFromReport: number
      fromStationStop?: boolean
    } | null
  }
}

const options = { skipErrorToast: true }
const url = (id: number) => `/api/fuel/transactions/${id}/verification`

export const fuelVerificationService = {
  async batches(page: number) {
    const { data } = await api.get<{ rows: FuelVerificationBatch[]; hasMore: boolean }>('/api/fuel/imports', {
      ...options, params: { page },
    })
    return data
  },
  async startBatch(importId: number) {
    const { data } = await api.post<{ queued: number }>(`/api/fuel/imports/${importId}/verification`, undefined, options)
    return data
  },
  async latest(id: number, signal?: AbortSignal): Promise<FuelVerification | null> {
    const response = await api.get<FuelVerification>(url(id), { ...options, signal })
    return response.status === 204 ? null : response.data
  },
  async verify(id: number): Promise<FuelVerification> {
    const { data } = await api.post<FuelVerification>(url(id), undefined, options)
    return data
  },
}
