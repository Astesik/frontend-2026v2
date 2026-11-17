import { api } from './api'

export interface FuelTransactionRow {
  row: number
  transactionNumber: string
  version: string
  reportedAt: string
  timeResolved: boolean
  maskedCard: string
  reportedRegistration: string | null
  vehicleId: number | null
  vehiclePlate: string | null
  stationCode: string
  stationName: string | null
  stationKnown: boolean
  country: string | null
  product: string | null
  unit: string
  quantity: number
  amountEur: number | null
  status: 'NEW' | 'DUPLICATE' | 'REVISION' | null
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
  async history(page: number, vehicleId?: number) {
    const { data } = await api.get<{ rows: FuelTransactionRow[]; hasMore: boolean }>('/api/fuel/transactions', {
      ...options, params: { page, vehicleId },
    })
    return data
  },
}
