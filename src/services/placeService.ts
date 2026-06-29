import { api } from './api'
import type { PlaceSelectItem } from '@/types/repair'

type RawPlaceSelectItem = {
  id?: number | string
  value?: number | string
  name?: string | null
  label?: string | null
}

function normalizePlace(item: RawPlaceSelectItem): PlaceSelectItem | null {
  const id = Number(item.id ?? item.value)
  const name = item.name || item.label || ''

  if (!Number.isFinite(id) || !name) {
    return null
  }

  return { id, name }
}

export const placeService = {
  async getPlacesSelect(options?: { silent?: boolean }) {
    const { data } = await api.get<RawPlaceSelectItem[]>('/api/places/select', {
      skipErrorToast: options?.silent,
    })

    return (Array.isArray(data) ? data : [])
      .map(normalizePlace)
      .filter(Boolean) as PlaceSelectItem[]
  },
}
