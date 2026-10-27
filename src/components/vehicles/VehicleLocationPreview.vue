<template>
  <div class="vehicle-location-preview relative h-full min-h-[11rem] overflow-hidden rounded-b-[inherit] bg-ui-muted" role="region" :aria-label="'Lokalizacja pojazdu ' + vehicle.licensePlate">
    <div ref="inlineHost" class="absolute inset-0" />
    <Teleport :to="(isFullscreen && fullscreenHost) || inlineHost || 'body'" :disabled="!inlineHost">
      <div class="relative h-full w-full overflow-hidden bg-ui-muted" @wheel="handleWheelZoom">
        <div ref="element" class="absolute inset-0" :aria-hidden="!isFullscreen" />
        <div class="absolute left-2 right-2 top-2 z-10 flex flex-wrap items-center justify-end gap-2">
          <AppButton size="sm" variant="secondary" :disabled="!canRead || !coordinate" @click="copyLocation"><Copy class="h-4 w-4" />Kopiuj lokalizację</AppButton>
          <span v-show="!isFullscreen" ref="fullscreenTrigger" class="inline-flex"><AppIconButton label="Pokaż pełnoekranowo" size="sm" :disabled="!canRead || !ready || !coordinate" @click="openFullscreen"><Maximize2 class="h-4 w-4" /></AppIconButton></span>
        </div>
        <div v-if="message" class="absolute inset-0 grid place-items-center bg-ui-muted/95 p-4 text-center ui-body-sm text-ui-mutedText" role="status">{{ message }}</div>
        <p v-else-if="requestError" class="absolute inset-x-2 top-14 rounded-[6px] border border-ui-border bg-ui-surface/95 px-3 py-2 ui-caption" role="status">{{ requestError }}</p>
        <div class="absolute bottom-2 right-2 z-10 flex flex-col gap-1">
          <AppIconButton label="Przybliż mapę" size="sm" :disabled="!canRead || !ready || !coordinate" @click="zoomBy(1)"><Plus class="h-4 w-4" /></AppIconButton>
          <AppIconButton label="Oddal mapę" size="sm" :disabled="!canRead || !ready || !coordinate" @click="zoomBy(-1)"><Minus class="h-4 w-4" /></AppIconButton>
        </div>
        <p
          v-if="canRead && ready && coordinate"
          class="pointer-events-none absolute bottom-1 left-1 max-w-[calc(100%-4rem)] rounded-[var(--rw-radius-control)] border px-1.5 py-1 text-[10px] leading-tight tabular-nums shadow-soft"
          :class="isPositionStale ? 'border-danger-100 bg-danger-50 text-danger-600 dark:border-danger-400/40 dark:bg-ui-surface/95 dark:text-danger-400' : 'border-ui-border bg-ui-surface/95 text-ui-text-secondary'"
          role="status"
        >
          <span class="block font-medium">Ostatnia lokalizacja: {{ positionAgeLabel }}</span>
          <span v-if="positionTimestamp !== null" class="mt-0.5 block">{{ formatTime(position!.ts!) }}</span>
        </p>
      </div>
    </Teleport>
    <AppModal
      :open="isFullscreen"
      :title="'Lokalizacja pojazdu ' + vehicle.licensePlate"
      size="full"
      :close-on-backdrop="false"
      panel-class="!fixed !inset-0 !h-dvh !max-h-none !w-screen !max-w-none !rounded-none !border-0"
      body-class="!p-0 !overflow-hidden"
      @close="closeFullscreen"
    >
      <div ref="fullscreenHost" class="relative h-full w-full" />
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Copy, Maximize2, Minus, Plus } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { useUiStore } from '@/stores/uiStore'
import { useWorkspaceActive } from '@/composables/useWorkspace'
import { loadGoogleMaps } from '@/services/googleMapsLoader'
import { useAuthStore } from '@/stores/authStore'
import { useFleetStore } from '@/stores/fleetStore'
import { fleetMarkerIconSvg } from '@/utils/fleetMarker'
import { validHistoryPosition } from '@/utils/localPositionHistory'
import type { ApiVehicle } from '@/types/fleet'

