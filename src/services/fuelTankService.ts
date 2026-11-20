import { api } from './api'

export type FuelTankSlot = 'LEFT' | 'RIGHT' | 'ADBLUE'
export interface FuelTank {
  slot: FuelTankSlot
  product: 'DIESEL' | 'ADBLUE'
  nominalCapacityLiters: number
  usableCapacityLiters: number | null
}
export interface FuelTankProfile {
  id: number
  validFrom: string
  validTo: string | null
  connection: 'CONNECTED' | 'SEPARATE' | 'UNKNOWN'
  levelSource: 'CAN' | 'UNKNOWN'
  levelTank: 'LEFT' | 'RIGHT' | 'UNKNOWN'
  tanks: FuelTank[]
}
export interface FuelTankObservation {
  source: { recordedAt: string; provider: string; readingId: string }
  percent: number | null
  totalFuelConsumedLiters: number | null
  estimate: {
    profileId: number | null
    tank: FuelTankSlot | null
    estimatedLiters: number | null
    reason: string
  }
}
export interface FuelTankView {
  profiles: FuelTankProfile[]
  quality: {
    from: string
    to: string
    samples: number
    withFuelLevel: number
    withCanConsumption: number
    latest: FuelTankObservation | null
    ageSeconds: number | null
  } | null
}

export const fuelTankService = {
  async view(vehicleId: number) {
    const { data } = await api.get<FuelTankView>(`/api/fuel/vehicles/${vehicleId}/tanks`, { skipErrorToast: true })
    return data
  },
  async save(vehicleId: number, profile: Omit<FuelTankProfile, 'id' | 'validTo'> & { previousId: number | null }) {
    await api.post(`/api/fuel/vehicles/${vehicleId}/tanks`, profile, { skipErrorToast: true })
  },
}
