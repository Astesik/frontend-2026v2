import { api } from './api'
import type { FuelGpsStatus } from './fuelVerificationService'

export interface FuelTransactionRow {
  row: number
  provider?: string
  transactionNumber: string
  version: string
  reportedAt: string
  timeResolved: boolean
  maskedCard: string
  cardNumberSuffix?: string | null
  reportedRegistration: string | null
  vehicleId: number | null
  vehiclePlate: string | null
  driverId: number | null
  driverName: string | null
  stationCode: string
  stationName: string | null
  stationKnown: boolean
  country: string | null
  product: string | null
  unit: string
  quantity: number
  amountEur: number | null
  grossUnitEur: number | null
  netAmountEur: number | null
  netUnitEur: number | null
  excise?: { country: string; netAmountEur: number | null; netUnitEur: number | null } | null
  status: 'NEW' | 'DUPLICATE' | 'REVISION' | null
  gpsStatus: FuelGpsStatus | null
}

export interface FuelImportPreview {
  rows: FuelTransactionRow[]
  errors: Array<{ line: number; column: string | null; reason: string }>
}

export interface FuelImportResult {
  importId: number
  saved: number
  duplicates: number
  rejected: number
  queued: number
}

export interface FuelHistoryFilters {
  vehicleId?: number
  importId?: number
  gpsStatus?: string
  q?: string
  from?: string
  to?: string
  fuelType?: string
}

export interface FuelDashboardDay {
  date: string
  dieselLiters: number
  adBlueLiters: number
}

export interface FuelDashboard {
  transactions: number
  toVerify: number | null
  daily: FuelDashboardDay[]
}

const options = { skipErrorToast: true }
async function upload<T>(endpoint: string, file: File) {
  const body = new FormData()
  body.append('file', file)
  const { data } = await api.post<T>(endpoint, body, options)
  return data
}

export const fuelImportService = {
  preview: (file: File) => upload<FuelImportPreview>('/api/fuel/imports/ids/preview', file),
  confirm: (file: File) => upload<FuelImportResult>('/api/fuel/imports/ids', file),
  async dashboard(days: number) {
    const { data } = await api.get<FuelDashboard>('/api/fuel/dashboard', { ...options, params: { days } })
    return data
  },
  async history(page: number, filters: FuelHistoryFilters) {
    const { data } = await api.get<{ rows: FuelTransactionRow[]; hasMore: boolean }>('/api/fuel/transactions', {
      ...options, params: { page, ...filters },
    })
    return data
  },
}