const props = defineProps<{ vehicle: ApiVehicle }>()
const fleet = useFleetStore(), auth = useAuthStore(), ui = useUiStore()
const workspaceActive = useWorkspaceActive()
const element = ref<HTMLElement>(), ready = ref(false), mapError = ref(''), requestError = ref('')
const currentTime = ref(Date.now())
const inlineHost = ref<HTMLElement | null>(null), fullscreenHost = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)
const fullscreenTrigger = ref<HTMLElement | null>(null)
let inlineZoom = 14, lastWheelZoomAt = -Infinity
const canRead = computed(() => Boolean(auth.user && (auth.canManageCompany || auth.hasActiveCompanyPermission('positions.read'))))
const position = computed(() => fleet.positionByVehicleId.get(String(props.vehicle.id)) || fleet.lastPositions.find(item => item.vehicleId === null && item.deviceId === props.vehicle.assignedDeviceId))
const coordinate = computed(() => {
  const point = position.value
  return point && validHistoryPosition(point) ? { lat: point.lat!, lng: point.lon! } : null
})
const positionTimestamp = computed(() => {
  const timestamp = position.value?.ts ? new Date(position.value.ts).getTime() : NaN
  return Number.isFinite(timestamp) ? timestamp : null
})
const positionAgeMs = computed(() => positionTimestamp.value === null ? null : Math.max(0, currentTime.value - positionTimestamp.value))
const isPositionStale = computed(() => positionAgeMs.value !== null && positionAgeMs.value > 86_400_000)
const positionAgeLabel = computed(() => {
  if (positionAgeMs.value === null) return 'brak czasu odczytu'
  const minutes = Math.floor(positionAgeMs.value / 60_000)
  if (minutes < 1) return 'przed chwilą'
  if (minutes < 60) return `${minutes} min temu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} godz. temu`
  const days = Math.floor(hours / 24), remainingHours = hours % 24
  return `${days} ${days === 1 ? 'dzień' : 'dni'}${remainingHours ? ` i ${remainingHours} godz.` : ''} temu`
})
const message = computed(() => !canRead.value ? 'Nie masz dostępu do pozycji GPS.' : mapError.value || (!coordinate.value ? fleet.isPositionsLoading ? 'Pobieranie lokalizacji…' : requestError.value || 'Brak lokalizacji GPS tego pojazdu.' : !ready.value ? 'Ładowanie mapy…' : ''))
let google: any, map: any, marker: any, resize: ResizeObserver | undefined
let markerElement: HTMLDivElement | null = null, markerSignature = ''
let timer: number | undefined, mounted = false, disposed = false, initializing = false

