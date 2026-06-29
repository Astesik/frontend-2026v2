export type VehicleStatus = 'moving' | 'idle' | 'offline' | 'service'
export type VehicleType = 'truck' | 'trailer'
export type VehicleAlertKind = 'inspection' | 'tachograph'

export interface ApiVehicle {
  id: number
  licensePlate: string
  vin: string | null
  firstRegistration: string | null
  productionYear: number | null
  make: string | null
  euroClass: string | null
  type: string | null
  ownership: string | null
  ownershipUntil: string | null
  technicalInspection: string | null
  tachographInspection: string | null
  vignetteUk: string | null
  assignedDeviceId: number | null
  fuelTank: number | null
  intermodalSideCode?: string | null
  status: string | null
  lastPositionAt: string | null
}

export interface VehicleGroup {
  id: string
  name: string
  vehiclesCount: number
}

export interface ApiVehicleGroup {
  id: number
  name: string
  vehiclesCount: number
}

export interface VehicleGroupDetails {
  id: string
  name: string
  vehicleIds: string[]
}

export interface ApiVehicleGroupDetails {
  id: number
  name: string
  vehicleIds: number[]
}

export interface PositionDriver {
  tachoid: number
  firstName: string | null
  lastName: string | null
}

export interface ApiLastPosition {
  deviceId: number
  companyId: number
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
  raw: unknown
  driver0: PositionDriver | null
  driver1: PositionDriver | null
}

export interface VehicleLifecycleAlert {
  kind: VehicleAlertKind
  title: string
  dueDate: string
  daysLeft: number
  description: string
}

export interface Vehicle {
  id: string
  backendId: number
  name: string
  plateNumber: string
  model: string
  make: string | null
  vin: string | null
  productionYear: number | null
  euroClass: string | null
  vehicleType: VehicleType
  rawType: string | null
  countryCode: string
  latitude: number
  longitude: number
  hasPosition: boolean
  alertKind?: VehicleAlertKind
  alerts: VehicleLifecycleAlert[]
  driverId?: string
  driverName?: string
  driverTachographId?: string
  status: VehicleStatus
  rawStatus: string | null
  speed: number
  fuelLevel: number
  fuelPct: number | null
  fuelTank: number
  lastUpdate: string
  location: string
  technicalInspection: string | null
  tachographInspection: string | null
  vignetteUk: string | null
  assignedDeviceId: number | null
  ignitionState: string | null
  heading: number | null
  lastPositionAt: string | null
  positionTimestamp: string | null
}

export interface Driver {
  id: string
  name: string
  phone: string
  status: 'available' | 'route' | 'break' | 'offline'
  assignedVehicleId?: string
  tachographId?: string
}

export interface GpsPosition {
  id: string
  vehicleId: string
  vehicleName: string
  coordinates: string
  speed: number
  timestamp: string
  address: string
}

export type FleetAlertType = 'warning' | 'error' | 'info' | 'success'

export interface FleetAlert {
  id: string
  type: FleetAlertType
  title: string
  description: string
  timestamp: string
}

export interface SelectOption {
  id: string | number
  label: string
  value?: string | number
}
