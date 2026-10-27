<template>
  <div class="local-history-map relative min-h-[20rem] overflow-hidden rounded-[6px] border border-ui-border bg-ui-muted sm:min-h-[24rem]">
    <div ref="element" class="absolute inset-0" />
    <div v-if="message" class="absolute inset-0 flex items-center justify-center bg-ui-muted/95 p-5 text-center text-sm text-ui-mutedText" role="status">{{ message }}</div>
    <div v-if="ready && records.length" class="absolute right-2 top-2">
      <AppIconButton label="Pokaż całą trasę" size="sm" @click="fit"><Scan :size="16" /></AppIconButton>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, getCurrentInstance, h, onBeforeUnmount, onMounted, ref, render, watch } from 'vue'
import { Flag, Fuel, Scan, TriangleAlert } from 'lucide-vue-next'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import LocalHistoryPointPopup from './LocalHistoryPointPopup.vue'
import { loadGoogleMaps } from '@/services/googleMapsLoader'
import { DARK_STYLES } from '@/services/googleMapStyles'
import { useUiStore } from '@/stores/uiStore'
import { historySegmentBreak, validHistoryPosition, fuelEventLabel } from '@/utils/localPositionHistory'
import type { LocalFuelEvent, LocalHistoryPoint } from '@/types/localPositionHistory'
const props = defineProps<{records:LocalHistoryPoint[];events:LocalFuelEvent[];complete:boolean;loading:boolean;total:number;timezone:string}>()
const ui = useUiStore(), context = getCurrentInstance()?.appContext
const element = ref<HTMLElement>(), ready = ref(false), error = ref('')
const message = computed(() => error.value || (!ready.value ? 'Ładowanie mapy…' : !props.records.some(validHistoryPosition) ? props.loading ? 'Wczytywanie pozycji…' : 'Brak poprawnych pozycji GPS w tym zakresie.' : ''))
let google:any, map:any, bounds:any, info:any, popup:HTMLElement|null = null, resize:ResizeObserver|null = null, disposed = false
let objects:any[] = [], eventObjects:any[] = [], listeners:any[] = [], processed = 0, firstId:number|undefined, previous:LocalHistoryPoint|null = null, path:any, endMarker:any, frame:number|null = null, fitted = false
function closePopup() { info?.close(); if (popup) render(null,popup); popup = null }
function clear() {
  if (frame !== null) cancelAnimationFrame(frame); frame = null
  closePopup(); objects.forEach(o => {google?.maps.event.clearInstanceListeners(o);o.setMap(null)}); objects = []
  eventObjects.forEach(o=>{google?.maps.event.clearInstanceListeners(o);o.setMap(null)}); eventObjects = []
  processed = 0; firstId = undefined; previous = null; path = null; endMarker = null; fitted = false
  if (google) bounds = new google.maps.LatLngBounds()
}
function show(point:LocalHistoryPoint|undefined,event:LocalFuelEvent|undefined,position:{lat:number;lng:number}) {
  closePopup(); popup=document.createElement('div')
  const node = h(LocalHistoryPointPopup,{point,event,position,timezone:props.timezone});node.appContext=context || null
  render(node,popup);info.setContent(popup);info.setPosition(position);info.open({map,shouldFocus:false})
}
function svgIcon(component:any,color:string) {
  const wrapper=document.createElement('div');render(h(component,{size:20,color,strokeWidth:2.4}),wrapper)
  const svg=wrapper.innerHTML;render(null,wrapper)
  return {url:'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg),scaledSize:new google.maps.Size(22,22),anchor:new google.maps.Point(11,11)}
}
function createPoint(point:LocalHistoryPoint,kind:'point'|'start'|'end') {
  const position={lat:point.lat!,lng:point.lon!}
  const marker=new google.maps.Marker({map,position,title:kind==='start'?'Początek trasy':kind==='end'?'Koniec trasy':'Szczegóły pozycji',
    icon:kind==='point'?{path:google.maps.SymbolPath.CIRCLE,scale:3.5,fillColor:'#7093ff',fillOpacity:1,strokeColor:'#ffffff',strokeWeight:1.5}:svgIcon(Flag,kind==='start'?'#16a34a':'#dc2626'),zIndex:kind==='point'?2:4})
  marker.addListener('click',()=>show(point,undefined,position));objects.push(marker);return marker
}
function drawEvents() {
  if (!map) return
  eventObjects.forEach(o=>{google.maps.event.clearInstanceListeners(o);o.setMap(null)});eventObjects=[]
  props.events.forEach(event=>{
    if (!validHistoryPosition({lat:event.lat,lon:event.lng})) return
    const position={lat:event.lat!,lng:event.lng!}
    const marker=new google.maps.Marker({map,position,title:fuelEventLabel(event),icon:svgIcon(event.type==='POSSIBLE_REFUEL'?Fuel:TriangleAlert,event.type==='POSSIBLE_REFUEL'?'#16a34a':'#eab308'),zIndex:5})
    marker.addListener('click',()=>show(undefined,event,position));eventObjects.push(marker)
  })
}
function fit() { if (map && bounds && !bounds.isEmpty()) {map.fitBounds(bounds,32);if (map.getZoom()>17) map.setZoom(17)} }
function schedule() {
  if (!map || frame !== null) return
  frame=requestAnimationFrame(drawBatch)
}
function drawBatch() {
  frame=null;if (!map || disposed) return
  if (processed>props.records.length || (processed && firstId!==props.records[0]?.id)) clear()
  firstId=props.records[0]?.id
  const end=Math.min(props.records.length,processed+250), interval=(props.total || props.records.length)<100?1:10
  for (;processed<end;processed++) {
    const point=props.records[processed]!
    if (!validHistoryPosition(point)) continue
    const position={lat:point.lat!,lng:point.lon!};bounds.extend(position)
    if (!previous || historySegmentBreak(previous,point)) {
      path=new google.maps.MVCArray([new google.maps.LatLng(position.lat,position.lng)])
      const line=new google.maps.Polyline({map,path,strokeColor:'#7093ff',strokeWeight:5,strokeOpacity:0.95,zIndex:1})
      objects.push(line)
    } else path.push(new google.maps.LatLng(position.lat,position.lng))
    if (!previous) createPoint(point,'start')
    else if (processed%interval===0) createPoint(point,'point')
    previous=point
  }
  if (!fitted && previous) {fit();fitted=true}
  if (processed<props.records.length) schedule()
  else if (props.complete && previous) {
    if (endMarker) {google.maps.event.clearInstanceListeners(endMarker);endMarker.setMap(null)}
    endMarker=createPoint(previous,'end');fit()
  }
}
watch(()=>props.records,schedule)
watch(()=>props.complete,schedule)
watch(()=>props.events,drawEvents)
watch(()=>ui.theme,()=>map?.setOptions({styles:ui.theme==='dark'?DARK_STYLES:[]}))
onMounted(async()=>{
  try {
    const key=import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!key) throw new Error('Brak klucza Google Maps.')
    google=await loadGoogleMaps(key);if(disposed || !element.value)return
    map=new google.maps.Map(element.value,{center:{lat:52,lng:19},zoom:6,styles:ui.theme==='dark'?DARK_STYLES:[],disableDefaultUI:true,gestureHandling:'greedy'})
    bounds=new google.maps.LatLngBounds();info=new google.maps.InfoWindow()
    listeners.push(map.addListener('click',closePopup),info.addListener('closeclick',closePopup))
    resize=new ResizeObserver(()=>google.maps.event.trigger(map,'resize'));resize.observe(element.value)
    ready.value=true;drawEvents();schedule()
  } catch(cause) {if(!disposed)error.value=cause instanceof Error?cause.message:'Nie udało się załadować mapy.'}
})
onBeforeUnmount(()=>{disposed=true;resize?.disconnect();clear();listeners.forEach(l=>l.remove());if(map)google.maps.event.clearInstanceListeners(map);map=null})
</script>
<style scoped>
.local-history-map :deep(.gm-style-iw-c),
.local-history-map :deep(.gm-style-iw-tc::after) {background:rgb(var(--rw-surface));color:rgb(var(--rw-text-primary));}
.local-history-map :deep(.gm-style-iw-d) {overflow:auto !important;}
</style>
