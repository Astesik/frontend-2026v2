import type { FuelRouteSettings } from '@/types/fuelRoute'
export const DEFAULT_FUEL_ROUTE_SETTINGS: FuelRouteSettings = { providers: [], priceDate: '', corridorMeters: 5000, maxPriceAgeDays: 2, priceType: 'FINAL', limit: 3, consumptionDays: 7, reservePercent: 10, maxFuelAgeMinutes: 60 }
export const FUEL_ROUTE_NUMERIC_FIELDS = [
  { key: 'corridorMeters', label: 'Korytarz trasy (m)', min: 100, max: 20000 },
  { key: 'maxPriceAgeDays', label: 'Maks. wiek ceny (dni)', min: 0, max: 30 },
  { key: 'limit', label: 'Propozycje na walutę', min: 1, max: 20 },
  { key: 'consumptionDays', label: 'Historia spalania (dni)', min: 1, max: 90 },
  { key: 'reservePercent', label: 'Rezerwa zbiornika (%)', min: 0, max: 50 },
  { key: 'maxFuelAgeMinutes', label: 'Maks. wiek paliwa (min)', min: 1, max: 1440 },
] as const
export function validateFuelRouteSettings(settings: FuelRouteSettings) {
  for (const field of FUEL_ROUTE_NUMERIC_FIELDS) { const value = settings[field.key]; if (!Number.isInteger(value) || value < field.min || value > field.max) return `${field.label}: podaj wartość od ${field.min} do ${field.max}.` }
  if (!Array.isArray(settings.providers) || settings.providers.some(p => !['IDS', 'EUROWAG', 'E100', 'AS24'].includes(p))) return 'Nieprawidłowy dostawca stacji.'
  if (!['BASE', 'FINAL'].includes(settings.priceType)) return 'Nieprawidłowy typ ceny.'
  if (typeof settings.priceDate !== 'string' || (settings.priceDate && (!/^\d{4}-\d{2}-\d{2}$/.test(settings.priceDate) || Number.isNaN(Date.parse(settings.priceDate)) || new Date(settings.priceDate).toISOString().slice(0, 10) !== settings.priceDate))) return 'Podaj poprawną datę ceny.'
  return ''
}
export function fuelNumber(value: number | null | undefined, unit = '') { return value == null || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(value) + (unit ? ` ${unit}` : '') }
const messages: Record<string, string> = {
  PROXIMITY_ONLY_NO_DETOUR_CHECK: 'Odległość od trasy jest geometryczna. Dojazd, objazd i dostępność stacji dla ciężarówki nie są sprawdzane.', STALE_FUEL_READING: 'Odczyt paliwa jest zbyt stary, aby oszacować zasięg.', MISSING_VALID_DAILY_CONSUMPTION: 'Brakuje wiarygodnych dziennych raportów spalania.', SPARSE_CONSUMPTION_HISTORY: 'Oszacowanie bazuje na niewielkiej liczbie dni.', ROUTE_START_TOO_FAR_FROM_VEHICLE: 'Początek trasy jest zbyt daleko od pojazdu. Zasięg jest nieznany.', STATIONS_WITH_STALE_PRICES: 'Niektóre stacje mają zbyt stare ceny.', NO_ELIGIBLE_PRICE_QUOTES: 'Brak cen kwalifikujących się do rankingu.', NO_REACHABLE_PRICED_STATIONS: 'Brak stacji z ceną w szacowanym zasięgu.', PRICES_RANKED_SEPARATELY_BY_CURRENCY: 'Ceny porównujemy osobno dla każdej waluty.', PRICE_DATE_DIFFERS_FROM_CURRENT_FUEL_DATE: 'Data cen różni się od daty aktualnego paliwa.', STATIONS_WITHOUT_PRICES: 'Niektóre stacje nie mają cen.', STATIONS_WITH_UNKNOWN_CURRENCY_OR_VAT: 'Niektóre ceny nie mają waluty lub VAT.', STATIONS_WITH_INVALID_PRICES: 'Niektóre ceny nie kwalifikują się do rankingu.', DAILY_REPORTS_EXCLUDED_FROM_ESTIMATE: 'Nie wszystkie raporty dzienne spełniają warunki oszacowania.', MISSING_FUEL_TANK_CAPACITY: 'Brak pojemności zbiornika.', MISSING_VALID_FUEL_LEVEL: 'Brak poprawnego poziomu paliwa.', MISSING_FUEL_OBSERVATION_TIME: 'Brak czasu odczytu paliwa.', FUTURE_FUEL_OBSERVATION: 'Odczyt paliwa ma datę z przyszłości.', MISSING_VALID_VEHICLE_LOCATION: 'Brak poprawnej pozycji pojazdu.', SMALL_ORIGIN_OFFSET_NOT_INCLUDED_IN_RANGE: 'Trasa zaczyna się w pobliżu pojazdu, ale odległość do jej początku nie została odjęta od zasięgu.'
}
export function fuelRouteWarning(code: string) { return messages[code] || `Ostrzeżenie backendu: ${code}` }
