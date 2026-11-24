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
  documentPrices?: Omit<E100Amounts, 'quantity'> | null
  excise?: { country: string; netAmountEur: number | null; netUnitEur: number | null } | null
  status: 'NEW' | 'DUPLICATE' | 'REVISION' | null
  gpsStatus: FuelGpsStatus | null
}

export interface FuelImportPreview {
  skippedZero?: number
  rows: FuelTransactionRow[]
  errors: Array<{ line: number; column: string | null; reason: string }>
}

export interface EurowagImportPreview {
  rows: Array<{ row: number; status: 'NEW' | 'DUPLICATE' }>
  errors: FuelImportPreview['errors']
  skippedZero: number
}

export interface As24ImportPreview {
  rows: Array<{ row: number; status: 'NEW' | 'DUPLICATE' | 'REVIEW'; transactionNumber?: string }>
  errors: FuelImportPreview['errors']
  skippedZero: number
}

export interface E100Amounts {
  quantity: number
  currency: string
  unitNet: number
  unitGross: number
  net: number
  gross: number
}
export interface E100PreviewRow {
  line: number
  at: string
  suffix: string
  registration: string | null
  vehicle: string | null
  cardConflict: boolean
  stationCode: string
  station: string | null
  stationKnown: boolean
  country: string
  product: string
  productType: 'DIESEL' | 'ADBLUE' | 'OTHER'
  unit: string | null
  amounts: E100Amounts
  status: 'NEW' | 'DUPLICATE' | 'REVIEW'
  previous: E100Amounts | null
}
export interface E100Preview {
  skippedZero?: number
  cards: number
  rows: E100PreviewRow[]
  errors: Array<{ line: number; reason: string }>
}

export interface FuelImportResult {
  skippedZero?: number
  importId: number
  saved: number
  duplicates: number
  rejected: number
  queued: number
}

export interface FuelHistoryTotals { total: number; toVerify: number | null }

export interface FuelHistoryFilters {
  vehicleId?: number
  importId?: number
  gpsStatus?: string
  q?: string
  from?: string
  to?: string
  fuelType?: string
  fuelTypes?: string
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
  previewAs24: (file: File) => upload<As24ImportPreview>('/api/fuel/imports/as24/preview', file),
  confirmAs24: (file: File) => upload<FuelImportResult>('/api/fuel/imports/as24', file),
  previewEurowag: (file: File) => upload<EurowagImportPreview>('/api/fuel/imports/eurowag/preview', file),
  confirmEurowag: (file: File) => upload<FuelImportResult>('/api/fuel/imports/eurowag', file),
  previewE100: (file: File) => upload<E100Preview>('/api/fuel/imports/e100/preview', file),
  confirmE100: (file: File) => upload<FuelImportResult>('/api/fuel/imports/e100', file),
  preview: (file: File) => upload<FuelImportPreview>('/api/fuel/imports/ids/preview', file),
  confirm: (file: File) => upload<FuelImportResult>('/api/fuel/imports/ids', file),
  async dashboard(days: number) {
    const { data } = await api.get<FuelDashboard>('/api/fuel/dashboard', { ...options, params: { days } })
    return data
  },
  async history(page: number, filters: FuelHistoryFilters) {
    const { data } = await api.get<{ rows: FuelTransactionRow[]; hasMore: boolean; totals: FuelHistoryTotals | null }>('/api/fuel/transactions', {
      ...options, params: { page, ...filters },
    })
    return { ...data, rows: data.rows.filter(row => !(row.unit?.trim().toUpperCase() === 'L' && row.quantity === 0)) }
  },
}
