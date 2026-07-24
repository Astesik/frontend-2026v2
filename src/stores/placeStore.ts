import { defineStore } from 'pinia'
import { ref } from 'vue'
import { placeService } from '@/services/placeService'
import type { Place, PlaceEventRule, PlaceEventRuleType, PlacePayload, PlaceUpdatePayload, PlaceVehicleEvent, PlaceVehicleScope } from '@/types/place'

export const usePlaceStore = defineStore('places', () => {
  const places = ref<Place[]>([])
  const isLoading = ref(false)
  const isMutating = ref(false)
  const eventRulesByPlace = ref<Record<string, PlaceEventRule[]>>({})
  const vehicleEventsByPlace = ref<Record<string, PlaceVehicleEvent[]>>({})

  function setRules(placeId: number, rules: PlaceEventRule[]) {
    eventRulesByPlace.value = { ...eventRulesByPlace.value, [String(placeId)]: rules }
    const place = places.value.find((item) => item.id === placeId)
    if (place) place.eventRules = rules
  }

  async function loadPlaces(options?: { silent?: boolean }) {
    isLoading.value = true

    try {
      places.value = await placeService.getPlaces(options)
      eventRulesByPlace.value = Object.fromEntries(places.value.map((place) => [String(place.id), place.eventRules]))
      return places.value
    } finally {
      isLoading.value = false
    }
  }

  async function createPlace(payload: PlacePayload) {
    isMutating.value = true

    try {
      const place = await placeService.createPlace(payload)
      places.value = [...places.value, place].sort((first, second) => first.name.localeCompare(second.name, 'pl'))
      setRules(place.id, place.eventRules)
      return place
    } finally {
      isMutating.value = false
    }
  }

  async function updatePlace(id: number, payload: PlaceUpdatePayload) {
    isMutating.value = true

    try {
      const place = await placeService.updatePlace(id, payload)
      const index = places.value.findIndex((item) => item.id === id)

      if (index >= 0) places.value.splice(index, 1, place)
      else places.value.push(place)

      places.value = [...places.value].sort((first, second) => first.name.localeCompare(second.name, 'pl'))
      setRules(place.id, place.eventRules)
      return place
    } finally {
      isMutating.value = false
    }
  }

  async function deletePlace(id: number) {
    isMutating.value = true

    try {
      await placeService.deletePlace(id)
      places.value = places.value.filter((place) => place.id !== id)
      const nextRules = { ...eventRulesByPlace.value }
      delete nextRules[String(id)]
      eventRulesByPlace.value = nextRules
    } finally {
      isMutating.value = false
    }
  }

  async function loadEventRules(placeId: number, options?: { silent?: boolean }) {
    const rules = await placeService.getEventRules(placeId, options)
    setRules(placeId, rules)
    return rules
  }

  async function saveEventRule(placeId: number, type: PlaceEventRuleType, enabled: boolean, vehicleScope: PlaceVehicleScope, recipients: string[]) {
    isMutating.value = true
    try {
      const rule = await placeService.saveEventRule(placeId, type, { enabled, vehicleScope, recipients })
      const current = eventRulesByPlace.value[String(placeId)] || []
      setRules(placeId, [...current.filter((item) => item.eventType !== type), rule])
      return rule
    } finally {
      isMutating.value = false
    }
  }

  async function deleteEventRule(placeId: number, type: PlaceEventRuleType) {
    isMutating.value = true
    try {
      await placeService.deleteEventRule(placeId, type)
      setRules(placeId, (eventRulesByPlace.value[String(placeId)] || []).filter((rule) => rule.eventType !== type))
    } finally {
      isMutating.value = false
    }
  }

  async function loadVehicleEvents(placeId: number, options?: { silent?: boolean }) {
    const events = await placeService.getVehicleEvents(placeId, 0, 100, options)
    vehicleEventsByPlace.value = { ...vehicleEventsByPlace.value, [String(placeId)]: events }
    return events
  }

  function resetApiState() {
    places.value = []
    eventRulesByPlace.value = {}
    vehicleEventsByPlace.value = {}
    isLoading.value = false
    isMutating.value = false
  }

  return {
    places,
    isLoading,
    isMutating,
    eventRulesByPlace,
    vehicleEventsByPlace,
    loadPlaces,
    createPlace,
    updatePlace,
    deletePlace,
    loadEventRules,
    saveEventRule,
    deleteEventRule,
    loadVehicleEvents,
    resetApiState,
  }
})
