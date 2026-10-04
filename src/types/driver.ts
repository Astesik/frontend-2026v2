export type DriverStatus = 'ACTIVE' | 'INACTIVE'

export interface DriverListItem {
  id: number
  companyId: number
  tachoid: number
  status: DriverStatus
  firstName: string | null
  lastName: string | null
  fullName: string | null
}

export interface DriverSelectItem {
  id: number
  label: string | null
  status: DriverStatus
}

export interface DriverPatchPayload {
  firstName?: string
  lastName?: string
  status?: DriverStatus
  tachoid?: number
}