function formatTime(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Brak czasu odczytu'
}
function openFullscreen() {
  if (!map || !ready.value || !canRead.value || !coordinate.value || isFullscreen.value) return
  inlineZoom = map.getZoom() ?? 14
  isFullscreen.value = true
}
function closeFullscreen() {
  if (!isFullscreen.value) return
  isFullscreen.value = false
  void nextTick(() => {
    if (workspaceActive.value && !disposed) fullscreenTrigger.value?.querySelector<HTMLButtonElement>('button')?.focus()
  })
}
function zoomBy(delta: number) {
  if (!map || !ready.value || !canRead.value || !coordinate.value) return
  map.setZoom(Math.min(21, Math.max(2, (map.getZoom() ?? 14) + delta)))
}
function handleWheelZoom(event: WheelEvent) {
  if (isFullscreen.value || !ready.value || !canRead.value || !event.deltaY) return
  event.preventDefault()
  if (Date.now() - lastWheelZoomAt < 120) return
  lastWheelZoomAt = Date.now()
  zoomBy(event.deltaY < 0 ? 1 : -1)
}
watch([isFullscreen, fullscreenHost], ([fullscreen]) => {
  if (!map || disposed) return
  map.setOptions({ gestureHandling: fullscreen ? 'greedy' : 'none', draggable: fullscreen, scrollwheel: fullscreen, keyboardShortcuts: fullscreen, disableDoubleClickZoom: !fullscreen })
  void nextTick(() => { if (map && !disposed) google.maps.event.trigger(map, 'resize') })
  if (!fullscreen) {
    map.setZoom(inlineZoom)
    if (coordinate.value) map.setCenter(coordinate.value)
  }
}, { flush: 'post' })
async function copyLocation() {
  if (!canRead.value || !coordinate.value) return
  const coordinates = `${coordinate.value.lat.toFixed(5)}, ${coordinate.value.lng.toFixed(5)}`
  try {
    await navigator.clipboard.writeText(coordinates)
    ui.addToast({ type: 'success', title: 'Skopiowano lokalizację', message: coordinates })
  } catch {
    ui.addToast({ type: 'error', title: 'Nie udało się skopiować lokalizacji', message: 'Sprawdź uprawnienia schowka w przeglądarce i spróbuj ponownie.' })
  }
}
function updateMarkerContent() {
  if (!markerElement) return
  const state = 'idle', type = props.vehicle.type === 'TRAILER' ? 'trailer' : 'truck'
  const heading = Number.isFinite(position.value?.heading) ? position.value!.heading! : 0
  const signature = JSON.stringify([state, type, heading, props.vehicle.licensePlate])
  if (signature === markerSignature) return
  markerSignature = signature
  markerElement.className = `rw-fleet-vehicle-marker rw-fleet-vehicle-marker-${type}`
  const icon = document.createElement('span')
  icon.className = `rw-fleet-marker-icon rw-fleet-marker-${state}`
  icon.style.setProperty('--rw-marker-heading', `${heading}deg`)
  icon.innerHTML = fleetMarkerIconSvg(state, type)
  const label = document.createElement('span'), plate = document.createElement('span')
  label.className = 'rw-fleet-marker-plate'
  plate.className = 'rw-fleet-marker-plate-number'
  plate.textContent = props.vehicle.licensePlate
  label.appendChild(plate)
  markerElement.replaceChildren(icon, label)
}
function createMarker() {
  const overlay = new google.maps.OverlayView()
  overlay.onAdd = () => {
    markerElement = document.createElement('div'); markerSignature = ''
    updateMarkerContent()
    overlay.getPanes()?.overlayLayer.appendChild(markerElement)
  }
  overlay.draw = () => {
    if (!markerElement || !coordinate.value) return
    updateMarkerContent()
    const point = overlay.getProjection()?.fromLatLngToDivPixel(new google.maps.LatLng(coordinate.value.lat, coordinate.value.lng))
    if (point) { markerElement.style.left = `${point.x}px`; markerElement.style.top = `${point.y}px` }
  }
  overlay.onRemove = () => { markerElement?.remove(); markerElement = null; markerSignature = '' }
  overlay.setMap(map)
  return overlay
}
function clearMarker() {
  if (marker) { google.maps.event.clearInstanceListeners(marker); marker.setMap(null); marker = null }
}
function updateMap() {
  if (!map || !ready.value) return
  if (!coordinate.value || !canRead.value) { clearMarker(); return }
  if (!marker) marker = createMarker()
  else marker.draw()
  if (!isFullscreen.value) map.setCenter(coordinate.value)
}
async function initialize() {
  if (!mounted || disposed || initializing || map || !canRead.value || !coordinate.value || !workspaceActive.value) return
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  if (!key) { mapError.value = 'Brak klucza Google Maps.'; return }
  initializing = true
  try {
    google = await loadGoogleMaps(key)
    if (disposed || !element.value || !coordinate.value || !canRead.value || !workspaceActive.value) return
    map = new google.maps.Map(element.value, {
      center: coordinate.value, zoom: 14, styles: null,
      disableDefaultUI: true, gestureHandling: 'none', draggable: false, scrollwheel: false,
      keyboardShortcuts: false, disableDoubleClickZoom: true, clickableIcons: false,
    })
    resize = new ResizeObserver(() => {
      if (map && workspaceActive.value) { google.maps.event.trigger(map, 'resize'); if (coordinate.value && !isFullscreen.value) map.setCenter(coordinate.value) }
    })
    resize.observe(element.value)
    ready.value = true; mapError.value = ''; updateMap()
  } catch { if (!disposed) mapError.value = 'Nie udało się załadować mapy.' }
  finally { initializing = false }
}
async function refresh() {
  if (!mounted || !workspaceActive.value || !canRead.value || document.hidden) return
  currentTime.value = Date.now()
  try { await fleet.fetchLastPositions({ silent: true }); if (!disposed) requestError.value = '' }
  catch { if (!disposed) requestError.value = 'Nie udało się odświeżyć pozycji. Wyświetlono ostatni odczyt.' }
}
function syncActivity() {
  if (!workspaceActive.value || !canRead.value) closeFullscreen()
  window.clearInterval(timer); timer = undefined
  if (!mounted || !workspaceActive.value || !canRead.value || document.hidden) return
  void initialize(); void refresh()
  timer = window.setInterval(() => void refresh(), 10_000)
  updateMap()
}
watch([coordinate, canRead], () => { updateMap(); void initialize() })
watch([workspaceActive, canRead], syncActivity)
watch(() => props.vehicle.id, () => { clearMarker(); updateMap() })
watch(() => [props.vehicle.type, props.vehicle.licensePlate], updateMap)
onMounted(() => { mounted = true; document.addEventListener('visibilitychange', syncActivity); syncActivity() })
onBeforeUnmount(() => {
  disposed = true; mounted = false; window.clearInterval(timer)
  document.removeEventListener('visibilitychange', syncActivity)
  resize?.disconnect(); clearMarker()
  if (map) google.maps.event.clearInstanceListeners(map)
  map = null
})
</script>
