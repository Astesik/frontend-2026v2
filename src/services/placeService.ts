import { api } from './api'
import type { PlaceSelectItem } from '@/types/repair'
import type { Place, PlaceEventRule, PlaceEventRuleType, PlacePayload, PlaceUpdatePayload, PlaceVehicleEvent, PlaceVehicleScope } from '@/types/place'
import type { PageResult } from '@/types/notifications'

type RawPlaceSelectItem = {
  id?: number | string
  value?: number | string
  name?: string | null
  label?: string | null
  visible?: boolean | null
  color?: string | null
}

type RawPlace = Partial<Place> & {
  id?: number | string
  lat?: number | string | null
  lon?: number | string | null
  radius?: number | string | null
}

function normalizePlace(item: RawPlaceSelectItem): PlaceSelectItem | null {
  const id = Number(item.id ?? item.value)
  const name = item.name || item.label || ''

  if (!Number.isFinite(id) || !name) {
    return null
  }

  return {
    id,
    name,
    visible: item.visible ?? true,
    color: item.color || '#7093ff',
  }
}

function nullableString(value: unknown) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return normalized || null
}

function normalizeEventRule(rule: Partial<PlaceEventRule> & { type?: PlaceEventRuleType }, fallbackType?: PlaceEventRuleType): PlaceEventRule | null {
  const eventType = rule.eventType || rule.type || fallbackType
  if (!eventType) return null

  return {
    id: Number(rule.id || 0),
    placeId: Number(rule.placeId || 0),
    eventType,
    vehicleScope: (rule.vehicleScope || 'all') as PlaceVehicleScope,
    enabled: rule.enabled ?? false,
    recipients: Array.isArray(rule.recipients) ? [...new Set(rule.recipients.map((email) => email.trim().toLowerCase()).filter(Boolean))] : [],
    createdAt: rule.createdAt || null,
    updatedAt: rule.updatedAt || null,
  }
}

function normalizePlaceDetails(item: RawPlace): Place | null {
  const id = Number(item.id)
  const latitude = Number(item.latitude ?? item.lat)
  const longitude = Number(item.longitude ?? item.lon)

  if (!Number.isFinite(id) || !item.name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  const radiusMeters = Number(item.radiusMeters ?? item.radius ?? 100)

  return {
    id,
    name: item.name,
    city: nullableString(item.city),
    latitude,
    longitude,
    radiusMeters: Number.isFinite(radiusMeters) && radiusMeters > 0 ? radiusMeters : 100,
    phone: nullableString(item.phone),
    email: nullableString(item.email),
    description: nullableString(item.description),
    visible: item.visible ?? true,
    color: item.color || '#7093ff',
    eventRules: (Array.isArray(item.eventRules) ? item.eventRules : []).map((rule) => normalizeEventRule(rule)).filter(Boolean) as PlaceEventRule[],
  }
}

export const placeService = {
  async getPlaces(options?: { silent?: boolean }) {
    const { data } = await api.get<RawPlace[]>('/api/places', {
      skipErrorToast: options?.silent,
    })

    return (Array.isArray(data) ? data : [])
      .map(normalizePlaceDetails)
      .filter(Boolean) as Place[]
  },

  async getPlace(id: number | string, options?: { silent?: boolean }) {
    const { data } = await api.get<RawPlace>(`/api/places/${id}`, {
      skipErrorToast: options?.silent,
    })
    const place = normalizePlaceDetails(data)

    if (!place) throw new Error('Backend zwrócił nieprawidłowe dane miejsca.')
    return place
  },

  async createPlace(payload: PlacePayload) {
    const { data } = await api.post<RawPlace>('/api/places', payload)
    const place = normalizePlaceDetails(data)

    if (!place) throw new Error('Backend zwrócił nieprawidłowe dane miejsca.')
    return place
  },

  async updatePlace(id: number | string, payload: PlaceUpdatePayload) {
    const { data } = await api.patch<RawPlace>(`/api/places/${id}`, payload)
    const place = normalizePlaceDetails(data)

    if (!place) throw new Error('Backend zwrócił nieprawidłowe dane miejsca.')
    return place
  },

  async deletePlace(id: number | string) {
    await api.delete(`/api/places/${id}`)
  },

  async getEventRules(placeId: number | string, options?: { silent?: boolean }) {
    const { data } = await api.get<PlaceEventRule[]>(`/api/places/${placeId}/event-rules`, { skipErrorToast: options?.silent })
    return (Array.isArray(data) ? data : []).map((rule) => normalizeEventRule(rule)).filter(Boolean) as PlaceEventRule[]
  },

  async saveEventRule(placeId: number | string, type: PlaceEventRuleType, payload: { enabled: boolean; vehicleScope: PlaceVehicleScope; recipients: string[] }) {
    const { data } = await api.put<PlaceEventRule>(`/api/places/${placeId}/event-rules/${type}`, payload)
    const rule = normalizeEventRule(data, type)
    if (!rule) throw new Error('Backend zwrócił nieprawidłową regułę strefy.')
    return rule
  },

  async deleteEventRule(placeId: number | string, type: PlaceEventRuleType) {
    await api.delete(`/api/places/${placeId}/event-rules/${type}`)
  },

  async getVehicleEvents(placeId: number | string, page = 0, size = 100, options?: { silent?: boolean }) {
    const { data } = await api.get<PageResult<PlaceVehicleEvent> | PlaceVehicleEvent[]>(`/api/places/${placeId}/vehicle-events`, {
      params: { page, size },
      skipErrorToast: options?.silent,
    })
    const content = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : []
    return content.map((event) => ({ ...event, notificationRecipients: Array.isArray(event.notificationRecipients) ? event.notificationRecipients : [] }))
  },

  async getPlacesSelect(options?: { silent?: boolean }) {
    const { data } = await api.get<RawPlaceSelectItem[]>('/api/places/select', {
      skipErrorToast: options?.silent,
    })

    return (Array.isArray(data) ? data : [])
      .map(normalizePlace)
      .filter(Boolean) as PlaceSelectItem[]
  },
}
