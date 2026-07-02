export type DeviceType = 'NEW' | 'TRUCK' | 'TRAILER' | 'CAR'
export type DeviceStatus = 'ACTIVE' | 'INACTIVE'
export type DeviceProvider = 'LOCAL' | 'GPS_ONLINE' | 'FLESPI' | 'ABERG'

export interface DeviceListItem {
  id: number
  deviceName: string | null
  type: DeviceType
  status: DeviceStatus
  serialNumber: string
  provider: DeviceProvider
  externalId: string | null
  companyIntegrationId: number | null
  createdAt: string | null
  assignedToVehicle: boolean
  lastPositionAt: string | null
}

export interface DeviceDetails extends DeviceListItem {
  companyId: number
}

export interface DevicePatchPayload {
  deviceName?: string | null
  type?: DeviceType
  status?: DeviceStatus
  externalId?: string | null
  companyIntegrationId?: number | null
}

export interface DeviceListParams {
  status?: DeviceStatus
  type?: DeviceType
  q?: string
}

export interface DeviceSelectItem {
  id: number
  deviceName: string
  assigned: boolean
}
