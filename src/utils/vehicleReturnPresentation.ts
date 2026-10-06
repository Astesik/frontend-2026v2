import type { ReturnCreatedBy, ReturnVehicle } from '@/types/vehicleReturn'
import { businessToday } from './vehicleReturn'
import type { ApiVehicle } from '@/types/fleet'

export function returnVehicleOptions(catalog: ApiVehicle[], type: string, current?: ReturnVehicle | null) {
  const options = catalog
    .filter((vehicle) => vehicle.type === type && (String(vehicle.status).toUpperCase() === 'ACTIVE' || vehicle.id === current?.id))
    .map((vehicle) => ({ value: String(vehicle.id), label: vehicle.licensePlate }))
  if (current && !options.some((item) => item.value === String(current.id))) options.push({ value: String(current.id), label: current.licensePlate })
  return options.sort((a, b) => a.label.localeCompare(b.label, 'pl', { numeric: true }))
}

export function returnDeadlineDays(date: string | null | undefined, timezone: string) {
  if (!date) return null
  const days = (Date.parse(date + 'T12:00:00Z') - Date.parse(businessToday(timezone) + 'T12:00:00Z')) / 86400000
  return Number.isFinite(days) ? Math.round(days) : null
}
export function returnDeadlineColor(days: number | null) {
  if (days !== null && days < 15) return 'text-danger-600 dark:text-danger-400'
  if (days !== null && days < 30) return 'text-warning-600 dark:text-warning-400'
  return 'text-ui-text-secondary'
}
export function returnDeadlineLabel(days: number | null) {
  if (days === null) return 'Brak terminu'
  if (days < 0) return `${Math.abs(days)} dni po terminie`
  return days === 0 ? 'Termin dzisiaj' : `Pozostało ${days} dni`
}
export function returnDeadlines(vehicle: ReturnVehicle, timezone: string) {
  return [
    { key: 'technicalInspection', label: 'Przegląd techniczny', date: vehicle.technicalInspection },
    ...(vehicle.type.toUpperCase() === 'TRAILER' ? [] : [{ key: 'tachographInspection', label: 'Legalizacja tachografu', date: vehicle.tachographInspection }]),
  ].map((field) => ({ ...field, days: returnDeadlineDays(field.date, timezone) }))
}
export function returnCreatorLabel(createdBy: ReturnCreatedBy | undefined, username?: string | null) {
  if (username) return username
  if (createdBy && typeof createdBy === 'object') {
    return [createdBy.firstName, createdBy.lastName].filter(Boolean).join(' ') || createdBy.username || `Użytkownik #${createdBy.id}`
  }
  return createdBy != null ? `Użytkownik #${createdBy}` : '—'
}
