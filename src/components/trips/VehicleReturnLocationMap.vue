<template>
  <section class="min-w-0 overflow-hidden rounded-[6px] border border-ui-border bg-ui-muted">
    <div class="flex items-center justify-between gap-2 border-b border-ui-divider px-3 py-2">
      <h3 class="flex items-center gap-2 ui-label text-ui-text"><MapPin class="h-4 w-4 text-ui-icon" />Lokalizacja pojazdu</h3>
      <LoaderCircle v-if="store.mapLoading" class="h-4 w-4 animate-spin text-ui-icon" />
    </div>
    <div class="relative h-72 min-w-0">
      <div ref="element" class="h-full w-full" />
      <div v-if="message" class="absolute inset-0 flex items-center justify-center bg-ui-muted p-5 text-center ui-body-sm text-ui-mutedText" role="status">{{ message }}</div>
    </div>
    <div v-if="selected" class="border-t border-ui-divider px-3 py-2 ui-caption">{{ selected.vehicle.licensePlate }} · {{ formatStatisticsDate(selected.position.ts, timezone) }}</div>
  </section>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { LoaderCircle, MapPin } from 'lucide-vue-next'
import { loadGoogleMaps } from '@/services/googleMapsLoader'
import { useFleetStore } from '@/stores/fleetStore'
import { useVehicleReturnStore } from '@/stores/vehicleReturnStore'
import { useVehicleReturnPermissions } from '@/composables/useVehicleReturnPermissions'
import { formatStatisticsDate } from '@/utils/dailyStatistics'
import type { ApiLastPosition } from '@/types/fleet'

const props = defineProps<{ truckId: string; trailerId: string; timezone: string }>()
const emit = defineEmits<{ 'select-trailer': [id: string] }>()
const store = useVehicleReturnStore()
const { canReadPositions } = useVehicleReturnPermissions()
const element = ref<HTMLElement | null>(null), mapError = ref(''), ready = ref(false)
const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
let map: any = null, google: any = null, markers: any[] = [], disposed = false, centeredId = ''
let resizeObserver: ResizeObserver | null = null
function validPosition(position: ApiLastPosition) {
  return position.lat !== null && position.lon !== null && Number.isFinite(position.lat) && Number.isFinite(position.lon) && Math.abs(position.lat) <= 90 && Math.abs(position.lon) <= 180
}
const positionedVehicles = computed(() => useFleetStore().apiVehicles.flatMap((vehicle) => {
  const position = store.mapPositions.filter((point) => validPosition(point) && (point.vehicleId === vehicle.id || (point.vehicleId === null && point.deviceId === vehicle.assignedDeviceId)))
    .sort((a, b) => (b.ts || '').localeCompare(a.ts || ''))[0]
  return position ? [{ vehicle, position }] : []
}))
const selected = computed(() => positionedVehicles.value.find((item) => String(item.vehicle.id) === props.truckId))
const message = computed(() => !props.truckId ? 'Wybierz ciągnik' : !canReadPositions.value ? 'Brak dostępu do pozycji pojazdów' : !key ? 'Brak klucza Google Maps' : mapError.value || store.mapError || (store.mapLoading ? 'Pobieranie pozycji...' : !selected.value ? 'Brak lokalizacji ciągnika' : !ready.value ? 'Ładowanie mapy...' : ''))
function nearby(position: ApiLastPosition, center: ApiLastPosition) {
  const radians = Math.PI / 180, dlat = (position.lat! - center.lat!) * radians, dlon = (position.lon! - center.lon!) * radians
  const a = Math.sin(dlat / 2) ** 2 + Math.cos(center.lat! * radians) * Math.cos(position.lat! * radians) * Math.sin(dlon / 2) ** 2
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a))) <= 5000
}
function clearMarkers() {
  for (const marker of markers) { google?.maps.event.clearInstanceListeners(marker); marker.setMap(null) }
  markers = []
}
function render() {
  if (!map || !google) return
  clearMarkers()
  if (!selected.value) { centeredId = ''; return }
  const center = selected.value.position
  for (const item of positionedVehicles.value.filter((item) => nearby(item.position, center))) {
    const active = String(item.vehicle.id) === props.truckId, trailer = item.vehicle.type === 'TRAILER', chosenTrailer = String(item.vehicle.id) === props.trailerId
    const marker = new google.maps.Marker({ map, position: { lat: item.position.lat, lng: item.position.lon }, title: item.vehicle.licensePlate,
      label: { text: item.vehicle.licensePlate, fontSize: '10px', fontWeight: '600', color: '#222223' },
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: active || chosenTrailer ? 9 : 7, fillColor: active ? '#7093ff' : trailer ? '#dec74c' : '#b1b1b1', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2, labelOrigin: new google.maps.Point(0, 3) },
      zIndex: active ? 3 : chosenTrailer ? 2 : 1,
    })
    if (trailer && item.vehicle.status?.toUpperCase() === 'ACTIVE') marker.addListener('click', () => emit('select-trailer', String(item.vehicle.id)))
    markers.push(marker)
  }
  if (centeredId !== props.truckId) {
    centeredId = props.truckId
    map.setCenter({ lat: center.lat, lng: center.lon })
    map.setZoom(15)
  }
}
watch([positionedVehicles, () => props.truckId, () => props.trailerId], render)
onMounted(async () => {
  if (!key || !canReadPositions.value) return
  try {
    google = await loadGoogleMaps(key)
    if (disposed || !element.value) return
    map = new google.maps.Map(element.value, { center: { lat: 52, lng: 19 }, zoom: 6, disableDefaultUI: true, gestureHandling: 'greedy' })
    ready.value = true
    resizeObserver = new ResizeObserver(() => google.maps.event.trigger(map, 'resize'))
    resizeObserver.observe(element.value)
    render()
  } catch { if (!disposed) mapError.value = 'Nie udało się załadować mapy' }
})
onBeforeUnmount(() => { disposed = true; resizeObserver?.disconnect(); clearMarkers(); if (map) google?.maps.event.clearInstanceListeners(map); map = null })
</script>
