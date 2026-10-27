import { businessToday, returnWeekStart, shiftReturnDate } from './vehicleReturn'

export const HISTORY_TIMEZONE = 'Europe/Warsaw'
const formatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: HISTORY_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})

export function historyLocalValue(date: Date) {
  const parts = formatter.formatToParts(date)
  const part = (type: string) => parts.find(p => p.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}

// Intl supplies the zone offsets; matching candidates also rejects nonexistent DST times.
export function historyLocalInstant(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value)
  if (!match) throw new Error('Wybierz poprawną datę i godzinę.')
  const [, year, month, day, hour, minute, second = '00'] = match
  const wall = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))
  const expected = `${year}-${month}-${day}T${hour}:${minute}:${second}`
  const wallString = (date: Date) => {
    const parts = formatter.formatToParts(date)
    const part = (type: string) => parts.find(p => p.type === type)!.value
    return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}`
  }
  const offsets = new Set<number>()
  for (const delta of [-36, 0, 36]) {
    const sample = new Date(wall + delta * 3600000)
    const zoned = wallString(sample)
    offsets.add(Date.parse(zoned + 'Z') - sample.getTime())
  }
  const candidates = [...offsets].map(offset => new Date(wall - offset)).filter(date => wallString(date) === expected)
  if (!candidates.length) throw new Error('Ta data lub godzina nie istnieje w strefie Europe/Warsaw. Sprawdź zmianę czasu.')
  return new Date(Math.min(...candidates.map(date => date.getTime())))
}

export function todayHistoryRange(now = new Date()) {
  return { from: historyLocalInstant(`${businessToday(HISTORY_TIMEZONE, now)}T00:00`).toISOString(), to: now.toISOString() }
}

export function historyPresetRange(preset: string, now = new Date()) {
  const today = businessToday(HISTORY_TIMEZONE, now)
  let from = today, to: string | null = null
  if (preset === 'yesterday') { from = shiftReturnDate(today, -1); to = today }
  else if (preset === 'current-week') from = returnWeekStart(today)
  else if (preset === 'previous-week') { to = returnWeekStart(today); from = shiftReturnDate(to, -7) }
  else if (preset === 'current-month') from = today.slice(0, 7) + '-01'
  else if (preset === 'previous-month') {
    to = today.slice(0, 7) + '-01'
    from = shiftReturnDate(to, -1).slice(0, 7) + '-01'
  }
  return { from: historyLocalInstant(`${from}T00:00`), to: to ? historyLocalInstant(`${to}T00:00`) : now }
}

export function validateHistoryRange(from: Date, to: Date, now = Date.now()) {
  if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime())) throw new Error('Wybierz poprawny zakres dat.')
  if (from >= to) throw new Error('Data „Od” musi być wcześniejsza niż data „Do”.')
  if (to.getTime() > now + 60000) throw new Error('Data „Do” nie może być w przyszłości.')
  if (to.getTime() - from.getTime() > 180 * 86400000) throw new Error('Historia może obejmować maksymalnie 180 dni.')
}
