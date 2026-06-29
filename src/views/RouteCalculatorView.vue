<template>
  <div class="relative flex h-full w-full overflow-hidden bg-app-light text-xs dark:bg-app-dark">
    <button
      v-if="routePanelCollapsed"
      type="button"
      class="absolute left-3 top-3 z-40 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:bg-app-panel dark:text-slate-200 dark:hover:bg-app-elevated"
      aria-label="Pokaz kalkulator"
      @click.stop="routePanelCollapsed = false"
    >
      <PanelLeftOpen class="h-4 w-4" />
    </button>

    <aside :class="routePanelClasses">
      <header class="flex items-center justify-between gap-3 border-b border-slate-200 p-3 dark:border-app-border">
        <h1 class="truncate text-base font-semibold text-slate-950 dark:text-slate-50">Kalkulator tras</h1>
        <button
          type="button"
          class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:bg-app-panel dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-slate-50"
          aria-label="Schowaj kalkulator"
          @click="routePanelCollapsed = true"
        >
          <PanelLeftClose class="h-4 w-4" />
        </button>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto p-3 pb-24">
        <section class="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <SectionHeader title="Pojazd" :open="sections.origin" @toggle="sections.origin = !sections.origin" />
          <div v-if="sections.origin" class="space-y-3 p-3 pt-0">
            <AppSelect
              v-model="vehicleMode"
              :options="vehicleModeOptions"
              size="sm"
            />

            <VehicleSearchSelect
              v-if="vehicleMode === 'gps'"
              v-model="selectedTruckId"
              placeholder="Wybierz ciągnik z GPS"
              vehicle-type="truck"
              :include-all="false"
            />

            <div class="rounded-2xl border border-slate-100 p-3 text-xs text-slate-500 dark:border-app-border dark:text-app-muted">
              <div class="grid grid-cols-2 gap-1">
                <span>Zestaw: 16.5 m</span>
                <span>40 t</span>
                <span>2.5 m szer.</span>
                <span>4.0 m wys.</span>
              </div>
              <p class="mt-2">
                {{ vehicleMode === 'gps' ? 'Pozycja pojazdu jest opcjonalnym punktem startowym.' : 'Trasa liczy się od punktu A.' }}
              </p>
            </div>

            <button
              v-if="vehicleMode === 'gps' && selectedTruckId"
              type="button"
              class="inline-flex h-8 items-center gap-1 rounded-xl border border-slate-200 px-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:text-app-muted dark:hover:bg-app-elevated"
              @click="clearVehicle"
            >
              <X class="h-3.5 w-3.5" />
              Wyczyść pojazd
            </button>
          </div>
        </section>

        <section class="mt-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <SectionHeader title="Punkty trasy" :open="sections.stops" @toggle="sections.stops = !sections.stops">
            <AppButton size="sm" variant="secondary" @click.stop="addStop">
              <Plus class="h-3.5 w-3.5" />
              Dodaj
            </AppButton>
          </SectionHeader>

          <div v-if="sections.stops" class="space-y-2 p-3 pt-0">
            <div
              v-for="(stop, index) in stops"
              :key="stop.id"
              class="grid grid-cols-[3.25rem_1fr_auto] items-center gap-3 rounded-2xl border border-slate-100 bg-white p-2 transition dark:border-app-border dark:bg-app-panel"
              :class="draggedStopId === stop.id ? 'border-slate-300 shadow-sm ring-2 ring-slate-200 dark:ring-app-elevated' : ''"
              :data-stop-row="stop.id"
              @dragover.prevent="moveDraggedStop(index)"
              @drop="dropStop(index)"
              @dragend="endStopDrag"
            >
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="inline-flex h-8 w-5 cursor-grab items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 active:cursor-grabbing dark:hover:bg-app-elevated dark:hover:text-slate-200"
                  draggable="true"
                  aria-label="Przenieś punkt"
                  @dragstart="startStopDrag(stop.id, $event)"
                  @dragend="endStopDrag"
                >
                  <GripVertical class="h-4 w-4" />
                </button>
                <div class="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 dark:border-app-border dark:bg-app-elevated dark:text-slate-200">
                  {{ stopLabel(index) }}
                </div>
              </div>
              <HereLocationInput
                :model-value="stop.address"
                :api-key="HERE_API_KEY"
                :placeholder="`Adres punktu ${stopLabel(index)}`"
                :at="searchBias"
                :country-code="stop.countryCode"
                :debug-logger="logHereDebug"
                @update:model-value="updateStopAddress(stop, $event)"
                @select="selectStopLocation(stop, $event)"
              />
              <div class="flex items-center">
                <button
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 dark:border-app-border dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-slate-50"
                  :disabled="stops.length <= 1"
                  aria-label="Usuń punkt"
                  @click="removeStop(stop.id)"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="mt-3 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <SectionHeader title="Koszty transportu" :open="sections.costs" @toggle="sections.costs = !sections.costs" />
          <div v-if="sections.costs" class="space-y-2 p-3 pt-0">
            <AppInput
              v-model="extraCostPerKm"
              placeholder="Dodatkowy koszt za km, EUR"
              size="sm"
              type="number"
            />
          </div>
        </section>
      </div>

      <footer class="sticky bottom-0 border-t border-slate-200 bg-app-light p-3 dark:border-app-border dark:bg-app-dark">
        <AppButton full-width :loading="isCalculating" :disabled="!canCalculate" @click="calculateRoute">
          <Calculator class="h-4 w-4" />
          Oblicz trasę
        </AppButton>
      </footer>
    </aside>

    <section class="relative min-h-0 min-w-0 flex-1">
      <div ref="mapElement" class="h-full w-full"></div>

      <div
        class="absolute top-3 z-20"
        :class="routePanelCollapsed ? 'left-14' : 'left-3'"
        @click.stop
      >
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:bg-app-panel dark:text-slate-200 dark:hover:bg-app-elevated"
          aria-label="Przelacz motyw mapy"
          @click="toggleMapTheme"
        >
          <Moon v-if="mapTheme === 'light'" class="h-4 w-4" />
          <Sun v-else class="h-4 w-4" />
        </button>
      </div>

      <div class="absolute right-3 top-3 z-20" @click.stop>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:bg-app-panel dark:text-slate-200 dark:hover:bg-app-elevated"
          aria-label="Debug HERE"
          @click="debugOpen = !debugOpen"
        >
          <FileJson class="h-4 w-4" />
        </button>

        <div
          v-if="debugOpen"
          class="mt-2 w-[min(25rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white text-xs shadow-sm dark:border-app-border dark:bg-app-panel"
        >
          <header class="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 dark:border-app-border">
            <p class="font-semibold text-slate-950 dark:text-slate-50">Odpowiedzi HERE</p>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="inline-flex h-7 w-7 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-slate-50"
                aria-label="Minimalizuj debug"
                @click="debugMinimized = !debugMinimized"
              >
                <ChevronDown v-if="debugMinimized" class="h-3.5 w-3.5" />
                <ChevronUp v-else class="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                class="inline-flex h-7 w-7 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-slate-50"
                aria-label="Wyczyść debug"
                @click="debugEntries = []"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </header>

          <div v-if="!debugMinimized" class="max-h-[55vh] overflow-y-auto p-2">
            <div v-if="!debugEntries.length" class="rounded-2xl border border-dashed border-slate-200 p-3 text-slate-500 dark:border-app-border dark:text-app-muted">
              Brak zapytań do HERE.
            </div>
            <details
              v-for="entry in debugEntries"
              :key="entry.id"
              class="mb-2 rounded-2xl border border-slate-100 p-2 last:mb-0 dark:border-app-border"
            >
              <summary class="cursor-pointer font-semibold text-slate-950 dark:text-slate-50">
                {{ entry.title }}
                <span class="ml-2 font-normal text-slate-500 dark:text-app-muted">{{ entry.createdAt }}</span>
              </summary>
              <pre class="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-2 text-[11px] text-slate-600 dark:bg-app-elevated dark:text-slate-200">{{ stringifyDebug(entry) }}</pre>
            </details>
          </div>
        </div>
      </div>

      <div
        v-if="mapMessage"
        class="absolute left-1/2 top-1/2 z-20 w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm dark:border-app-border dark:bg-app-panel"
      >
        <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">{{ mapMessage.title }}</h2>
        <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{{ mapMessage.description }}</p>
      </div>

      <div
        v-if="routeResult"
        class="absolute bottom-3 left-3 z-20 max-w-[calc(100%-1.5rem)] rounded-2xl border border-slate-200 bg-white text-xs shadow-sm dark:border-app-border dark:bg-app-panel md:w-[48rem]"
      >
        <header class="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 dark:border-app-border">
          <div>
            <p class="font-semibold text-slate-950 dark:text-slate-50">Trasy</p>
            <p v-if="selectedRouteStats" class="mt-0.5 text-[11px] text-slate-500 dark:text-app-muted">
              {{ selectedRouteStats.duration }} / {{ selectedRouteStats.distance }} / {{ selectedRouteStats.total }}
            </p>
          </div>
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-slate-50"
            aria-label="Zwin podsumowanie tras"
            @click="routesSummaryCollapsed = !routesSummaryCollapsed"
          >
            <ChevronDown v-if="routesSummaryCollapsed" class="h-3.5 w-3.5" />
            <ChevronUp v-else class="h-3.5 w-3.5" />
          </button>
        </header>

        <div v-if="!routesSummaryCollapsed" class="grid gap-2 p-2 lg:grid-cols-[1.4fr_0.7fr]">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[32rem] text-left">
              <thead class="text-[11px] uppercase text-slate-500 dark:text-app-muted">
                <tr>
                  <th class="px-2 py-1 font-medium">Opcja</th>
                  <th class="px-2 py-1 font-medium">Czas</th>
                  <th class="px-2 py-1 font-medium">Km</th>
                  <th class="px-2 py-1 font-medium">Opłaty</th>
                  <th class="px-2 py-1 font-medium">Dod. koszt</th>
                  <th class="px-2 py-1 font-medium">Razem</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in routeRows"
                  :key="row.index"
                  class="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50 dark:border-app-border dark:hover:bg-app-elevated"
                  :class="selectedRouteIndex === row.index ? 'bg-slate-50 dark:bg-app-elevated' : ''"
                  @click="selectedRouteIndex = row.index"
                >
                  <td class="px-2 py-1.5 font-semibold text-slate-950 dark:text-slate-50">{{ row.label }}</td>
                  <td class="px-2 py-1.5" :class="metricClass(row.raw.durationSeconds, selectedRouteOption?.durationSeconds)">{{ metricText(row.duration, row.raw.durationSeconds, selectedRouteOption?.durationSeconds, 'duration') }}</td>
                  <td class="px-2 py-1.5" :class="metricClass(row.raw.lengthMeters, selectedRouteOption?.lengthMeters)">{{ metricText(row.distance, row.raw.lengthMeters, selectedRouteOption?.lengthMeters, 'distance') }}</td>
                  <td class="px-2 py-1.5" :class="metricClass(row.raw.tollAmountEur, selectedRouteOption?.tollAmountEur)">{{ metricText(row.tolls, row.raw.tollAmountEur, selectedRouteOption?.tollAmountEur, 'money') }}</td>
                  <td class="px-2 py-1.5" :class="metricClass(row.extraValue, selectedRouteStats?.extraValue)">{{ metricText(row.extra, row.extraValue, selectedRouteStats?.extraValue, 'money') }}</td>
                  <td class="px-2 py-1.5 font-semibold" :class="metricClass(row.totalValue, selectedRouteStats?.totalValue)">{{ metricText(row.total, row.totalValue, selectedRouteStats?.totalValue, 'money') }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="rounded-2xl border border-slate-100 dark:border-app-border">
            <p class="border-b border-slate-100 px-3 py-2 font-semibold text-slate-950 dark:border-app-border dark:text-slate-50">Kraje</p>
            <div v-if="selectedRouteOption?.countryTolls.length">
              <div
                v-for="item in selectedRouteOption.countryTolls"
                :key="`${item.countryCode}-${item.currency}`"
                class="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-1.5 last:border-0 dark:border-app-border"
              >
                <span class="font-medium text-slate-600 dark:text-slate-300">{{ item.countryCode }}</span>
                <span class="font-semibold text-slate-950 dark:text-slate-50">{{ formatMoney(item.amount, item.currency) }}</span>
              </div>
            </div>
            <div v-else class="p-3 text-slate-500 dark:text-app-muted">Brak danych o opłatach.</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  FileJson,
  GripVertical,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sun,
  Trash2,
  X,
} from 'lucide-vue-next'
import HereLocationInput from '@/components/selects/HereLocationInput.vue'
import VehicleSearchSelect from '@/components/selects/VehicleSearchSelect.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect, { type AppSelectOption } from '@/components/ui/AppSelect.vue'
import { loadHereMaps } from '@/services/hereMapsLoader'
import {
  calculateHereRoute,
  type HereAutosuggestItem,
  type HereCoordinate,
  type HereDebugPayload,
  type HereRouteResult,
} from '@/services/hereRouteService'
import { useFleetStore } from '@/stores/fleetStore'
import { useUiStore } from '@/stores/uiStore'

