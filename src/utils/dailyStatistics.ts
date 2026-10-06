const warningLabels: Record<string, string> = {
  NO_HISTORY: 'Brak dzisiejszej historii',
  INSUFFICIENT_SAMPLES: 'Za mało próbek',
  DEVICE_OR_PROVIDER_CHANGED: 'Zmiana urządzenia lub dostawcy w ciągu dnia',
  DISTANCE_COUNTER_MISSING: 'Brak licznika kilometrów',
  FUEL_COUNTER_MISSING: 'Brak licznika paliwa',
  DISTANCE_COUNTER_RESET: 'Cofnięcie licznika kilometrów',
  FUEL_COUNTER_RESET: 'Cofnięcie licznika paliwa',
  DISTANCE_IMPLAUSIBLE_DELTA: 'Niewiarygodny przyrost kilometrów',
  FUEL_IMPLAUSIBLE_DELTA: 'Niewiarygodny przyrost zużycia paliwa',
}

export function statisticsWarningLabel(code: string) {
  return warningLabels[code] || code
}

export function formatStatisticsMetric(value: number | null | undefined, unit: string, fixedFractionDigits?: number) {
  if (value == null || !Number.isFinite(value)) return 'Brak danych'
  return `${new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: fixedFractionDigits ?? 0,
    maximumFractionDigits: fixedFractionDigits ?? 1,
  }).format(value)} ${unit}`
}

export function formatStatisticsDate(value: string | null | undefined, timezone: string, timeOnly = false) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Brak danych'
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    ...(timeOnly ? {} : { day: '2-digit', month: '2-digit', year: 'numeric' }),
  }
  return new Intl.DateTimeFormat('pl-PL', options).format(new Date(value))
}
import type { DailyVehicleStatistics } from '@/types/dailyStatistics'

export type DailyStatisticsSortKey = 'licensePlate' | 'drivers' | 'distanceKm' | 'fuelUsedLiters' | 'averageFuelConsumptionLPer100Km'

export function sortDailyVehicleStatistics(vehicles: DailyVehicleStatistics[], key: DailyStatisticsSortKey, direction: 'asc' | 'desc') {
  const multiplier = direction === 'asc' ? 1 : -1
  const sortValue = (vehicle: DailyVehicleStatistics) => key === 'drivers'
    ? (vehicle.drivers.length ? vehicle.drivers.map((driver) => driver.driverName || (driver.driverId != null ? `Kierowca #${driver.driverId}` : `Kierowca ${driver.externalId}`)).join(' · ') : null)
    : vehicle[key]
  return [...vehicles].sort((a, b) => {
    const left = sortValue(a)
    const right = sortValue(b)
    if (left == null && right != null) return 1
    if (left != null && right == null) return -1
    const comparison = typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left ?? '').localeCompare(String(right ?? ''), 'pl', { numeric: true })
    return comparison * multiplier || a.licensePlate.localeCompare(b.licensePlate, 'pl', { numeric: true }) || a.vehicleId - b.vehicleId
  })
}

