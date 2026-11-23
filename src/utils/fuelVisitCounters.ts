import type { ActivityPoint } from '@/services/fuelVisitService'

export function visitCounters(points: ActivityPoint[], anchor: number, at: number) {
  function delta(key: 'distanceKm' | 'consumedLiters') {
    if (at < anchor) return null
    const baseline = points.filter(point => {
      const time = Date.parse(point.at)
      return time <= anchor && time >= anchor - 32 * 60000 && point[key] != null
    }).at(-1)
    if (!baseline) return null
    const baselineAt = Date.parse(baseline.at)
    const initial = baseline[key]!
    let previous = initial
    let lastAt = baselineAt
    for (const point of points) {
      const time = Date.parse(point.at)
      if (time <= baselineAt) continue
      if (time > at) break
      if (point.device !== baseline.device) return null
      const value = point[key]
      if (value == null) continue
      if (!Number.isFinite(value) || value < previous) return null
      previous = value
      lastAt = time
    }
    return at - lastAt <= 5 * 60000 ? previous - initial : null
  }
  return { distanceKm: delta('distanceKm'), consumedLiters: delta('consumedLiters') }
}

