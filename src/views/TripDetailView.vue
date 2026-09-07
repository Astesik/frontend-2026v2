<template>
  <div v-if="trip" class="space-y-4 pb-2">
    <div>
      <AppIconLink to="/trips" label="Wróć do wyjazdów"><ArrowLeft class="h-4 w-4" /></AppIconLink>
    </div>

    <section class="relative h-[42vh] min-h-[300px] overflow-hidden rounded-[var(--rw-radius-panel)] border border-ui-border bg-ui-muted shadow-soft">
      <div ref="mapElement" class="h-full w-full"></div>
      <div v-if="mapState !== 'ready'" class="absolute inset-0 flex items-center justify-center bg-ui-muted">
        <div class="max-w-sm px-5 text-center">
          <LoaderCircle v-if="mapState === 'loading'" class="mx-auto h-6 w-6 animate-spin text-ui-icon" />
          <MapPinned v-else class="mx-auto h-7 w-7 text-ui-icon" />
          <p class="mt-3 text-sm font-semibold text-ui-text">{{ mapState === 'loading' ? 'Ładowanie mapy' : 'Mapa jest niedostępna' }}</p>
          <p v-if="mapState === 'error'" class="mt-1 ui-body-sm text-ui-mutedText">Sprawdź klucz `VITE_GOOGLE_MAPS_API_KEY`.</p>
        </div>
      </div>
      <div v-if="mapState === 'ready'" class="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-2">
        <span class="rounded-[6px] border border-ui-border bg-ui-surface/95 px-2.5 py-1 text-[11px] font-medium text-ui-text shadow-popover">Trasa {{ formatDistance(trip.distanceKm) }}</span>
        <span class="rounded-[6px] border border-ui-border bg-ui-surface/95 px-2.5 py-1 text-[11px] font-medium text-ui-text shadow-popover">Tankowania {{ trip.fuelStops.length }}</span>
      </div>
    </section>

    <section class="grid min-w-0 gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <div class="min-w-0 space-y-4">
        <article class="ui-surface overflow-hidden">
          <header class="border-b border-ui-divider px-4 py-3">
            <p class="ui-card-title">Główne informacje</p>
          </header>
          <dl>
            <div v-for="(item, index) in mainInformation" :key="item.label" class="flex min-w-0 items-center justify-between gap-3 border-ui-divider px-4 py-2.5" :class="index ? 'border-t' : ''">
              <dt class="flex min-w-0 items-center gap-2 text-xs text-ui-mutedText"><component :is="item.icon" class="h-4 w-4 shrink-0 text-ui-icon" />{{ item.label }}</dt>
              <dd class="min-w-0 text-right text-sm font-semibold tabular-nums text-ui-text">
                {{ item.value }}
                <span v-if="item.hint" class="ml-1 text-[10px] font-medium text-ui-mutedText">{{ item.hint }}</span>
              </dd>
            </div>
          </dl>
        </article>

        <article class="ui-surface overflow-hidden">
          <header class="border-b border-ui-divider px-4 py-3"><p class="ui-card-title">Tachograf</p></header>
          <div class="space-y-4 p-4">
            <div v-for="limit in tachographLimits" :key="limit.label">
              <div class="mb-1.5 flex items-end justify-between gap-3">
                <span class="text-xs text-ui-text-secondary">{{ limit.label }}</span>
                <span class="text-sm font-semibold tabular-nums text-ui-text">{{ formatHours(limit.value) }} <small class="font-medium text-ui-mutedText">/ {{ limit.max }} h</small></span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-ui-muted">
                <div class="h-full rounded-full transition-all" :class="limit.value / limit.max >= 0.9 ? 'bg-danger-500' : 'bg-info-600'" :style="{ width: `${Math.min(100, (limit.value / limit.max) * 100)}%` }"></div>
              </div>
            </div>
          </div>
        </article>

        <article class="ui-surface overflow-hidden">
          <header class="flex items-center justify-between border-b border-ui-divider px-4 py-3">
            <p class="ui-card-title">Historia tankowań</p>
            <span class="ui-caption">{{ trip.fuelStops.length }}</span>
          </header>
          <div class="overflow-x-auto">
            <table class="w-full table-fixed text-left">
              <thead class="bg-ui-muted text-[10px] font-semibold uppercase text-ui-mutedText">
                <tr><th class="w-[42%] px-3 py-2">Data</th><th class="w-[38%] border-l border-ui-divider px-3 py-2">Miejsce</th><th class="w-[20%] border-l border-ui-divider px-3 py-2 text-right">Litry</th></tr>
              </thead>
              <tbody class="divide-y divide-ui-divider">
                <tr v-for="stop in trip.fuelStops" :key="stop.id">
                  <td class="px-3 py-2 text-[11px] text-ui-text-secondary">{{ formatCompactDateTime(stop.timestamp) }}</td>
                  <td class="truncate border-l border-ui-divider px-3 py-2 text-[11px] font-medium text-ui-text" :title="stop.place">{{ stop.place }}</td>
                  <td class="border-l border-ui-divider px-3 py-2 text-right text-[11px] font-semibold tabular-nums text-ui-text">{{ stop.liters }} l</td>
                </tr>
                <tr v-if="!trip.fuelStops.length"><td colspan="3" class="px-4 py-6 text-center ui-body-sm text-ui-mutedText">Brak zarejestrowanych tankowań.</td></tr>
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <article class="ui-surface min-w-0 self-start overflow-hidden xl:sticky xl:top-0">
        <header class="border-b border-ui-divider px-4 py-3">
          <p class="ui-card-title">Aktywność kierowcy</p>
          <div class="mt-1 flex flex-wrap gap-3 text-[11px] text-ui-mutedText">
            <span class="inline-flex items-center gap-1.5"><i class="h-2.5 w-2.5 rounded-[2px] bg-info-600"></i>Pauza</span>
            <span class="inline-flex items-center gap-1.5"><i class="h-2.5 w-2.5 rounded-[2px] bg-danger-500"></i>Jazda</span>
            <span class="inline-flex items-center gap-1.5"><i class="h-2.5 w-2.5 rounded-[2px] bg-[#93633f]"></i>Inna praca</span>
          </div>
        </header>
        <div class="overflow-x-auto p-4"><TripActivityTimeline :days="trip.activityDays" /></div>
      </article>
    </section>
  </div>

  <section v-else class="ui-surface flex min-h-72 flex-col items-center justify-center p-6 text-center">
    <Route class="h-8 w-8 text-ui-icon" />
    <p class="mt-3 ui-section-title">Nie znaleziono wyjazdu</p>
    <AppButton class="mt-4" variant="secondary" @click="router.push('/trips')">Wróć do listy</AppButton>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CreditCard, Fuel, LoaderCircle, MapPinned, Route, RouteIcon, Truck, UserRound } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppIconLink from '@/components/ui/AppIconLink.vue'
