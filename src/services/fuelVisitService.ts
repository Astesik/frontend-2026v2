import { api } from './api'

export type Decision = 'FULL' | 'PARTIAL' | 'UNKNOWN'
export interface Reading { at: string; level: number }
interface Analysis {
  state: 'OBSERVING' | 'ASSESSED' | 'UNRESOLVED' | 'ADBLUE_ONLY'
  suggestion: 'LIKELY_FULL' | 'LIKELY_PARTIAL' | 'UNKNOWN'
  reason: string
  before: Reading | null
  peak: Reading | null
  last: Reading | null
  stableFrom: Reading | null
  stableTo: Reading | null
  count: number
  windowEnd: string
  consumedSinceArrival: number | null
  distanceSinceArrival: number | null
}
export interface Visit {
  id: number; revision: number; runId: number | null; plate: string; station: string; at: string
  diesel: number; adblue: number; gpsSupported: boolean; decision: Decision | null; analysis: Analysis | null
  purchases: { id: number; product: string; provider: string; at: string; code: string; liters: number }[]
}
export const fuelVisitService = {
  async list(q: string, page: number, signal: AbortSignal) {
    return (await api.get<{ rows: Visit[]; hasMore: boolean }>('/api/fuel/visits',
      { params: { q, page }, signal, skipErrorToast: true })).data
  },
  async levels(id: number, signal: AbortSignal) {
    return (await api.get<Reading[]>('/api/fuel/visits/' + id + '/levels', { signal, skipErrorToast: true })).data
  },
  async decide(visit: Visit, decision: Decision) {
    await api.put('/api/fuel/visits/' + visit.id + '/decision',
      { decision, revision: visit.revision, runId: visit.runId }, { skipErrorToast: true })
  },
}
