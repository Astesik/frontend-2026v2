import type { DriverTripRequest, LocalFuelEvent, LocalHistoryPoint } from '@/types/localPositionHistory'
import type { VehicleReturnEntry } from '@/types/vehicleReturn'
export function returnTripRequest(entry: VehicleReturnEntry): DriverTripRequest | null {
  const driver = entry.returnDriver
  if (!entry.tripStartedOn || !Number.isSafeInteger(entry.truck?.id) || entry.truck.id <= 0 || !driver) return null
  if (driver.driverId != null && Number.isSafeInteger(driver.driverId) && driver.driverId > 0) return {vehicle_id:entry.truck.id, started_on:entry.tripStartedOn, driver_id:driver.driverId}
  if (typeof driver.externalId === 'string' && driver.externalId.trim()) return {vehicle_id:entry.truck.id, started_on:entry.tripStartedOn, driver_external_id:driver.externalId}
  return null
}
export function validHistoryPosition(point: {lat:number|null;lon:number|null;positionValid?:boolean}) {
  return point.positionValid !== false && point.lat != null && point.lon != null && Number.isFinite(point.lat) && Number.isFinite(point.lon) && Math.abs(point.lat) <= 90 && Math.abs(point.lon) <= 180
}
export function historySegmentBreak(previous: LocalHistoryPoint, point: LocalHistoryPoint) {
  const gap = Date.parse(point.ts) - Date.parse(previous.ts)
  return previous.deviceId !== point.deviceId || previous.provider !== point.provider || !Number.isFinite(gap) || gap < 0 || gap > 300000
}
export function historyMetric(value: number | null | undefined, unit = '') {
  return value == null || !Number.isFinite(value) ? 'Brak danych' : new Intl.NumberFormat('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value) + (unit ? ' ' + unit : '')
}
export function historyPointSpeed(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(value) + ' km/h'
}
export function historyPointFuel(point: Pick<LocalHistoryPoint, 'fuelLiters' | 'fuelPct'>) {
  const format = (value: number | null | undefined, unit: string) => value == null || !Number.isFinite(value)
    ? ''
    : new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 }).format(value) + unit
  const liters = format(point.fuelLiters, ' l')
  const percent = format(point.fuelPct, '%')
  return liters && percent ? `${liters} (${percent})` : liters || percent
}
export function fuelEventLabel(event: LocalFuelEvent) { return event.type === 'POSSIBLE_REFUEL' ? 'Możliwe tankowanie' : 'Potencjalny ubytek paliwa' }
const warnings: Record<string,string> = {
  PARTIAL_COUNTER_COVERAGE:'Niepełne pokrycie liczników — podsumowanie może obejmować tylko część przejazdu.',
  UNCONFIRMED_FUEL_CHANGE:'Wykryto niepotwierdzoną zmianę poziomu paliwa.',
  FUEL_EVENT_LIMIT_REACHED:'Raport osiągnął limit zdarzeń paliwowych.',
  FIRST_OBSERVATION_NOT_CONFIRMED_CARD_INSERTION:'Pierwszy odczyt karty nie potwierdza momentu jej fizycznego włożenia.',
  WHOLE_VEHICLE_ROUTE_AFTER_DRIVER_START:'Raport obejmuje całą trasę pojazdu od pierwszego odczytu kierowcy, także po późniejszej zmianie kierowcy.',
  IDENTIFIER_WITHOUT_ABSENCE_FLAG:'Obecność karty została ustalona na podstawie identyfikatora, bez jawnej flagi obecności.',
}
export function localHistoryWarning(code: string) { return warnings[code] || 'Ostrzeżenie danych: ' + code }