import TripActivityTimeline from '@/components/trips/TripActivityTimeline.vue'
import { loadGoogleMaps } from '@/services/googleMapsLoader'
import { useTripStore } from '@/stores/tripStore'
import { useUiStore } from '@/stores/uiStore'

const route = useRoute()
const router = useRouter()
const tripStore = useTripStore()
const uiStore = useUiStore()
const trip = computed(() => tripStore.tripById(String(route.params.id)))
const mapElement = ref<HTMLElement | null>(null)
const mapState = ref<'loading' | 'ready' | 'error'>('loading')
let map: any = null
let routeLine: any = null
let mapMarkers: any[] = []

const mainInformation = computed(() => trip.value ? [
  { label: 'Auto / naczepa', value: `${trip.value.vehiclePlate} / ${trip.value.trailerPlate || '—'}`, icon: Truck },
  { label: 'Kierowca', value: trip.value.driverName, icon: UserRound },
  { label: 'Podsumowanie trasy', value: formatDistance(trip.value.distanceKm), hint: `${kilometersPerDay.value} km/dzień`, icon: RouteIcon },
  { label: 'Średnie spalanie GPS', value: `${trip.value.averageFuelConsumption.toLocaleString('pl-PL')} l/100 km`, icon: Fuel },
  { label: 'Średnie spalanie', value: `${trip.value.fuelCardAverageConsumption.toLocaleString('pl-PL')} l/100 km`, icon: CreditCard },
] : [])
const tachographLimits = computed(() => trip.value ? [
  { label: 'Jazda tygodniowa', value: trip.value.weeklyDrivingHours, max: 56 },
  { label: 'Jazda dwutygodniowa', value: trip.value.biweeklyDrivingHours, max: 90 },
] : [])
const kilometersPerDay = computed(() => {
  if (!trip.value) return 0
  const start = new Date(trip.value.departureDate).getTime()
  const end = trip.value.returnDate ? new Date(trip.value.returnDate).getTime() : Date.now()
  const days = Math.max(1, (end - start) / 86400000)
  return Math.round(trip.value.distanceKm / days)
})

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatCompactDateTime(value: string) {
  return new Date(value).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatDistance(value: number) {
  return `${value.toLocaleString('pl-PL')} km`
}

function formatHours(value: number) {
  const hours = Math.floor(value)
  const minutes = Math.round((value - hours) * 60)
  return `${hours} h ${minutes} min`
}

function clearMapObjects() {
  routeLine?.setMap(null)
  routeLine = null
  mapMarkers.forEach((marker) => marker.setMap(null))
  mapMarkers = []
}

function mapStyles() {
  if (uiStore.theme !== 'dark') return null
  return [
    { elementType: 'geometry', stylers: [{ color: '#2d2d2f' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#b8b8bd' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#2d2d2f' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#49494d' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#5b5b61' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#242b35' }] },
  ]
}

function renderTripOnMap(google: any) {
  if (!map || !trip.value) return
  clearMapObjects()

  const bounds = new google.maps.LatLngBounds()
  trip.value.route.forEach((point) => bounds.extend(point))
  routeLine = new google.maps.Polyline({
    map,
    path: trip.value.route,
    strokeColor: '#7093ff',
    strokeOpacity: 1,
    strokeWeight: 5,
  })

  const terminalPoints = [trip.value.route[0], trip.value.route[trip.value.route.length - 1]]
  terminalPoints.forEach((point, index) => {
    if (!point) return
    mapMarkers.push(new google.maps.Marker({
      map,
      position: point,
      label: { text: index === 0 ? 'A' : 'B', color: '#ffffff', fontWeight: '700' },
      icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: index === 0 ? '#3f7f64' : '#c94f45', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2, scale: 11 },
      title: index === 0 ? 'Początek wyjazdu' : 'Ostatnia pozycja',
    }))
  })

  trip.value.fuelStops.forEach((stop) => {
    mapMarkers.push(new google.maps.Marker({
      map,
      position: stop,
      label: { text: 'F', color: '#ffffff', fontSize: '10px', fontWeight: '700' },
      icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: '#93633f', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 2, scale: 9 },
      title: `${stop.place} · ${stop.liters} l · ${formatDateTime(stop.timestamp)}`,
    }))
  })

  map.fitBounds(bounds, 42)
}

async function initializeMap() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey || !mapElement.value || !trip.value) {
    mapState.value = 'error'
    return
  }

  try {
    const google = await loadGoogleMaps(apiKey)
    await nextTick()
    if (!mapElement.value) return
    map = new google.maps.Map(mapElement.value, {
      center: trip.value.route[0],
      zoom: 6,
      styles: mapStyles(),
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      clickableIcons: false,
      gestureHandling: 'greedy',
    })
    renderTripOnMap(google)
    mapState.value = 'ready'
  } catch {
    mapState.value = 'error'
  }
}

watch(() => uiStore.theme, () => map?.setOptions({ styles: mapStyles() }))
onMounted(initializeMap)
onBeforeUnmount(() => {
  clearMapObjects()
  map = null
})
</script>
