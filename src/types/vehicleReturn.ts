export type ReturnStationStatus = 'PENDING' | 'DONE' | 'NOT_REQUIRED'
export type ReturnCreatedBy = number | { id: number; username?: string | null; firstName?: string | null; lastName?: string | null } | null
export type ReturnDriverSelection = { mode: 'CURRENT'; slot?: number } | { mode: 'MANUAL'; driverId: number } | { mode: 'NONE' }
export interface ReturnDriver {
  driverId: number | null
  externalId: string | null
  name: string | null
  slot: number | null
  source: 'CURRENT' | 'MANUAL'
  observedAt: string | null
}
export interface ReturnRepair {
  createdBy?: ReturnCreatedBy
  createdByUsername?: string | null
  id: number
  status: string
  description: string | null
  placeId: number | null
  placeName: string | null
  plannedArrivalAt: string | null
  plannedDepartureAt: string | null
  faults: { id: number; repairId: number; description: string; status: string; note: string | null }[]
}
export interface ReturnVehicle {
  id: number
  licensePlate: string
  type: string
  status: string
  technicalInspection: string | null
  tachographInspection: string | null
  currentFuel: { percent: number | null; liters: number | null; observedAt: string | null }
  currentDrivers: ReturnDriver[]
  activeRepairs: ReturnRepair[]
}
export interface ReturnPreview { truck: ReturnVehicle; trailer: ReturnVehicle | null }
export interface VehicleReturnEntry extends ReturnPreview {
  id: number
  version: number
  weekStart: string
  returnDriver: ReturnDriver | null
  departureDriver: ReturnDriver | null
  returnStationStatus: ReturnStationStatus
  departureStationStatus: ReturnStationStatus
  notes: string | null
  tripStartedOn: string | null
  returnedAt: string | null
  daysOnRoad: number | null
  createdBy: ReturnCreatedBy
  createdByUsername?: string | null
  updatedBy: number | null
  createdAt: string
  updatedAt: string
}
export interface VehicleReturnWrite {
  weekStart: string
  truckId: number
  trailerId: number | null
  returnStationStatus: ReturnStationStatus
  departureStationStatus: ReturnStationStatus
  notes: string | null
  tripStartedOn: string | null
  returnedAt: string | null
  returnDriver?: ReturnDriverSelection
  departureDriver?: ReturnDriverSelection
}
export interface VehicleReturnWeek {
  weekStart: string
  weekEnd: string
  weekYear: number
  weekNumber: number
  timezone: string
  entries: VehicleReturnEntry[]
}
export interface VehicleReturnForm {
  weekStart: string
  truckId: string
  trailerId: string
  returnStationStatus: ReturnStationStatus
  departureStationStatus: ReturnStationStatus
  notes: string
  tripStartedOn: string
  returnedAt: string
  returnDriver: string
  departureDriver: string
}
