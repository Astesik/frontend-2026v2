import { api } from './api'

export interface ConsumptionEvidence {
  at: string
  readingId: string
  distanceSource: 'VEHICLE_COUNTER' | 'GPS_ESTIMATE' | 'DEVICE_ESTIMATE'
  odometerKm: number
  canLiters: number | null
}
export interface Measurement {
  kilometers: number | null
  liters: number | null
  per100Km: number | null
  first: ConsumptionEvidence | null
  last: ConsumptionEvidence | null
  validIntervals: number
  issues: string[]
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

export const fuelConsumptionService = {
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
