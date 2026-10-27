<template><FuelStationHistoryModal /></template>
<script setup lang="ts">
import { getCurrentInstance, h, onBeforeUnmount, render, watch } from 'vue'
import { Fuel } from 'lucide-vue-next'
import FuelStationMapPopup from './FuelStationMapPopup.vue'
import FuelStationHistoryModal from './FuelStationHistoryModal.vue'
import { useFuelStationStore } from '@/stores/fuelStationStore'
import { useAuthStore } from '@/stores/authStore'
import type { FuelStation } from '@/types/fuelStation'
const props = defineProps<{ map: any }>()
const store = useFuelStationStore(), auth = useAuthStore()
const context = getCurrentInstance()!.appContext
type MountedOverlay = { overlay: any; element: HTMLElement }
const markers = new Map<number, MountedOverlay>()
let popup: MountedOverlay | null = null, popupId: number | null = null, mapListener: any = null
function closePopup() { popup?.overlay.setMap(null); popup = null; popupId = null }
function dispose() { closePopup(); for (const m of markers.values()) m.overlay.setMap(null); markers.clear(); mapListener?.remove(); mapListener = null }
function openPopup(station: FuelStation) {
  closePopup()
  if (!props.map) return
  const overlay = new window.google.maps.OverlayView(), element = document.createElement('div')
  element.style.cssText = 'position:absolute;z-index:100000;pointer-events:auto;'
  element.addEventListener('click', event => event.stopPropagation())
  element.addEventListener('keydown', event => { if (event.key === 'Escape') { closePopup(); markers.get(station.id)?.element.focus() } })
  const vnode = h(FuelStationMapPopup, { station, onClose: closePopup, onHistory: (s: FuelStation) => { void store.loadHistory(s) } })
  vnode.appContext = context
  overlay.onAdd = () => { overlay.getPanes()?.floatPane.appendChild(element); render(vnode, element) }
  overlay.draw = () => {
    const projection = overlay.getProjection(), position = new window.google.maps.LatLng(station.lat, station.lng)
    const p = projection?.fromLatLngToDivPixel(position), c = projection?.fromLatLngToContainerPixel(position)
    if (!p || !c) return
    const mapDiv = props.map.getDiv(), width = element.offsetWidth, height = element.offsetHeight
    const targetX = Math.max(width / 2 + 8, Math.min(mapDiv.clientWidth - width / 2 - 8, c.x))
    const desiredY = c.y - height - 20 >= 8 ? c.y - height - 20 : c.y + 20
    const targetY = Math.max(8, Math.min(mapDiv.clientHeight - height - 8, desiredY))
    element.style.left = `${p.x + targetX - c.x - width / 2}px`
    element.style.top = `${p.y + targetY - c.y}px`
  }
  overlay.onRemove = () => { render(null, element); element.remove() }
  popup = { overlay, element }; popupId = station.id
  overlay.setMap(props.map)
  requestAnimationFrame(() => { if (popup?.overlay === overlay) overlay.draw() })
}
function syncMarkers() {
  if (!props.map || !window.google?.maps) return
  const stations = store.visibleMapStations, ids = new Set(stations.map(s => s.id))
  for (const [id, m] of markers) if (!ids.has(id)) { m.overlay.setMap(null); markers.delete(id) }
  if (popupId != null && !ids.has(popupId)) closePopup()
  for (const station of stations) {
    if (markers.has(station.id)) continue
    const overlay = new window.google.maps.OverlayView(), element = document.createElement('button')
    element.type = 'button'; element.title = station.stationName
    element.setAttribute('aria-label', `Stacja paliw ${station.stationName}`)
    element.className = 'flex h-7 w-7 items-center justify-center rounded-md border border-ui-border-strong bg-ui-dropdown text-ui-text shadow-soft hover:bg-ui-dropdown-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus'
    element.style.cssText = 'position:absolute;transform:translate(-50%,-50%);z-index:4;pointer-events:auto;'
    element.addEventListener('click', event => { event.stopPropagation(); openPopup(station) })
    overlay.onAdd = () => { overlay.getPanes()?.overlayMouseTarget.appendChild(element); render(h(Fuel, { class: 'h-4 w-4', 'aria-hidden': true }), element) }
    overlay.draw = () => { const p = overlay.getProjection()?.fromLatLngToDivPixel(new window.google.maps.LatLng(station.lat, station.lng)); if (p) { element.style.left = `${p.x}px`; element.style.top = `${p.y}px` } }
    overlay.onRemove = () => { render(null, element); element.remove() }
    markers.set(station.id, { overlay, element }); overlay.setMap(props.map)
  }
}
watch(() => props.map, map => { dispose(); if (map) { mapListener = map.addListener('click', closePopup); syncMarkers() } }, { immediate: true })
watch(() => store.visibleMapStations, syncMarkers)
watch(() => store.allStations, () => { dispose(); if (props.map) mapListener = props.map.addListener('click', closePopup); syncMarkers() })
watch(() => auth.activeCompanyId, id => { dispose(); store.ensureCompany(id); if (store.mapEnabled) void store.loadMapStations() }, { immediate: true })
watch(() => store.mapEnabled, enabled => { if (enabled) void store.loadMapStations(); else closePopup() }, { immediate: true })
onBeforeUnmount(() => { dispose(); store.closeHistory() })
</script>
