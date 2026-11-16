import type { VignetteStatus } from '@/types/notifications'
import { formatDisplayDate } from './date'

const luxembourgDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Luxembourg',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function luxembourgCalendarDate(instant: number) {
  return luxembourgDate.format(instant)
}

export function luxembourgVignetteStatus(from: string | null, to: string | null, today: string): VignetteStatus {
  if (!from || !to || from > to) return 'missing'
  if (today < from) return 'not_yet_valid'
  if (today > to) return 'expired'
  return 'valid'
}

const luxembourgVignettePresentation = {
  valid: { statusLabel: 'Ważna', variant: 'success' },
  not_yet_valid: { statusLabel: 'Jeszcze nieważna', variant: 'warning' },
  expired: { statusLabel: 'Nieważna', variant: 'error' },
  missing: { statusLabel: 'Brak winiety', variant: 'neutral' },
} as const

export function describeLuxembourgVignette(from: string | null, to: string | null, today: string) {
  const status = luxembourgVignetteStatus(from, to, today)
  return {
    status,
    ...luxembourgVignettePresentation[status],
    dateLabel: status === 'missing' ? null : formatVignettePeriod(from, to),
  }
}

export function formatVignettePeriod(from: string | null | undefined, to: string | null | undefined) {
  if (!to) return '—'
  const end = formatDisplayDate(to)
  return from && from !== to ? `${formatDisplayDate(from)} – ${end}` : end
}