interface RouteStop {
  id: string
  address: string
  coordinates: HereCoordinate | null
  countryCode: string | null
}

interface HereDebugEntry extends HereDebugPayload {
  id: string
  createdAt: string
}

const HERE_API_KEY = import.meta.env.VITE_HERE_API_KEY as string | undefined

const fleetStore = useFleetStore()
const uiStore = useUiStore()
const mapElement = ref<HTMLDivElement | null>(null)
const routePanelCollapsed = ref(false)
const vehicleMode = ref<'standard' | 'gps'>('standard')
const selectedTruckId = ref('')
const extraCostPerKm = ref('')
const isCalculating = ref(false)
const mapState = ref<'idle' | 'loading' | 'ready' | 'missing-key' | 'error'>('idle')
const routeResult = ref<HereRouteResult | null>(null)
const selectedRouteIndex = ref(0)
const routesSummaryCollapsed = ref(false)
const mapTheme = ref<'light' | 'dark'>('light')
const debugOpen = ref(false)
const debugMinimized = ref(false)
const debugEntries = ref<HereDebugEntry[]>([])
const draggedStopId = ref<string | null>(null)
const sections = reactive({
  origin: true,
  stops: true,
  costs: true,
})
const stops = reactive<RouteStop[]>([
  createStop(),
  createStop(),
])

