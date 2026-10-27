import type { FuelStation } from '@/types/fuelStation'
export function validateStationImport(file: Pick<File, 'name' | 'size'>) {
  if (!/\.xlsx$/i.test(file.name)) return 'Wybierz plik XLSX. Formaty XLS, XLSM i CSV nie są obsługiwane.'
  if (!file.size) return 'Plik jest pusty.'
  return file.size > 5 * 1024 * 1024 ? 'Plik może mieć maksymalnie 5 MB.' : null
}
export function formatFuelPrice(value: number | null | undefined, currency?: string | null) {
  if (value == null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value) + (currency ? ' ' + currency : '')
}
export function hasStationLocation(station: FuelStation) {
  return typeof station.lat === 'number' && typeof station.lng === 'number' && Number.isFinite(station.lat) && Number.isFinite(station.lng) && Math.abs(station.lat) <= 90 && Math.abs(station.lng) <= 180
}
export interface FuelStationMapFilters { countries: string[] | null; currency: string; minPrice: string; maxPrice: string }

// null selects all countries, including new ones; an empty array selects none.
export function readFuelStationMapPreferences(value: unknown): FuelStationMapFilters & { enabled: boolean } {
  const defaults = { enabled: false, countries: null, currency: 'EUR', minPrice: '', maxPrice: '' }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults
  const saved = value as Record<string, unknown>
  let countries: string[] | null = null
  if (Array.isArray(saved.countries) && saved.countries.every(country => typeof country === 'string')) {
    countries = [...new Set((saved.countries as string[]).map(country => country.trim()).filter(Boolean))]
  } else if (!('countries' in saved) && typeof saved.country === 'string' && saved.country.trim()) {
    countries = [saved.country.trim()]
  }
  return {
    enabled: saved.enabled === true,
    countries,
    currency: typeof saved.currency === 'string' && saved.currency.trim() ? saved.currency : defaults.currency,
    minPrice: typeof saved.minPrice === 'string' ? saved.minPrice : '',
    maxPrice: typeof saved.maxPrice === 'string' ? saved.maxPrice : '',
  }
}
export function filterMapFuelStations(stations: FuelStation[], filters: FuelStationMapFilters) {
  const min = filters.minPrice.trim() === '' ? null : Number(filters.minPrice)
  const max = filters.maxPrice.trim() === '' ? null : Number(filters.maxPrice)
  const priceFilter = min !== null || max !== null
  const countries = filters.countries === null ? null : new Set(filters.countries)
  if ((min !== null && (!Number.isFinite(min) || min < 0)) || (max !== null && (!Number.isFinite(max) || max < 0)) || (min !== null && max !== null && min > max)) return []
  return stations.filter((station) => {
    if (station.active === false || !hasStationLocation(station) || (countries !== null && !countries.has(station.country))) return false
    if (!priceFilter) return true
    const price = station.latestPrice
    if (!filters.currency || !price || price.currency !== filters.currency || price.priceFinal == null || !Number.isFinite(price.priceFinal)) return false
    return (min === null || price.priceFinal >= min) && (max === null || price.priceFinal <= max)
  })
}
