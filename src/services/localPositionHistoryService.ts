import { api } from './api'
import type { DriverTripReport, DriverTripRequest, LocalHistoryPage, LocalHistoryReport, LocalHistoryRequest } from '@/types/localPositionHistory'
export const localPositionHistoryService = {
  async page(body: LocalHistoryRequest, signal?: AbortSignal) {
    return (await api.post<LocalHistoryPage>('/api/positions/history/local', body, {signal, skipErrorToast:true})).data
  },
  async summary(body: LocalHistoryRequest, signal?: AbortSignal) {
    return (await api.post<LocalHistoryReport>('/api/positions/history/local/summary', body, {signal, skipErrorToast:true})).data
  },
  async driverTrip(body: DriverTripRequest, signal?: AbortSignal) {
    return (await api.post<DriverTripReport>('/api/positions/history/local/driver-trip', body, {signal, skipErrorToast:true})).data
  },
}

export async function* localHistoryPages(body: LocalHistoryRequest, signal?: AbortSignal) {
  let range = { from: body.from, to: body.to }
  let cursor = body.cursor
  const cursors = new Set<string>()
  let first = true
  while (!signal?.aborted) {
    const page = await localPositionHistoryService.page({ ...body, ...range, includeSummary: first ? body.includeSummary ?? true : false, ...(cursor ? { cursor } : {}) }, signal)
    if (signal?.aborted) return
    if (first) range = { from: page.from, to: page.to }
    yield page
    if (!page.hasMore) return
    if (!page.nextCursor) throw new Error('Brak kursora kolejnej strony historii.')
    const key = JSON.stringify(page.nextCursor)
    if (cursors.has(key)) throw new Error('Backend zwrócił powtarzający się kursor historii.')
    cursors.add(key)
    cursor = page.nextCursor
    first = false
  }
}
