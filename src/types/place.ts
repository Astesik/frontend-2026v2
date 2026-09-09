export interface Place {
  id: number
  name: string
  city: string | null
  latitude: number
  longitude: number
  radiusMeters: number
  phone: string | null
  email: string | null
  description: string | null
  visible: boolean
  color: string
  eventRules: PlaceEventRule[]
}

export interface PlacePayload {
  name: string
  city: string | null
  latitude: number
  longitude: number
  radiusMeters: number
  phone: string | null
  email: string | null
  description: string | null
  visible: boolean
  color: string
}

export type PlaceUpdatePayload = Partial<PlacePayload>

export type PlaceEventRuleType = 'email_notification' | 'repair_status_change'
export type PlaceVehicleScope = 'all' | 'trucks' | 'trailers'

export interface PlaceEventRule {
  id: number
  placeId: number
  eventType: PlaceEventRuleType
  vehicleScope: PlaceVehicleScope
  enabled: boolean
  recipients: string[]
  createdAt: string | null
  updatedAt: string | null
}

export interface PlaceVehicleEvent {
  id?: number
  eventType: 'entry' | 'exit'
  vehicleId?: number | null
  vehicleLicensePlate?: string | null
  vehicle?: { id?: number | null; licensePlate?: string | null } | null
  position?: { lat?: number | null; lon?: number | null } | null
  changedRepair?: { id?: number | null; status?: string | null } | null
  notificationRecipients: string[]
  createdAt?: string | null
  occurredAt?: string | null
}

export interface PlaceVehicleInside {
  vehicleId: number
  licensePlate: string
  vehicleType: string | null
  make: string | null
  deviceId: number | null
  enteredAt: string | null
  timeInZoneSeconds: number
  lastPositionAt: string | null
  positionAgeSeconds: number
}

export interface PlaceVehiclesInsideResponse {
  placeId: number
  placeName: string
  generatedAt: string
  vehicleCount: number
  vehicles: PlaceVehicleInside[]
}
