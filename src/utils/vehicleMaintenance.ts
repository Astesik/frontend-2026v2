import type { LiningStatus, TrailerAxle, TrailerWheelReading, VehicleServiceInterval, VehicleServiceSchedule, WheelId, WheelSide } from '@/types/vehicleMaintenance'

export const TRAILER_WHEEL_POSITIONS = ([1, 2, 3] as const).flatMap(axle => (['left', 'right'] as const).map(side => ({ id: `${axle}-${side}` as WheelId, axle, side })))

export function normalizeWheelReadings(readings: readonly TrailerWheelReading[]): TrailerWheelReading[] {
  return TRAILER_WHEEL_POSITIONS.map(position => {
    const reading = readings.find(item => item.axle === position.axle && item.side === position.side)
    const remaining = reading?.liningRemainingPct
    const pressure = reading?.pressureBar
    const timestamp = reading?.lastReadAt
    return {
      ...position,
      liningRemainingPct: typeof remaining === 'number' && Number.isFinite(remaining) && remaining >= 0 && remaining <= 100 ? remaining : null,
      pressureBar: typeof pressure === 'number' && Number.isFinite(pressure) && pressure >= 0 ? pressure : null,
      lastReadAt: timestamp && Number.isFinite(Date.parse(timestamp)) ? timestamp : null,
    }
  })
}

export function liningPercentLabel(remaining: number | null) { return remaining === null ? '—' : `${remaining.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}%` }
export function liningStatus(remaining: number | null): LiningStatus {
  if (remaining === null) return 'unknown'
  if (remaining <= 15) return 'alarm'
  if (remaining <= 30) return 'warning'
  return 'ok'
}
export const liningStatusLabels: Record<LiningStatus, string> = { ok: 'OK', warning: 'Ostrzeżenie', alarm: 'Alarm', unknown: 'Brak danych' }
export function wheelLabel(axle: TrailerAxle, side: WheelSide) { return `Oś ${axle} · ${side === 'left' ? 'lewa' : 'prawa'} strona` }
export function pressureLabel(value: number | null) { return value === null ? '- bar' : `${value.toLocaleString('pl-PL', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} bar` }
export function wheelReadingTime(value: string | null) {
  return value ? new Date(value).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Brak odczytu'
}
export function serviceIntervalRemaining(schedule: VehicleServiceSchedule, interval: VehicleServiceInterval) { return interval.lastServiceKm + interval.intervalKm - schedule.odometerKm }
export function mockWheelReadings(now = new Date()): TrailerWheelReading[] {
  const remaining = [78, 58, 26, 12, 43, null]
  const pressure = [8.1, 7.9, 7.6, 7.4, null, null]
  return TRAILER_WHEEL_POSITIONS.map((position, index) => ({ ...position, liningRemainingPct: remaining[index], pressureBar: pressure[index], lastReadAt: index === 5 ? null : new Date(now.getTime() - (index + 1) * 30_000).toISOString() }))
}
export function mockServiceSchedule(): VehicleServiceSchedule {
  return {
    source: 'mock', odometerKm: 248350,
    intervals: [
      { id: 'periodic', name: 'Obsługa okresowa', lastServiceKm: 210000, intervalKm: 60000 },
      { id: 'running-gear', name: 'Kontrola układu jezdnego', lastServiceKm: 220000, intervalKm: 30000 },
      { id: 'lubrication', name: 'Smarowanie i konserwacja', lastServiceKm: 235000, intervalKm: 15000 },
    ],
  }
}
