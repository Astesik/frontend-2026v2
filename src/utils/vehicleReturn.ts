import type { ReturnDriverSelection, VehicleReturnEntry, VehicleReturnForm, VehicleReturnWrite } from '@/types/vehicleReturn'

export const returnStationOptions = [
  { value: 'PENDING', label: 'Do zrobienia' },
  { value: 'DONE', label: 'Wykonane' },
  { value: 'NOT_REQUIRED', label: 'Nie dotyczy' },
]
export function businessToday(timezone = 'Europe/Warsaw', date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const part = (type: string) => parts.find((item) => item.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
export function returnLocalDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
export function newReturnForm(weekStart: string, entry?: VehicleReturnEntry | null): VehicleReturnForm {
  return {
    weekStart: entry?.weekStart || weekStart,
    truckId: entry ? String(entry.truck.id) : '',
    trailerId: entry?.trailer ? String(entry.trailer.id) : '',
    returnStationStatus: entry?.returnStationStatus || 'PENDING',
    departureStationStatus: entry?.departureStationStatus || 'PENDING',
    notes: entry?.notes || '', tripStartedOn: entry?.tripStartedOn || '',
    returnedAt: returnLocalDateTime(entry?.returnedAt || null),
    returnDriver: entry?.returnDriver ? 'KEEP' : 'CURRENT',
    departureDriver: entry?.departureDriver ? 'KEEP' : 'NONE',
  }
}
export function returnDriverSelection(value: string): ReturnDriverSelection | undefined {
  if (value === 'KEEP') return undefined
  if (value === 'NONE') return { mode: 'NONE' }
  if (value === 'CURRENT') return { mode: 'CURRENT' }
  if (value.startsWith('CURRENT_')) return { mode: 'CURRENT', slot: Number(value.slice(8)) }
  return { mode: 'MANUAL', driverId: Number(value.slice(7)) }
}
export function returnFormWrite(form: VehicleReturnForm, entry?: VehicleReturnEntry | null): VehicleReturnWrite {
  const returnDriver = returnDriverSelection(form.returnDriver)
  const departureDriver = returnDriverSelection(form.departureDriver)
  return {
    weekStart: form.weekStart, truckId: Number(form.truckId), trailerId: form.trailerId ? Number(form.trailerId) : null,
    returnStationStatus: form.returnStationStatus, departureStationStatus: form.departureStationStatus,
    notes: form.notes.trim() || null, tripStartedOn: form.tripStartedOn || null,
    returnedAt: form.returnedAt ? (entry && form.returnedAt === returnLocalDateTime(entry.returnedAt) ? entry.returnedAt : new Date(form.returnedAt).toISOString()) : null,
    ...(returnDriver ? { returnDriver } : {}), ...(departureDriver ? { departureDriver } : {}),
  }
}
export function shiftReturnDate(value: string, days: number) {
  const date = new Date(value + 'T12:00:00Z')
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
export function returnWeekStart(value = businessToday()) {
  const date = new Date(value + 'T12:00:00Z')
  return shiftReturnDate(value, 1 - (date.getUTCDay() || 7))
}
export function returnWeekLabel(start: string) {
  const date = new Date(start + 'T12:00:00Z')
  const thursday = new Date(date)
  thursday.setUTCDate(thursday.getUTCDate() + 3)
  const year = thursday.getUTCFullYear()
  const week = Math.ceil(((thursday.getTime() - Date.UTC(year, 0, 1, 12)) / 86400000 + 1) / 7)
  const format = (value: string) => new Intl.DateTimeFormat('pl-PL', { timeZone: 'UTC', day: '2-digit', month: '2-digit' }).format(new Date(value + 'T12:00:00Z'))
  return `Tydzień ${week}/${year} · ${format(start)}–${format(shiftReturnDate(start, 6))}`
}
export function returnEntryWrite(entry: VehicleReturnEntry): VehicleReturnWrite {
  return {
    weekStart: entry.weekStart, truckId: entry.truck.id, trailerId: entry.trailer?.id ?? null,
    returnStationStatus: entry.returnStationStatus, departureStationStatus: entry.departureStationStatus,
    notes: entry.notes, tripStartedOn: entry.tripStartedOn, returnedAt: entry.returnedAt,
  }
}
