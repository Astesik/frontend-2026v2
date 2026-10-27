export interface LocalHistoryDriver {
  driverId: number | null
  externalId: string | null
  name: string | null
  slot: number
  valid: boolean | null
  cardInSlot: boolean | null
}
export interface LocalHistoryPoint {
  id: number
  deviceId: number
  vehicleId?: number | null
  provider: string
  ts: string
  lat: number | null
  lon: number | null
  positionValid: boolean
  speedKph: number | null
  heading: number | null
  countryCode: string | null
  ignitionState: string | null
  fuelPct: number | null
  fuelLiters: number | null
  fuelLitersSource: string | null
  totalDistance: number | null
  totalFuel: number | null
  drivers: LocalHistoryDriver[]
}
export interface LocalFuelEvent {
  type: 'POSSIBLE_REFUEL' | 'POSSIBLE_FUEL_LOSS'
  confidence: 'HEURISTIC'
  from: string
  to: string
  detectedAt: string
  lat: number | null
  lng: number | null
  beforeLiters: number | null
  afterLiters: number | null
  observedDeltaLiters: number | null
  estimatedAmountLiters: number | null
  levelSource: string | null
  consumptionAdjusted: boolean
}
export interface LocalHistorySummary {
  sampleCount: number
  firstRecordedAt: string | null
  lastRecordedAt: string | null
  distanceKm: number | null
  distanceSource: 'TOTAL_DISTANCE' | 'GPS_ESTIMATE' | 'UNAVAILABLE'
  fuelUsedLiters: number | null
  consumptionLPer100Km: number | null
  distanceSegments: number
  fuelSegments: number
  rejectedDistanceSegments: number
  rejectedFuelSegments: number
  fuelEvents: LocalFuelEvent[]
  warnings: string[]
}
export interface LocalHistoryCursor { ts: string; id: number }
export interface LocalHistoryRequest {
  vehicle_id: number
  from: string
  to: string
  limit?: number
  includeSummary?: boolean
  cursor?: LocalHistoryCursor
}
export interface LocalHistoryReport {
  source: 'LOCAL_DATABASE'
  vehicleId: number
  licensePlate: string
  timezone: string
  from: string
  to: string
  summary: LocalHistorySummary | null
}
export interface LocalHistoryPage extends LocalHistoryReport {
  result: LocalHistoryPoint[]
  hasMore: boolean
  nextCursor: LocalHistoryCursor | null
}
export type DriverTripRequest = {
  vehicle_id: number
  started_on: string
  to?: string
} & ({driver_id: number; driver_external_id?: never} | {driver_id?: never; driver_external_id: string})
export interface DriverTripReport {
  source: 'LOCAL_DATABASE'
  status: 'RESOLVED' | 'DRIVER_NOT_OBSERVED'
  vehicleId: number
  driverId: number | null
  driverExternalId: string | null
  driverName: string | null
  timezone: string
  startedOn: string
  resolvedFrom: string | null
  to: string
  firstObservedSlot: number | null
  startEvidence: string | null
  possibleContinuation: boolean
  summary: LocalHistorySummary | null
  warnings: string[]
}
