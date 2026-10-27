import { markRaw, shallowRef } from 'vue'
import type { LocalHistoryPoint as ApiPositionHistoryPoint } from '@/types/localPositionHistory'
import { validHistoryPosition, historySegmentBreak } from '@/utils/localPositionHistory'

export type RouteLatLng = {
  lat: number
  lng: number
}

function historyPointKey(point: ApiPositionHistoryPoint) {
  return [
    point.deviceId,
    point.id,
    point.ts,
    point.lat,
    point.lon,
  ].join(':')
}

function historyTimestamp(point: ApiPositionHistoryPoint) {
  const timestamp = new Date(point.ts || '').getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function sortHistory(points: ApiPositionHistoryPoint[]) {
  return [...points].sort((first, second) => historyTimestamp(first) - historyTimestamp(second) || first.id - second.id)
}

export function usePositionHistory(options: { connectTelemetryGaps?: () => boolean } = {}) {
  const records = shallowRef<ApiPositionHistoryPoint[]>(markRaw([]))
  const path = shallowRef<RouteLatLng[]>(markRaw([]))
  const pathRecordIndexes = shallowRef<number[]>(markRaw([]))
  const segmentStarts = shallowRef<number[]>(markRaw([]))

  function rebuildPath(nextRecords: ApiPositionHistoryPoint[]) {
    const nextPath: RouteLatLng[] = []
    const nextIndexes: number[] = []
    const nextStarts: number[] = []
    let previous: ApiPositionHistoryPoint | null = null

    nextRecords.forEach((point, recordIndex) => {
      if (!validHistoryPosition(point)) {
        return
      }

      if (!previous || historySegmentBreak(previous, point, options.connectTelemetryGaps?.() ?? false)) nextStarts.push(nextPath.length)
      nextPath.push({ lat: point.lat!, lng: point.lon! })
      nextIndexes.push(recordIndex)
      previous = point
    })

    path.value = markRaw(nextPath)
    pathRecordIndexes.value = markRaw(nextIndexes)
    segmentStarts.value = markRaw(nextStarts)
  }

  function replace(nextRecords: ApiPositionHistoryPoint[]) {
    const sortedRecords = markRaw(sortHistory(nextRecords))
    records.value = sortedRecords
    rebuildPath(sortedRecords)
  }

  function append(nextRecords: ApiPositionHistoryPoint[]) {
    if (!nextRecords.length) {
      return
    }

    const recordsByKey = new Map<string, ApiPositionHistoryPoint>()

    records.value.forEach((point) => recordsByKey.set(historyPointKey(point), point))
    nextRecords.forEach((point) => recordsByKey.set(historyPointKey(point), point))
    replace(Array.from(recordsByKey.values()))
  }

  function clear() {
    records.value = markRaw([])
    path.value = markRaw([])
    pathRecordIndexes.value = markRaw([])
    segmentStarts.value = markRaw([])
  }

  function recordForPathIndex(pathIndex: number) {
    const recordIndex = pathRecordIndexes.value[pathIndex]
    return recordIndex === undefined ? null : records.value[recordIndex] || null
  }

  function lastTimestamp() {
    return records.value.at(-1)?.ts || null
  }

  return {
    records,
    path,
    pathRecordIndexes,
    segmentStarts,
    replace,
    append,
    clear,
    recordForPathIndex,
    lastTimestamp,
  }
}
