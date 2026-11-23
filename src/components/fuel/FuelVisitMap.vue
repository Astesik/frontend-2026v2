<template>
  <section class="overflow-hidden rounded-lg border border-ui-divider">
    <div class="flex flex-wrap gap-x-4 gap-y-1 border-b border-ui-divider px-3 py-2 text-sm">
      <span class="flex items-center gap-1.5"><MapPin class="h-5 w-5 text-success-600" />Początek</span>
      <span class="flex items-center gap-1.5"><MapPin class="h-5 w-5 text-danger-500" />Koniec</span>
      <span class="flex items-center gap-1.5"><Fuel class="h-5 w-5 text-info-500" />Tankowania · ON / AdBlue</span>
    </div>
    <div class="relative h-[60dvh] min-h-80 lg:h-[75dvh]">
      <div ref="element" class="h-full w-full" aria-label="Trasa pojazdu i tankowania w okresie wykresu" />
      <aside v-if="selectedPoint" class="absolute bottom-3 left-3 z-10 w-64 max-w-[90%] rounded-lg border border-ui-divider bg-ui-surface p-3 shadow-lg">
        <div class="flex items-center justify-between gap-2">
          <strong class="text-sm">Punkt trasy</strong>
          <AppIconButton label="Zamknij punkt trasy" size="sm" @click="clearSelected"><IconX class="h-4 w-4" /></AppIconButton>
        </div>
        <p class="mt-1 text-sm tabular-nums">{{ timestamp.format(Date.parse(selectedPoint.at)) }}</p>
        <dl class="mt-3 grid grid-cols-2 gap-2 text-sm">
          <dt class="text-ui-mutedText">Prędkość</dt><dd class="text-right">{{ selectedPoint.speed == null ? '—' : selectedPoint.speed.toLocaleString('pl-PL') + ' km/h' }}</dd>
          <dt class="text-ui-mutedText">Paliwo</dt><dd class="text-right">{{ selectedPoint.level == null ? '—' : selectedPoint.level.toLocaleString('pl-PL') + '%' }}</dd>
          <dt class="text-ui-mutedText">Zapłon</dt><dd class="text-right">{{ selectedPoint.ignition === 'ON' ? 'Włączony' : selectedPoint.ignition === 'OFF' ? 'Wyłączony' : 'Brak danych' }}</dd>
        </dl>
        <p class="mt-2 text-xs text-ui-mutedText">{{ selectedPoint.lat.toFixed(5) }}, {{ selectedPoint.lng.toFixed(5) }}</p>
      </aside>
      <AppLoadingIndicator v-if="loading" class="absolute inset-0 bg-ui-surface/85" />
      <div v-else-if="error || !points.length" class="absolute inset-x-3 top-3 rounded-lg border border-ui-divider bg-ui-surface/95 p-3 text-sm" :role="error ? 'alert' : 'status'">
        <p>{{ error || 'Brak pozycji GPS w tym okresie.' }}</p>
        <AppButton v-if="error" size="sm" variant="secondary" class="mt-2" @click="emit('retry')">Spróbuj ponownie</AppButton>
      </div>
    </div>
    <p v-if="missingStations" class="border-t border-ui-divider px-3 py-2 text-sm text-ui-mutedText">Tankowania bez współrzędnych stacji · {{ missingStations }}</p>
  </section>
