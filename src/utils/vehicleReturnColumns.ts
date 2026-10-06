export const returnColumnDefinitions = [
  { key: 'truck', label: 'Ciągnik', visible: true },
  { key: 'trailer', label: 'Naczepa', visible: true },
  { key: 'returnStation', label: 'Stacja zjazd', visible: true },
  { key: 'returnDriver', label: 'Kierowca zjazd', visible: true },
  { key: 'departureDriver', label: 'Kierowca wyjazd', visible: true },
  { key: 'departureStation', label: 'Stacja wyjazd', visible: true },
  { key: 'started', label: 'Rozpoczęcie trasy', visible: true },
  { key: 'days', label: 'Dni w trasie', visible: true },
  { key: 'notes', label: 'Uwagi', visible: true },
  { key: 'fuel', label: 'Aktualne paliwo', visible: false },
  { key: 'truckInspection', label: 'Przegląd ciągnika', visible: false },
  { key: 'truckTachograph', label: 'Tachograf ciągnika', visible: false },
  { key: 'trailerInspection', label: 'Przegląd naczepy', visible: false },
] as const
export type ReturnColumnKey = typeof returnColumnDefinitions[number]['key']
export interface ReturnColumn { key: ReturnColumnKey; visible: boolean }
const storageKey = 'routewise.vehicleReturns.columns'
export function normalizeReturnColumns(value: unknown): ReturnColumn[] {
  const output: ReturnColumn[] = []
  if (Array.isArray(value)) {
    for (const item of value) {
      if (item && returnColumnDefinitions.some((column) => column.key === item.key) && !output.some((column) => column.key === item.key)) {
        output.push({ key: item.key, visible: typeof item.visible === 'boolean' ? item.visible : true })
      }
    }
  }
  for (const item of returnColumnDefinitions) if (!output.some((column) => column.key === item.key)) output.push({ key: item.key, visible: item.visible })
  return output
}
export function loadReturnColumns(): ReturnColumn[] {
  try { return normalizeReturnColumns(JSON.parse(localStorage.getItem(storageKey) || 'null')) }
  catch { return normalizeReturnColumns(null) }
}
export function saveReturnColumns(columns: ReturnColumn[]) {
  try { localStorage.setItem(storageKey, JSON.stringify(columns)) } catch { /* Storage may be unavailable in private mode. */ }
}
