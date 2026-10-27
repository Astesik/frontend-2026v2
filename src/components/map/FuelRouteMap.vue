<template>
  <div class="fuel-route-map relative h-full min-h-0 w-full">
    <div ref="container" class="h-full w-full" />
    <p v-if="error" class="absolute inset-x-4 top-16 rounded-md border border-ui-border bg-ui-surface p-3 text-sm text-ui-text">{{ error }}</p>
    <div class="absolute right-3 top-3 flex gap-1">
      <AppIconButton :label="dark ? 'Mapa jasna' : 'Mapa ciemna'" @click="dark = !dark"><Moon v-if="!dark" :size="16" /><Sun v-else :size="16" /></AppIconButton>
      <AppIconButton label="Mapa / satelita" @click="satellite = !satellite"><Layers :size="16" /></AppIconButton>
    </div>
    <div v-if="store.result" class="absolute bottom-8 right-3 rounded-md border border-ui-border bg-ui-surface/95 p-2 text-[10px] text-ui-text">
      <p v-for="item in legend" :key="item.label" class="flex items-center gap-2"><span class="h-2 w-2 rounded-full" :style="{background:item.color}" />{{ item.label }}</p>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, h, render } from 'vue'
import { Fuel, Layers, Moon, Sun } from 'lucide-vue-next'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import FuelRouteStationPopup from './FuelRouteStationPopup.vue'
import { useFuelRouteStore } from '@/stores/fuelRouteStore'
import { useUiStore } from '@/stores/uiStore'
import { loadGoogleMaps } from '@/services/googleMapsLoader'
import { DARK_STYLES } from '@/services/googleMapStyles'
import type { FuelRouteStation } from '@/types/fuelRoute'
const props = defineProps<{ addOnMap: boolean }>()
const emit = defineEmits<{ point: [position: {lat: number; lng: number}] }>()
const store = useFuelRouteStore(), ui = useUiStore()
const container = ref<HTMLElement>(), error = ref(''), dark = ref(ui.theme === 'dark'), satellite = ref(false)
let google: any, map: any, popup: any, popupElement: HTMLElement | null = null, disposed = false
let routeObjects: any[] = [], vehicleMarker: any, listeners: any[] = [], routeListeners: any[] = []
const colors = { GREEN: '#16a34a', YELLOW: '#eab308', RED: '#dc2626', UNKNOWN: '#64748b' }
const legend = [{color:colors.GREEN,label:'Zasięg bez rezerwy'},{color:colors.YELLOW,label:'Rezerwa'},{color:colors.RED,label:'Poza zasięgiem'},{color:colors.UNKNOWN,label:'Zasięg nieznany'}]
function closePopup() { popup?.close(); if (popupElement) render(null, popupElement); popupElement = null }
function clearRoute() { closePopup(); routeListeners.forEach(l => l.remove()); routeListeners = []; routeObjects.forEach(o => o.setMap(null)); routeObjects = [] }
function marker(position: any, label: string, color = '#64748b') {
  const item = new google.maps.Marker({ map, position, label: { text: label, color: '#ffffff', fontSize: '11px', fontWeight: '700' }, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 11, fillColor: color, fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 }, zIndex: 5 })
  routeObjects.push(item); return item
}
function showStation(station: FuelRouteStation) {
  closePopup()
  popupElement = document.createElement('div')
  render(h(FuelRouteStationPopup, { station }), popupElement)
  popup.setContent(popupElement); popup.setPosition(station.position); popup.open({ map, shouldFocus: false })
}
function drawRoute() {
  if (!map) return
  clearRoute()
  const result = store.result
  if (!result) {
    store.waypoints.forEach((point, i) => { if (point.position) marker(point.position, String.fromCharCode(65 + i)) })
    return
  }
  result.routeZones.forEach(zone => {
    routeObjects.push(new google.maps.Polyline({ map, path: zone.path, strokeColor: colors[zone.color], strokeOpacity: 0.95, strokeWeight: 5, zIndex: 1 }))
  })
  if (!result.routeZones.length && store.route) routeObjects.push(new google.maps.Polyline({ map, path: store.route.path, strokeColor: colors.UNKNOWN, strokeWeight: 5 }))
  store.route?.stops.forEach((point, i) => marker(point, String.fromCharCode(65 + i)))
  if (result.fuel.reserveReachedPoint) marker(result.fuel.reserveReachedPoint, 'R', colors.YELLOW)
  if (result.fuel.fuelRunsOutPoint) marker(result.fuel.fuelRunsOutPoint, '!', colors.RED)
  result.stations.forEach(station => {
    const svg = document.createElement('div'); render(h(Fuel, { size: 18, color: '#ffffff', strokeWidth: 2 }), svg)
    const icon = svg.innerHTML; render(null, svg)
    const image = '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><rect x="1" y="1" width="28" height="28" rx="6" fill="#334155" stroke="white" stroke-width="2"/><g transform="translate(6 6)">' + icon + '</g></svg>'
    const item = new google.maps.Marker({ map, position: station.position, icon: { url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(image), scaledSize: new google.maps.Size(30, 30), anchor: new google.maps.Point(15, 15) }, zIndex: 10 })
    routeObjects.push(item); routeListeners.push(item.addListener('click', () => { if (store.selectedStationId === station.id) showStation(station); else store.selectedStationId = station.id }))
  })
  if (store.route?.path.length) { const bounds = new google.maps.LatLngBounds(); store.route.path.forEach(point => bounds.extend(point)); map.fitBounds(bounds, 48) }
}
function drawVehicle() {
  if (!map) return
  vehicleMarker?.setMap(null); vehicleMarker = null
  const vehicle = store.selectedVehicle
  if (vehicle?.hasPosition) vehicleMarker = new google.maps.Marker({ map, position: { lat: vehicle.latitude, lng: vehicle.longitude }, label: { text: vehicle.plateNumber, color: dark.value ? '#ffffff' : '#222223', fontWeight: '700', fontSize: '11px' }, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#7093ff', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2, labelOrigin: new google.maps.Point(0, 3) }, zIndex: 20 })
}
watch(() => store.selectedVehicleId, () => { drawVehicle(); const v = store.selectedVehicle; if (map && v?.hasPosition) map.panTo({ lat: v.latitude, lng: v.longitude }) })
watch(() => store.selectedVehicle, drawVehicle)
watch(() => store.result, drawRoute)
watch(() => store.waypoints, () => { if (!store.result) drawRoute() }, { deep: true })
watch(() => store.selectedStationId, id => { const station = store.result?.stations.find(s => s.id === id); if (map && station) { showStation(station); map.panTo(station.position) } })
watch([dark, satellite], () => { map?.setOptions({ styles: dark.value && !satellite.value ? DARK_STYLES : [], mapTypeId: satellite.value ? 'satellite' : 'roadmap' }); drawVehicle() })
onMounted(async () => {
  try {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!key) throw new Error('Brak VITE_GOOGLE_MAPS_API_KEY w .env.local.')
    google = await loadGoogleMaps(key); if (disposed) return
    map = new google.maps.Map(container.value, { center: { lat: 52, lng: 19 }, zoom: 6, styles: dark.value ? DARK_STYLES : [], disableDefaultUI: true, gestureHandling: 'greedy', streetViewControl: true, streetViewControlOptions: { position: google.maps.ControlPosition.LEFT_BOTTOM } })
    popup = new google.maps.InfoWindow()
    listeners.push(map.addListener('click', (event: any) => { closePopup(); store.selectedStationId = null; if (props.addOnMap && event.latLng) emit('point', {lat: event.latLng.lat(), lng: event.latLng.lng()}) }), popup.addListener('closeclick', () => { closePopup(); store.selectedStationId = null }))
    drawVehicle(); drawRoute()
  } catch (cause) { if (!disposed) error.value = cause instanceof Error ? cause.message : 'Nie udało się załadować mapy.' }
})
onBeforeUnmount(() => { disposed = true; clearRoute(); vehicleMarker?.setMap(null); listeners.forEach(l => l.remove()); map = null })
</script>
<style scoped>
.fuel-route-map :deep(.gm-style-iw-c),
.fuel-route-map :deep(.gm-style-iw-tc::after) {
  background: rgb(var(--rw-surface));
  color: rgb(var(--rw-text-primary));
}
.fuel-route-map :deep(.gm-style-iw-d) { overflow: auto !important; }
</style>
