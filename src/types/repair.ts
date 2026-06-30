export type RepairStatus =
  | 'new'
  | 'planned'
  | 'ready_to_be_repaired'
  | 'in_progress'
  | 'IN_FIELD'
  | 'done'
  | 'cancelled'

export type RepairFaultStatus = 'OPEN' | 'DONE'

export interface RepairVehicleSummary {
  id?: number
  licensePlate?: string | null
}

export interface RepairPlaceSummary {
  id?: number
  name?: string | null
}

export interface RepairFault {
  id: number
  repairId: number
  description: string
  status: RepairFaultStatus
  note: string | null
  assignedMechanicId: number | null
  assignedMechanicFullName: string | null
  performedByMechanicId: number | null
  performedByMechanicFullName: string | null
  resolvedAt: string | null
  repairedAt?: string | null
  updatedAt?: string | null
  createdAt: string
}

export interface RepairComment {
  id: number
  repairId: number
  content: string
  text?: string | null
  createdBy: number | null
  createdByUsername: string | null
  createdAt: string
}

export interface RepairCreatedBy {
  id: number
  username: string | null
}

export type RepairPhotoContentType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

export interface RepairPhoto {
  id: number
  repairId: number
  originalFilename: string
  contentType: RepairPhotoContentType
  sizeBytes: number
  createdAt: string
  uploadedBy: RepairCreatedBy | null
  url: string
}

export interface Repair {
  id: number
  companyId?: number
  vehicleId: number
  vehicleLicensePlate: string | null
  placeId: number | null
  placeName: string | null
  vehicle?: RepairVehicleSummary | null
  place?: RepairPlaceSummary | null
  plannedArrivalAt: string | null
  plannedDepartureAt: string | null
  arrivalTime?: string | null
  departureTime?: string | null
  status: RepairStatus | string
  description: string | null
  createdBy: RepairCreatedBy | null
  createdByUsername?: string | null
  faults: RepairFault[]
  totalFaults: number
  doneFaults: number
  comments?: RepairComment[]
  photos: RepairPhoto[]
}

export interface RepairWeek {
  year: number
  week: number
  start: string
  end: string
  repairs: Repair[]
}

export interface RepairWeeksResponse {
  fieldAndUnassigned: Repair[]
  weeks: RepairWeek[]
}

export interface RepairPayload {
  vehicleId: number
  placeId: number
  plannedArrivalAt: string | null
  plannedDepartureAt: string | null
  status: RepairStatus
  description: string | null
}

export interface RepairUpdatePayload {
  placeId?: number | null
  plannedArrivalAt?: string | null
  plannedDepartureAt?: string | null
  status?: RepairStatus
  description?: string | null
}

export interface RepairFaultPayload {
  description: string
  assignedMechanicId: number | null
}

export interface RepairFaultUpdatePayload {
  description?: string
  assignedMechanicId?: number | null
  status?: 'open' | 'done'
  note?: string | null
  completedByMechanicId?: number | null
}

export interface Mechanic {
  id: number
  companyId?: number
  firstName: string
  lastName?: string | null
  fullName: string
}

export interface PlaceSelectItem {
  id: number
  name: string
}
