import { api } from './api'

export interface ConsumptionEvidence {
  at: string
  readingId: string
  distanceSource: 'VEHICLE_COUNTER' | 'GPS_ESTIMATE' | 'DEVICE_ESTIMATE'
  odometerKm: number
  canLiters: number | null
}
export interface CounterDecrease {
  counter: 'CAN_FUEL' | 'ODOMETER'
  beforeAt: string
  at: string
  beforeReadingId: string
  readingId: string
  beforeValue: number
  value: number
  decrease: number
  tolerated: boolean
}
export interface Measurement {
  kilometers: number | null
  liters: number | null
  per100Km: number | null
  first: ConsumptionEvidence | null
  last: ConsumptionEvidence | null
  validIntervals: number
  issues: string[]
  counterDecreases?: CounterDecrease[]
  counterDecreaseCount?: number
}
export interface ConsumptionReport {
  version: number
  from: string
  to: string
  can: Measurement
  distance: Measurement
}
export interface DieselPurchase {
  id: number
  at: string
  provider: string
  station: string | null
  quantity: number | null
  unit: string
}
export interface CycleReference { startId: number; endId: number }
export interface ConsumptionPeriod { telemetry: ConsumptionReport; purchases: DieselPurchase[]; reviewed: CycleReference[] }
export interface FuelCycle {
  telemetry: ConsumptionReport
  purchases: DieselPurchase[]
  signature: string
  confirmed: boolean
  validQuantities: boolean
  purchasedLiters: number | null
  fullToFullPer100Km: number | null
  differenceLiters: number | null
}
const base = (vehicle: string) => '/api/fuel/vehicles/' + vehicle + '/consumption'
const cycleUrl = (vehicle: string, start: string, end: string) => base(vehicle) + '/cycles/' + start + '/' + end

export interface AdjustedFuelBoundary {
  visitId: number; refueledAt: string; method: 'STABLE_POST_REFUEL' | 'POST_REFUEL_PEAK'; observing: boolean
  level: { at: string; level: number } | null
}
export interface AdjustedFuelConsumption {
  start: AdjustedFuelBoundary; end: AdjustedFuelBoundary; tankCapacityLiters: number | null
  fuelCorrectionLiters: number | null; adjustedFuelConsumedLiters: number | null; adjustedConsumptionL100km: number | null
  differenceLiters: number | null; differencePercent: number | null; issues: string[]; warnings: string[]
}
export interface AutomaticCycleResult {
  startVisitId: number; endVisitId: number; from: string; to: string; adjacent: boolean; confirmed: boolean
  purchasedLiters: number; distanceKm: number | null; canLiters: number | null
  canPer100Km: number | null; purchasesPer100Km: number | null
  differenceLiters: number | null; differencePercent: number | null
  issues: string[]; legIds: number[]; telemetry: ConsumptionReport; adjusted?: AdjustedFuelConsumption | null
}
export interface AutomaticCycle { id: number; vehicleId: number; licensePlate: string; result: AutomaticCycleResult; calculatedAt: string }
export interface AutomaticCyclePage { rows: AutomaticCycle[]; hasMore: boolean; total: number; confirmed: number; processing: boolean; chart: AutomaticCycle[] }
export interface AutomaticCycleDetail {
  cycle: AutomaticCycle
  purchases: { id: number; at: string; provider: string; station: string; liters: number; included: boolean }[]
}
export const fuelConsumptionService = {
  async fleet(from: string, to: string, adjacent: boolean, page: number, q: string, signal: AbortSignal) {
    return (await api.get<AutomaticCyclePage>('/api/fuel/cycles', {
      params: { from: from || undefined, to: to || undefined, adjacent, page, q }, signal, skipErrorToast: true,
    })).data
  },
  async automatic(vehicle: string, from: string, to: string, adjacent: boolean, page: number, signal: AbortSignal) {
    return (await api.get<AutomaticCyclePage>('/api/fuel/vehicles/' + vehicle + '/cycles', { params: { from, to, adjacent, page }, signal, skipErrorToast: true })).data
  },
  async automaticDetail(vehicle: string, id: number, signal: AbortSignal) {
    return (await api.get<AutomaticCycleDetail>('/api/fuel/vehicles/' + vehicle + '/cycles/' + id, { signal, skipErrorToast: true })).data
  },
  async period(vehicle: string, from: string, to: string, signal: AbortSignal) {
    return (await api.get<ConsumptionPeriod>(base(vehicle), { params: { from, to }, signal, skipErrorToast: true })).data
  },
  async cycle(vehicle: string, start: string, end: string, signal: AbortSignal) {
    return (await api.get<FuelCycle>(cycleUrl(vehicle, start, end), { signal, skipErrorToast: true })).data
  },
  async remove(vehicle: string, start: number, end: number) {
    await api.delete(cycleUrl(vehicle, String(start), String(end)), { skipErrorToast: true })
  },
  async confirm(vehicle: string, start: string, end: string, signature: string, confirmed: boolean) {
    await api.put(cycleUrl(vehicle, start, end) + '/confirmation', { signature, confirmed }, { skipErrorToast: true })
  },
}