const vehicleModeOptions: AppSelectOption[] = [
  { label: 'Standardowy ciągnik siodłowy', value: 'standard' },
  { label: 'Wybór pojazdu z GPS', value: 'gps' },
]

let HRef: any = null
let platform: any = null
let defaultLayers: any = null
let hereMap: any = null
let behavior: any = null
let ui: any = null
let routeGroup: any = null
let plannerGroup: any = null
let activeBaseLayer: any = null

const SectionHeader = defineComponent({
  props: {
    title: {
      type: String,
      required: true,
    },
    open: {
      type: Boolean,
      required: true,
    },
  },
  emits: ['toggle'],
  setup(props, { emit, slots }) {
    return () => h('header', { class: 'flex items-center justify-between gap-2 px-3 py-2.5' }, [
      h('h2', { class: 'text-sm font-semibold text-slate-950 dark:text-slate-50' }, props.title),
      h('div', { class: 'flex items-center gap-2' }, [
        slots.default?.(),
        h('button', {
          type: 'button',
          class: 'inline-flex h-7 w-7 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-slate-50',
          'aria-label': props.open ? 'Zwin sekcje' : 'Rozwin sekcje',
          onClick: () => emit('toggle'),
        }, [
          h(props.open ? ChevronUp : ChevronDown, { class: 'h-3.5 w-3.5' }),
        ]),
      ]),
    ])
  },
})

