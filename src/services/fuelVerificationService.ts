import { api } from './api'

export type FuelVerificationStatus = 'AT_STATION' | 'LOCATION_MISMATCH' | 'INCONCLUSIVE' | 'NO_GPS'
  | 'NO_STATION_COORDINATES' | 'UNASSIGNED' | 'UNRESOLVED_TIME'

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
    mileage: {
      measuredAt: string
      kilometers: number
      source: 'VEHICLE_COUNTER' | 'GPS_ESTIMATE' | 'DEVICE_ESTIMATE'
      secondsFromReport: number
    } | null
  }
}

const options = { skipErrorToast: true }
const url = (id: number) => `/api/fuel/transactions/${id}/verification`

export const fuelVerificationService = {
  async latest(id: number): Promise<FuelVerification | null> {
    const response = await api.get<FuelVerification>(url(id), options)
    return response.status === 204 ? null : response.data
  },
  async verify(id: number): Promise<FuelVerification> {
    const { data } = await api.post<FuelVerification>(url(id), undefined, options)
    return data
  },
}
