export function parseDateValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

export function toDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseTypedDate(value: string): string | null {
  const text = value.trim()
  if (!text) return ''
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text)
  const local = /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/.exec(text)
  const compact = /^(\d{2})(\d{2})(\d{4})$/.exec(text)
  const match = iso || local || compact
  if (!match) return null
  const year = Number(iso ? match[1] : match[3])
  const month = Number(match[2])
  const day = Number(iso ? match[3] : match[1])
  if (year < 1000 || year > 9999) return null
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? toDateValue(date) : null
}

export function formatDisplayDate(value: string) {
  const date = parseDateValue(value)
  return date ? date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : value
}