const routePanelClasses = computed(() => {
  const base = 'absolute inset-y-0 left-0 z-30 flex min-h-0 w-full max-w-full flex-col border-r border-slate-200 bg-app-light shadow-sm transition-[width,transform] duration-200 ease-out dark:border-app-border dark:bg-app-dark md:relative md:z-auto md:max-w-none md:shadow-none'

  return routePanelCollapsed.value
    ? `${base} -translate-x-full md:w-0 md:translate-x-0 md:overflow-hidden md:border-r-0`
    : `${base} translate-x-0 md:w-96 md:translate-x-0`
})

const selectedTruck = computed(() => (
  selectedTruckId.value
    ? fleetStore.vehicles.find((vehicle) => vehicle.id === selectedTruckId.value) || null
    : null
))

const selectedTruckCoordinates = computed<HereCoordinate | null>(() => {
  const vehicle = selectedTruck.value

  if (!vehicle?.hasPosition) {
    return null
  }

  return {
    lat: vehicle.latitude,
    lng: vehicle.longitude,
    label: vehicle.plateNumber,
    countryCode: vehicle.countryCode,
  }
})

const currentOriginCoordinates = computed(() => vehicleMode.value === 'gps' ? selectedTruckCoordinates.value : null)
const hasOrigin = computed(() => Boolean(currentOriginCoordinates.value))
const searchBias = computed(() => currentOriginCoordinates.value || undefined)

