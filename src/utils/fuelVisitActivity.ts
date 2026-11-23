import type { ActivityPoint } from '@/services/fuelVisitService'

export const activityLabels = {
  driving: 'Jazda', idle: 'Postój · zapłon włączony', parked: 'Postój · zapłon wyłączony', unknown: 'Brak danych',
}
export type ActivityState = keyof typeof activityLabels
export interface ActivitySegment { from: number; to: number; state: ActivityState; inferred?: boolean }
export function visitActivity(points: ActivityPoint[], from: number, to: number): ActivitySegment[] {
  const segments: ActivitySegment[] = []
  function append(start: number, end: number, state: ActivityState, inferred = false) {
    if (end <= start) return
    const previous = segments.at(-1)
    if (previous?.state === state && previous.inferred === inferred && previous.to === start) previous.to = end
    else segments.push({ from: start, to: end, state, inferred })
  }
  let cursor = from
  for (let i = 0; i < points.length - 1; i++) {
    const point = points[i]!, next = points[i + 1]!
    const start = Math.max(from, Date.parse(point.at)), end = Math.min(to, Date.parse(next.at))
    if (end <= start) continue
    append(cursor, start, 'unknown')
    let state: ActivityState = 'unknown'
    const continuous = Date.parse(next.at) - Date.parse(point.at) <= 300000 && point.device === next.device
    const distance = point.distance != null && next.distance != null ? next.distance - point.distance : null
    const speed = point.speed != null && point.speed >= 0 && point.speed <= 200 ? point.speed : null
    if (continuous) {
      if ((speed != null && speed > 5) || (distance != null && distance > 0)) state = 'driving'
      else if (point.ignition === 'OFF' && (distance == null || distance === 0)) state = 'parked'
      else if ((speed != null || distance === 0) && (distance == null || distance >= 0)) {
        if (point.ignition === 'ON') state = 'idle'
        if (point.ignition === 'OFF') state = 'parked'
      }
    }
    const parkedBetweenReadings = !continuous && point.device === next.device
      && point.ignition === 'OFF' && next.ignition === 'OFF'
      && (speed == null || speed <= 5) && (next.speed == null || (next.speed >= 0 && next.speed <= 5))
      && (distance == null || distance === 0)
    if (parkedBetweenReadings) state = 'parked'
    append(start, end, state, parkedBetweenReadings)
    cursor = end
  }
  append(cursor, to, 'unknown')
  return segments
}

