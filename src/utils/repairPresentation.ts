import type { Repair, RepairStatus } from '@/types/repair'

export const repairStatusOptions: { value: RepairStatus; label: string }[] = [
  { value: 'new', label: 'Nowa' },
  { value: 'ready_to_be_repaired', label: 'Gotowa do naprawy' },
  { value: 'done', label: 'Zakończona' },
]

export function normalizeRepairStatus(status: string | null | undefined): RepairStatus {
  const value = status?.trim().toLowerCase().replace(/-/g, '_')
  if (value === 'done' || value === 'cancelled' || value === 'canceled') return 'done'
  if (value === 'ready_to_be_repaired' || value === 'ready_to_repair'
    || value === 'at_location' || value === 'in_progress' || value === 'inprogress') return 'ready_to_be_repaired'
  return 'new'
}

export function repairStatusLabel(status: string | null | undefined) {
  const value = normalizeRepairStatus(status)
  return repairStatusOptions.find(option => option.value === value)!.label
}

export function repairStatusVariant(status: string | null | undefined): 'neutral' | 'success' | 'warning' {
  const value = normalizeRepairStatus(status)
  if (value === 'done') return 'success'
  return value === 'ready_to_be_repaired' ? 'warning' : 'neutral'
}

export function repairStatusBadgeLabel(repair: Pick<Repair, 'status' | 'currentPlaces'>) {
  const label = repairStatusLabel(repair.status)
  if (normalizeRepairStatus(repair.status) !== 'ready_to_be_repaired') return label

  const places = repair.currentPlaces?.map(place => place.name?.trim()).filter(Boolean)
  return places?.length ? 'W lokalizacji: ' + places.join(', ') : label
}

export function repairPlannedPlacesLabel(repair: Pick<Repair, 'faults' | 'placeName' | 'place'>) {
  const names = new Set((repair.faults || []).map(fault => fault.placeName).filter(Boolean))
  if (names.size) return [...names].join(', ')
  return repair.faults?.length ? 'Do ustalenia' : repair.placeName || repair.place?.name || 'Do ustalenia'
}