const activeStops = computed(() => stops
  .map((stop, index) => ({
    stop,
    label: stopLabel(index),
    query: stop.address.trim(),
  }))
  .filter((item) => item.query))

const canCalculate = computed(() => {
  if (!HERE_API_KEY) {
    return false
  }

  return hasOrigin.value ? activeStops.value.length >= 1 : activeStops.value.length >= 2
})

const mapMessage = computed(() => {
  if (mapState.value === 'missing-key') {
    return {
      title: 'Brak klucza HERE',
      description: 'Dodaj VITE_HERE_API_KEY w pliku .env.local i odswiez aplikacje.',
    }
  }

  if (mapState.value === 'error') {
    return {
      title: 'Nie udalo sie zaladowac HERE Maps',
      description: 'Sprawdz klucz API, polaczenie oraz dostep do skryptow HERE.',
    }
  }

  return null
})

const selectedRouteOption = computed(() => routeResult.value?.routes[selectedRouteIndex.value] || null)
const fastestRouteIndex = computed(() => bestRouteIndexBy((route) => route.durationSeconds))
const shortestRouteIndex = computed(() => bestRouteIndexBy((route) => route.lengthMeters))
const cheapestRouteIndex = computed(() => bestRouteIndexBy((route) => route.tollAmountEur + (route.lengthMeters / 1000) * extraCostRate.value))
const extraCostRate = computed(() => {
  const parsed = Number(String(extraCostPerKm.value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
})

const selectedRouteStats = computed(() => {
  const route = selectedRouteOption.value

  if (!route) {
    return null
  }

  const kilometers = route.lengthMeters / 1000
  const extraValue = kilometers * extraCostRate.value
  const totalValue = route.tollAmountEur + extraValue

  return {
    duration: formatDuration(route.durationSeconds),
    distance: `${formatNumber(kilometers)} km`,
    extraValue,
    totalValue,
    total: formatMoney(totalValue, 'EUR'),
  }
})

const routeRows = computed(() => (routeResult.value?.routes || []).map((route, index) => {
  const kilometers = route.lengthMeters / 1000
  const extra = kilometers * extraCostRate.value
  const tolls = route.tollAmountEur
  const labels = [
    index === fastestRouteIndex.value ? 'Najszybsza' : null,
    index === shortestRouteIndex.value ? 'Najkrótsza' : null,
    index === cheapestRouteIndex.value ? 'Najtańsza' : null,
  ].filter(Boolean) as string[]

  return {
    index,
    raw: route,
    label: labels.length ? labels.join(' / ') : `Trasa ${index + 1}`,
    duration: formatDuration(route.durationSeconds),
    distance: `${formatNumber(kilometers)} km`,
    tolls: formatMoney(tolls, 'EUR'),
    extra: formatMoney(extra, 'EUR'),
    extraValue: extra,
    totalValue: tolls + extra,
    total: formatMoney(tolls + extra, 'EUR'),
  }
}))

function createStop(): RouteStop {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    address: '',
    coordinates: null,
    countryCode: null,
  }
}

function stopLabel(index: number) {
  return String.fromCharCode(65 + index)
}

function addStop() {
  stops.push(createStop())
}

function clearVehicle() {
  selectedTruckId.value = ''
  renderPlannerObjects()
}

function removeStop(id: string) {
  if (stops.length <= 1) {
    return
  }

  const index = stops.findIndex((stop) => stop.id === id)

  if (index >= 0) {
    stops.splice(index, 1)
    renderPlannerObjects()
  }
}

function startStopDrag(stopId: string, event: DragEvent) {
  draggedStopId.value = stopId
  event.dataTransfer?.setData('text/plain', stopId)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }

  const row = document.querySelector<HTMLElement>(`[data-stop-row="${stopId}"]`)

  if (row) {
    event.dataTransfer?.setDragImage?.(row, 24, 24)
  }
}

