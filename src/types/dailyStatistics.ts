export interface DailyStatisticsDriver {
  driverId: number | null
  externalId: string
  driverName: string | null
  slot: number
  firstSeenAt: string | null
  lastSeenAt: string | null
}

export interface DailyVehicleStatistics {
  vehicleId: number
  licensePlate: string
  type: string
  sampleCount: number
  firstRecordedAt: string | null
  lastRecordedAt: string | null
  distanceKm: number | null
  fuelUsedLiters: number | null
  averageFuelConsumptionLPer100Km: number | null
  drivers: DailyStatisticsDriver[]
  warnings: string[]
}

export interface DailyStatisticsPeriod {
  date: string
  timezone: string
  fromInclusive: string
  toExclusive: string
  calculatedAt: string
}

export interface DailyFleetStatisticsResponse extends DailyStatisticsPeriod {
  vehicles: DailyVehicleStatistics[]
}

export interface DailyVehicleStatisticsResponse extends DailyStatisticsPeriod {
  vehicle: DailyVehicleStatistics
}
