export interface FuelStationProvider { code: string; importSupported: boolean }
export interface FuelStationCountry { country: string; stationCount: number }
export interface FuelStationPrice {
  id: number
  priceDate: string
  vat: number | null
  priceBase: number | null
  priceFinal: number | null
  currency: string | null
}
export interface FuelStation {
  id: number
  active: boolean
  provider: string
  stationCode: string
  stationName: string
  country: string
  lat: number | null
  lng: number | null
  latestPrice: FuelStationPrice | null
}
export interface FuelStationSearch { provider?: string | null; country?: string | null; q?: string | null; active?: boolean | null; page: number; size: number }
export interface FuelStationActiveResult { active: boolean; requestedCount: number; updatedCount: number; stationIds: number[] }
export interface FuelStationPage { items: FuelStation[]; totalElements: number; page: number; size: number }
export interface FuelStationWrite { provider?: string; stationCode: string; stationName: string; country: string; lat: number | null; lng: number | null }
export interface FuelStationImportIssue { row: number; outletCode: string | null; message: string }
export interface FuelStationImportResult {
  provider: string
  totalRows: number
  acceptedRows: number
  createdStations: number
  insertedPrices: number
  updatedPrices: number
  unchangedPrices: number
  duplicateRows: number
  skippedInvalidRows: number
  warnings: FuelStationImportIssue[]
  errors: FuelStationImportIssue[]
}
