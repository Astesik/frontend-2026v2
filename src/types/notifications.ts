export interface CompanyMailSettings {
  companyId: number | null
  enabled: boolean
  host: string
  port: number
  username: string
  passwordConfigured: boolean
  fromEmail: string
  authEnabled: boolean
  starttlsEnabled: boolean
}

export interface CompanyMailSettingsPayload {
  enabled: boolean
  host: string
  port: number
  username: string
  password?: string | null
  fromEmail: string
  authEnabled: boolean
  starttlsEnabled: boolean
}

export type CountryEventType = 'country_entry' | 'vignette_check'
export type CountryVehicleScope = 'all' | 'trucks' | 'trailers'
export type VignetteStatus = 'valid' | 'missing' | 'expired'

export interface CountryEventRule {
  id: number
  countryCode: string
  eventType: CountryEventType
  vehicleScope: CountryVehicleScope
  enabled: boolean
  recipients: string[]
}

export type CountryEventRulePayload = Omit<CountryEventRule, 'id'>

export interface CountryEventHistoryItem {
  id?: number
  eventType: CountryEventType
  previousCountryCode: string | null
  countryCode: string
  vehicleId?: number | null
  vehicleLicensePlate?: string | null
  vignetteStatus: VignetteStatus | null
  vignetteValidUntil: string | null
  notificationRecipients: string[]
  createdAt?: string | null
  occurredAt?: string | null
}

export interface PageResult<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}