function moveDraggedStop(targetIndex: number) {
  if (!draggedStopId.value) {
    return
  }

  const currentIndex = stops.findIndex((stop) => stop.id === draggedStopId.value)

  if (currentIndex < 0 || currentIndex === targetIndex) {
    return
  }

  const [stop] = stops.splice(currentIndex, 1)
  stops.splice(targetIndex, 0, stop)
  renderPlannerObjects()
}

function dropStop(targetIndex: number) {
  if (!draggedStopId.value) {
    return
  }

  const currentIndex = stops.findIndex((stop) => stop.id === draggedStopId.value)

  if (currentIndex < 0 || currentIndex === targetIndex) {
    draggedStopId.value = null
    return
  }

  const [stop] = stops.splice(currentIndex, 1)
  stops.splice(targetIndex, 0, stop)
  draggedStopId.value = null
  renderPlannerObjects()
}

function endStopDrag() {
  draggedStopId.value = null
}

function updateStopAddress(stop: RouteStop, value: string) {
  stop.address = value
  stop.coordinates = null
  stop.countryCode = null
  renderPlannerObjects()
}

function selectStopLocation(stop: RouteStop, item: HereAutosuggestItem) {
  stop.address = item.addressLabel || item.title
  stop.coordinates = item.coordinates
  stop.countryCode = item.countryCode
  renderPlannerObjects()
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pl-PL', {
    maximumFractionDigits: 1,
  }).format(value)
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)

  if (!hours) {
    return `${minutes} min`
  }

  return `${hours} h ${minutes} min`
}

function formatDurationDelta(seconds: number) {
  const absoluteSeconds = Math.abs(seconds)
  const hours = Math.floor(absoluteSeconds / 3600)
  const minutes = Math.round((absoluteSeconds % 3600) / 60)
  const sign = seconds > 0 ? '+' : '-'

  if (!hours) {
    return `${sign}${minutes} min`
  }

  return `${sign}${hours} h ${minutes} min`
}

function formatDistanceDelta(meters: number) {
  const sign = meters > 0 ? '+' : '-'
  return `${sign}${formatNumber(Math.abs(meters) / 1000)} km`
}

function formatMoneyDelta(value: number) {
  const sign = value > 0 ? '+' : '-'
  return `${sign}${formatMoney(Math.abs(value), 'EUR')}`
}

function stringifyDebug(entry: HereDebugEntry) {
  const { id, createdAt, ...payload } = entry
  return JSON.stringify(payload, null, 2)
}

function logHereDebug(payload: HereDebugPayload) {
  debugEntries.value = [
    {
      ...payload,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    },
    ...debugEntries.value,
  ].slice(0, 30)
}

function bestRouteIndexBy(selector: (route: NonNullable<HereRouteResult['routes']>[number]) => number) {
  const routes = routeResult.value?.routes || []

  if (!routes.length) {
    return -1
  }

  return routes.reduce((bestIndex, route, index) => (
    selector(route) < selector(routes[bestIndex]) ? index : bestIndex
  ), 0)
}

function metricClass(value: number | undefined, selectedValue: number | undefined) {
  if (value === undefined || selectedValue === undefined || value === selectedValue) {
    return 'text-slate-700 dark:text-slate-200'
  }

  return value < selectedValue
    ? 'font-semibold text-success-600 dark:text-success-400'
    : 'font-semibold text-danger-600 dark:text-danger-400'
}

function metricText(absoluteText: string, value: number | undefined, selectedValue: number | undefined, type: 'duration' | 'distance' | 'money') {
  if (value === undefined || selectedValue === undefined || value === selectedValue) {
    return absoluteText
  }

  const delta = value - selectedValue

  if (type === 'duration') {
    return formatDurationDelta(delta)
  }

  if (type === 'distance') {
    return formatDistanceDelta(delta)
  }

  return formatMoneyDelta(delta)
}

function createPointIcon(label: string, variant: 'origin' | 'stop') {
  return new HRef.map.DomIcon(`
    <div class="rw-here-point-marker-wrap">
      <div class="rw-here-point-marker rw-here-point-marker-${variant}">
        ${label}
      </div>
      <span class="rw-here-point-marker-pin"></span>
    </div>
  `)
}

function clearRouteObjects() {
  routeGroup?.removeAll()
}

