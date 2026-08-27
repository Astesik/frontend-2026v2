export function readPersistedStringArray(key: string, fallback: string[], allowedValues: readonly string[]) {
  if (typeof window === 'undefined') return [...fallback]

  try {
    const storedValue = window.localStorage.getItem(key)
    if (storedValue === null) return [...fallback]

    const parsedValue = JSON.parse(storedValue)
    if (!Array.isArray(parsedValue)) return [...fallback]

    const allowed = new Set(allowedValues)
    return Array.from(new Set(parsedValue.filter((value): value is string => (
      typeof value === 'string' && allowed.has(value)
    ))))
  } catch {
    return [...fallback]
  }
}

export function persistStringArray(key: string, value: string[]) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Filtry nadal działają w bieżącej sesji, gdy localStorage jest niedostępny.
  }
}