</template>
<script setup lang="ts">
import { h, render, onMounted, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { IconGasStation as Fuel, IconMapPin as MapPin, IconX } from '@tabler/icons-vue'
import { loadGoogleMaps } from '@/services/googleMapsLoader'
import { fuelVisitService, type RoutePoint } from '@/services/fuelVisitService'
import { getApiErrorMessage } from '@/services/api'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppLoadingIndicator from '@/components/ui/AppLoadingIndicator.vue'
import { useUiStore } from '@/stores/uiStore'
import { FUEL_VISIT_DARK_STYLES } from '@/services/fuelVisitMapStyles'

const props = defineProps<{ id: number }>()
const emit = defineEmits<{ retry: [] }>()
const ui = useUiStore()
const element = ref<HTMLElement>()
const points = shallowRef<RoutePoint[]>([])
const loading = ref(true), error = ref(''), missingStations = ref(0)
const request = new AbortController()
const timestamp = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', dateStyle: 'short', timeStyle: 'short' })
let google: any, map: any, observer: ResizeObserver | undefined
let objects: any[] = []
const selectedPoint = shallowRef<RoutePoint | null>(null)
let selectedMarker: any
function clearSelected() {
  selectedPoint.value = null
  if (selectedMarker) { google?.maps.event.clearInstanceListeners(selectedMarker); selectedMarker.setMap(null) }
  selectedMarker = null
}
function selectPoint(point: RoutePoint) {
  clearSelected()
  selectedPoint.value = point
  selectedMarker = new google.maps.Marker({
    map, position: { lat: point.lat, lng: point.lng }, title: timestamp.format(Date.parse(point.at)),
    icon: { path: google.maps.SymbolPath.CIRCLE, scale: 6, fillColor: '#7093ff', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2 },
    zIndex: 10,
  })
}
watch(() => ui.isDark, dark => map?.setOptions({ styles: dark ? FUEL_VISIT_DARK_STYLES : [] }))
onMounted(async () => {
  try {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!key && !window.google?.maps?.Map) throw new Error('Brak klucza Google Maps.')
    const [mapsResult, routeResult] = await Promise.allSettled([loadGoogleMaps(key || ''), fuelVisitService.route(props.id, request.signal)])
    if (request.signal.aborted || !element.value) return
    if (mapsResult.status === 'rejected') throw mapsResult.reason
    google = mapsResult.value
    map = new google.maps.Map(element.value, {
      center: { lat: 52, lng: 19 }, zoom: 6, disableDefaultUI: true, zoomControl: true,
      gestureHandling: 'greedy', scrollwheel: true, fullscreenControl: true, styles: ui.isDark ? FUEL_VISIT_DARK_STYLES : [],
    })
    observer = new ResizeObserver(() => { if (map) google.maps.event.trigger(map, 'resize') })
    observer.observe(element.value)
    if (routeResult.status === 'rejected') throw routeResult.reason
    const route = routeResult.value
    points.value = route.points
    const bounds = new google.maps.LatLngBounds()
    let path: RoutePoint[] = []
    function drawPath() {
      if (path.length > 1) {
        const segment = path
        const line = new google.maps.Polyline({ map, path: segment.map(p => ({ lat: p.lat, lng: p.lng })), strokeColor: '#7093ff', strokeOpacity: 0.95, strokeWeight: 5, clickable: true })
        line.addListener('click', (event: any) => {
          if (!event.latLng) return
          const lat = event.latLng.lat(), lng = event.latLng.lng()
          const longitudeScale = Math.cos(lat * Math.PI / 180)
          const distance = (point: RoutePoint) => (point.lat - lat) ** 2 + ((point.lng - lng) * longitudeScale) ** 2
          const nearest = segment.reduce((best, point) => distance(point) < distance(best) ? point : best)
          selectPoint(nearest)
        })
        objects.push(line)
      }
      path = []
    }
    for (const point of route.points) {
      const previous = path.at(-1)
      if (previous && Date.parse(point.at) - Date.parse(previous.at) > 300000) drawPath()
      path.push(point)
      bounds.extend({ lat: point.lat, lng: point.lng })
    }
    drawPath()
    function marker(position: { lat: number; lng: number }, kind: 'pin' | 'fuel', title: string, color: string) {
      const wrapper = document.createElement('div')
      render(h(kind === 'fuel' ? Fuel : MapPin, { size: 24, color, stroke: '2.5' }), wrapper)
      const icon = wrapper.innerHTML.replace('<svg ', '<svg x="9" y="9" ')
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42">
        <circle cx="21" cy="22" r="19" fill="#0f172a" opacity="0.18"/>
        <circle cx="21" cy="21" r="18" fill="#f8fafc" stroke="${color}" stroke-width="1.5"/>
        ${icon}
      </svg>`
      render(null, wrapper)
      objects.push(new google.maps.Marker({
        map, position, title,
        icon: { url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
          scaledSize: new google.maps.Size(42, 42), anchor: new google.maps.Point(21, 21) },
      }))
      bounds.extend(position)
    }
    const first = route.points[0], last = route.points.at(-1)
    if (first) marker(first, 'pin', 'Początek · ' + timestamp.format(Date.parse(first.at)), '#397c62')
    if (last) marker(last, 'pin', 'Koniec · ' + timestamp.format(Date.parse(last.at)), '#b45555')
    const stations = new Map<string, { position: { lat: number; lng: number }; titles: string[] }>()
    for (const p of route.purchases) {
      if (p.lat == null || p.lng == null || !Number.isFinite(p.lat) || !Number.isFinite(p.lng) || Math.abs(p.lat) > 90 || Math.abs(p.lng) > 180 || (p.lat === 0 && p.lng === 0)) {
        missingStations.value++
        continue
      }
      const key = p.lat + ',' + p.lng
      const station = stations.get(key) ?? { position: { lat: p.lat, lng: p.lng }, titles: [] }
      station.titles.push([p.provider, p.station].filter(Boolean).join(' ') + ' · ' + (p.product === 'DIESEL' ? 'ON' : 'AdBlue') + ' · ' + timestamp.format(Date.parse(p.at)) + ' · ' + p.liters.toLocaleString('pl-PL') + ' l')
      stations.set(key, station)
    }
    for (const station of stations.values()) {
      marker(station.position, 'fuel', station.titles.join('\n'), '#536eaf')
    }
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 40)
      google.maps.event.addListenerOnce(map, 'idle', () => { if (map?.getZoom() > 16) map.setZoom(16) })
    }
  } catch (cause) {
    if (!request.signal.aborted) error.value = getApiErrorMessage(cause)
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
})
onBeforeUnmount(() => {
  request.abort()
  clearSelected()
  observer?.disconnect()
  for (const object of objects) { google?.maps.event.clearInstanceListeners(object); object.setMap(null) }
  objects = []
  if (map) google?.maps.event.clearInstanceListeners(map)
  map = null
  points.value = []
  google = null
})
</script>