function clearPlannerObjects() {
  plannerGroup?.removeAll()
}

function fitGroup(group: any) {
  const bounds = group?.getBoundingBox?.()

  if (bounds && hereMap) {
    hereMap.getViewModel().setLookAtData({ bounds }, true)
  }
}

function renderPlannerObjects() {
  if (!HRef || !plannerGroup) {
    return
  }

  clearPlannerObjects()

  const origin = currentOriginCoordinates.value

  if (origin) {
    plannerGroup.addObject(new HRef.map.DomMarker(origin, {
      icon: createPointIcon('S', 'origin'),
    }))
  }

  stops.forEach((stop, index) => {
    if (!stop.coordinates) {
      return
    }

    plannerGroup.addObject(new HRef.map.DomMarker(stop.coordinates, {
      icon: createPointIcon(stopLabel(index), 'stop'),
    }))
  })
}

function renderRoute(result: HereRouteResult, shouldFit = false) {
  if (!HRef || !routeGroup) {
    return
  }

  clearRouteObjects()

  const routeIndexes = result.routes
    .map((_, index) => index)
    .sort((first, second) => {
      if (first === selectedRouteIndex.value) {
        return 1
      }

      if (second === selectedRouteIndex.value) {
        return -1
      }

      return 0
    })

  routeIndexes.forEach((routeIndex) => {
    const route = result.routes[routeIndex]

    route.polylineSections.forEach((polyline) => {
      const lineString = HRef.geo.LineString.fromFlexiblePolyline(polyline)
      const isSelected = routeIndex === selectedRouteIndex.value
      const routeLine = new HRef.map.Polyline(lineString, {
        style: {
          lineWidth: isSelected ? 7 : 4,
          strokeColor: isSelected ? '#7093ff' : 'rgba(100, 116, 139, 0.55)',
          lineTailCap: 'round',
          lineHeadCap: 'round',
        },
      })

      routeLine.addEventListener('tap', () => {
        selectedRouteIndex.value = routeIndex
      })
      routeGroup.addObject(routeLine)
    })
  })

  if (shouldFit) {
    fitGroup(routeGroup)
  }
}

function applyResolvedCoordinates(result: HereRouteResult, usedActiveStops: typeof activeStops.value, routeStopsStartIndex: number) {
  if (!hasOrigin.value && usedActiveStops[0]) {
    usedActiveStops[0].stop.coordinates = result.resolvedOrigin
    usedActiveStops[0].stop.countryCode = result.resolvedOrigin.countryCode || usedActiveStops[0].stop.countryCode
  }

  result.resolvedStops.forEach((resolvedStop, index) => {
    const activeStop = usedActiveStops[index + routeStopsStartIndex]

    if (activeStop) {
      activeStop.stop.coordinates = resolvedStop.coordinates
      activeStop.stop.countryCode = resolvedStop.coordinates.countryCode || activeStop.stop.countryCode
    }
  })
}

async function calculateRoute() {
  if (!HERE_API_KEY || !canCalculate.value) {
    return
  }

  isCalculating.value = true

  try {
    const usedActiveStops = [...activeStops.value]
    const routeStopsStartIndex = hasOrigin.value ? 0 : 1
    const request = hasOrigin.value
      ? {
          apiKey: HERE_API_KEY,
          origin: currentOriginCoordinates.value!,
          stops: usedActiveStops.map((item) => ({
            label: item.label,
            query: item.query,
            coordinates: item.stop.coordinates || undefined,
          })),
          onDebug: logHereDebug,
        }
      : {
          apiKey: HERE_API_KEY,
          origin: usedActiveStops[0].stop.coordinates || usedActiveStops[0].query,
          stops: usedActiveStops.slice(1).map((item) => ({
            label: item.label,
            query: item.query,
            coordinates: item.stop.coordinates || undefined,
          })),
          onDebug: logHereDebug,
        }

    const result = await calculateHereRoute(request)
    routeResult.value = result
    selectedRouteIndex.value = bestRouteIndexBy((route) => route.durationSeconds)
    applyResolvedCoordinates(result, usedActiveStops, routeStopsStartIndex)
    renderPlannerObjects()
    renderRoute(result, true)
  } catch (error) {
    uiStore.addToast({
      type: 'error',
      title: 'Nie udalo sie obliczyc trasy',
      message: error instanceof Error ? error.message : 'Sprawdz punkty trasy i sprobuj ponownie.',
    })
  } finally {
    isCalculating.value = false
  }
}

