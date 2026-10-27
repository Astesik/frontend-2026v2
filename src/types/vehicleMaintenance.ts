export type TrailerAxle = 1 | 2 | 3
export type WheelSide = 'left' | 'right'
export type WheelId = `${TrailerAxle}-${WheelSide}`
export type LiningStatus = 'ok' | 'warning' | 'alarm' | 'unknown'

export interface TrailerWheelReading {
  id: WheelId
  axle: TrailerAxle
  side: WheelSide
  liningRemainingPct: number | null
  pressureBar: number | null
  lastReadAt: string | null
}

export interface TrailerTelemetry {
  wheels: TrailerWheelReading[]
  source: 'mock' | 'api'
}

export type WheelReadingsLoader = (vehicleId: string) => Promise<readonly TrailerWheelReading[]>

export interface VehicleServiceInterval {
  id: string
  name: string
  lastServiceKm: number
  intervalKm: number
}

export interface VehicleServiceSchedule {
  odometerKm: number
  intervals: VehicleServiceInterval[]
  source: 'mock'
}