async function initializeHereMap() {
  if (!HERE_API_KEY) {
    mapState.value = 'missing-key'
    return
  }

  if (!mapElement.value) {
    return
  }

  try {
    mapState.value = 'loading'
    HRef = await loadHereMaps()
    platform = new HRef.service.Platform({ apikey: HERE_API_KEY })
    defaultLayers = platform.createDefaultLayers()
    activeBaseLayer = baseLayerForTheme()
    hereMap = new HRef.Map(mapElement.value, activeBaseLayer, {
      center: { lat: 52.1, lng: 19.4 },
      zoom: 6,
      pixelRatio: window.devicePixelRatio || 1,
    })
    behavior = new HRef.mapevents.Behavior(new HRef.mapevents.MapEvents(hereMap))
    ui = HRef.ui.UI.createDefault(hereMap, defaultLayers)
    routeGroup = new HRef.map.Group()
    plannerGroup = new HRef.map.Group()
    hereMap.addObject(routeGroup)
    hereMap.addObject(plannerGroup)
    mapState.value = 'ready'
    renderPlannerObjects()
  } catch {
    mapState.value = 'error'
  }
}

function baseLayerForTheme() {
  if (!defaultLayers) {
    return null
  }

  if (mapTheme.value === 'dark') {
    return defaultLayers.vector?.normal?.night || defaultLayers.vector?.normal?.map
  }

  return defaultLayers.vector?.normal?.map
}

function applyMapBaseLayer() {
  const layer = baseLayerForTheme()

  if (hereMap && layer && layer !== activeBaseLayer) {
    activeBaseLayer = layer
    hereMap.setBaseLayer(layer)
  }
}

function toggleMapTheme() {
  mapTheme.value = mapTheme.value === 'light' ? 'dark' : 'light'
  applyMapBaseLayer()
}

function resizeMap() {
  hereMap?.getViewPort()?.resize()
}

watch(routePanelCollapsed, () => {
  window.setTimeout(resizeMap, 220)
})

watch(vehicleMode, () => {
  if (vehicleMode.value === 'standard') {
    selectedTruckId.value = ''
  }

  renderPlannerObjects()
})

watch(selectedTruckId, (vehicleId) => {
  renderPlannerObjects()
})

watch(selectedRouteIndex, () => {
  if (routeResult.value) {
    renderRoute(routeResult.value)
  }
})

onMounted(() => {
  if (!fleetStore.apiVehicles.length) {
    void fleetStore.loadFleetData({ silent: true })
  }

  void initializeHereMap()
  window.addEventListener('resize', resizeMap)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeMap)
  clearRouteObjects()
  clearPlannerObjects()
  routeGroup = null
  plannerGroup = null
  ui?.dispose?.()
  behavior?.dispose?.()
  hereMap?.dispose?.()
  ui = null
  behavior = null
  hereMap = null
})
</script>

<style>
.rw-here-point-marker-wrap {
  position: relative;
  transform: translate(-50%, calc(-100% - 8px));
}

.rw-here-point-marker {
  display: grid;
  height: 30px;
  min-width: 30px;
  place-items: center;
  border: 2px solid #ffffff;
  border-radius: 9999px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.28);
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  outline: 1px solid rgba(15, 23, 42, 0.35);
}

.rw-here-point-marker-pin {
  position: absolute;
  bottom: -7px;
  left: 50%;
  height: 12px;
  width: 12px;
  border-bottom: 2px solid #ffffff;
  border-right: 2px solid #ffffff;
  background: currentColor;
  transform: translateX(-50%) rotate(45deg);
  box-shadow: 2px 2px 4px rgba(15, 23, 42, 0.18);
}

.rw-here-point-marker-origin,
.rw-here-point-marker-origin + .rw-here-point-marker-pin {
  background: #111827;
  color: #111827;
}

.rw-here-point-marker-origin {
  color: #ffffff;
}

.rw-here-point-marker-stop,
.rw-here-point-marker-stop + .rw-here-point-marker-pin {
  background: #7093ff;
  color: #7093ff;
}

.rw-here-point-marker-stop {
  color: #ffffff;
}
</style>
