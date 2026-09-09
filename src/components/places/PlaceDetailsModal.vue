<template>
  <AppModal
    :open="open"
    :title="activePlace ? activePlace.name : 'Dodaj miejsce'"
    size="full"
    :busy="placeStore.isMutating"
    panel-class="h-[calc(100dvh-1.5rem)] sm:h-[min(780px,calc(100dvh-2.5rem))]"
    body-class="!overflow-hidden !p-0"
    @close="emit('close')"
  >
    <div class="grid h-full min-h-0 overflow-y-auto lg:grid-cols-[21rem_minmax(0,1fr)] lg:overflow-hidden">
      <aside class="flex min-h-0 flex-col border-b border-ui-divider bg-ui-surface lg:border-b-0 lg:border-r">
        <nav v-if="activePlace" class="grid shrink-0 grid-cols-2 gap-1 border-b border-ui-divider bg-ui-muted p-2" aria-label="Sekcje miejsca">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            type="button"
            class="h-8 rounded-[6px] border text-xs font-semibold transition"
            :class="activeTab === tab.value ? 'border-ui-border-strong bg-ui-surface text-ui-text shadow-soft' : 'border-transparent text-ui-mutedText hover:bg-ui-hover hover:text-ui-text'"
            @click="activeTab = tab.value"
          >
            {{ tab.label }}
          </button>
        </nav>

        <div class="min-h-0 flex-1 overflow-y-auto p-4">
          <template v-if="activeTab === 'info'">
            <form v-if="isEditing || !activePlace" id="place-details-form" class="space-y-3" @submit.prevent="savePlace">
              <AppInput v-model="form.name" label="Nazwa" placeholder="Np. Baza Warszawa" size="sm" required />
              <AppInput v-model="form.city" label="Miasto" placeholder="Warszawa" size="sm" />
              <AppInput v-model="form.phone" label="Telefon" placeholder="+48 000 000 000" size="sm" />
              <AppInput v-model="form.email" label="E-mail" type="email" placeholder="kontakt@firma.pl" size="sm" />
              <AppInput v-model="form.radiusMeters" label="Promień strefy (m)" type="number" min="1" placeholder="100" size="sm" required />

              <label class="block">
                <span class="mb-1 block text-xs font-medium text-ui-text-secondary">Kolor strefy</span>
                <span class="ui-field-control ui-field-sm flex items-center gap-2 px-2.5">
                  <input v-model="form.color" type="color" class="h-6 w-8 cursor-pointer rounded-[4px] border-0 bg-transparent p-0" aria-label="Kolor strefy" />
                  <span class="font-mono text-xs font-medium uppercase text-ui-text-secondary">{{ form.color }}</span>
                </span>
              </label>

              <AppTextarea v-model="form.description" label="Opis" :maxlength="255" :rows="3" size="sm" show-counter />
              <AppSwitch v-model="form.visible" label="Widoczne na mapie" />

              <p v-if="formError" class="rounded-[6px] border border-danger-100 bg-danger-50 px-3 py-2 text-xs font-medium text-danger-600 dark:border-danger-400/50 dark:bg-danger-400/10 dark:text-danger-400">
                {{ formError }}
              </p>
            </form>

            <dl v-else class="divide-y divide-ui-divider overflow-hidden rounded-[6px] border border-ui-border text-xs">
              <div v-for="item in informationRows" :key="item.label" class="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 px-3 py-2.5">
                <dt class="text-ui-mutedText">{{ item.label }}</dt>
                <dd class="min-w-0 break-words text-right font-medium text-ui-text">
                  <span v-if="item.color" class="ml-auto flex items-center justify-end gap-2">
                    <span class="h-3 w-3 rounded-full border border-ui-border" :style="{ backgroundColor: item.color }"></span>
                    {{ item.value }}
                  </span>
                  <template v-else>{{ item.value }}</template>
                </dd>
              </div>
            </dl>
          </template>

          <PlaceEventsPanel v-else-if="activePlace" :place-id="activePlace.id" :show-history="false" />
        </div>

        <footer v-if="activeTab === 'info'" class="flex shrink-0 gap-2 border-t border-ui-divider bg-ui-surface p-3">
          <template v-if="isEditing || !activePlace">
            <AppButton type="button" class="flex-1" size="sm" variant="secondary" @click="cancelEditing">Anuluj</AppButton>
            <AppButton form="place-details-form" type="submit" class="flex-1" size="sm" :loading="placeStore.isMutating">
              {{ activePlace ? 'Zapisz' : 'Dodaj miejsce' }}
            </AppButton>
          </template>
          <AppButton v-else type="button" full-width size="sm" variant="secondary" @click="isEditing = true">
            <Pencil class="h-3.5 w-3.5" />
            Edytuj dane
          </AppButton>
        </footer>
      </aside>

      <section class="flex min-h-[26rem] min-w-0 flex-col bg-ui-surface lg:min-h-0">
        <template v-if="activePlace">
          <header class="shrink-0 overflow-x-auto border-b border-ui-divider p-3">
            <div class="flex min-w-max items-end gap-2">
              <AppMultiSelect
                v-model="vehicleTypeFilters"
                class="w-32"
                label="Typ pojazdu"
                :options="vehicleTypeOptions"
                all-selected-label="Wszystkie"
                placeholder="Brak typów"
                size="sm"
              />
              <AppMultiSelect
                v-model="eventTypeFilters"
                class="w-32"
                label="Zdarzenie"
                :options="eventTypeOptions"
                all-selected-label="Wszystkie"
                placeholder="Brak zdarzeń"
                size="sm"
                :disabled="onlyVehiclesInside"
              />
              <AppDatePicker v-model="dateFrom" class="w-32" label="Od" size="sm" />
              <AppDatePicker v-model="dateTo" class="w-32" label="Do" size="sm" />
              <AppCheckbox v-model="onlyVehiclesInside" class="mb-0.5" label="Tylko w strefie" />
            </div>
          </header>

          <div class="flex min-h-0 flex-1 flex-col">
            <div class="min-h-0 flex-1 overflow-auto">
              <table class="ui-table min-w-[820px]">
                <thead class="ui-table-head sticky top-0 z-10">
                  <tr>
                    <th class="ui-table-cell w-12 font-medium">#</th>
                    <th v-for="column in sortableColumns" :key="column.key" class="ui-table-cell font-medium">
                      <button type="button" class="inline-flex items-center gap-1.5 transition hover:text-ui-text" @click="setSort(column.key)">
                        {{ column.label }}
                        <component :is="sortIcon(column.key)" class="h-3.5 w-3.5" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, index) in tableRows" :key="row.key" class="ui-table-row">
                    <td class="ui-table-cell text-ui-mutedText">{{ index + 1 }}.</td>
                    <td class="ui-table-cell">
                      <p class="font-semibold text-ui-text">{{ row.licensePlate }}</p>
                      <p v-if="row.make" class="mt-0.5 truncate text-[11px] text-ui-mutedText">{{ row.make }}</p>
                    </td>
                    <td class="ui-table-cell"><AppBadge fixed-width="sm">{{ vehicleTypeLabel(row.vehicleType) }}</AppBadge></td>
                    <td class="ui-table-cell"><AppBadge :variant="eventVariant(row.eventType)">{{ eventTypeLabel(row.eventType) }}</AppBadge></td>
                    <td class="ui-table-cell whitespace-nowrap">{{ formatDateTime(row.occurredAt) }}</td>
                    <td class="ui-table-cell">
                      <p class="font-medium text-ui-text">{{ formatDuration(row.durationSeconds) }}<span v-if="row.eventType !== 'inside'"> temu</span></p>
                    </td>
                  </tr>
                  <tr v-if="!tableRows.length">
                    <td colspan="6" class="px-4 py-12 text-center text-sm text-ui-mutedText">
                      {{ onlyVehiclesInside ? 'W strefie nie ma obecnie żadnych pojazdów.' : 'Brak zdarzeń pasujących do filtrów.' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <div v-else class="grid flex-1 place-items-center p-8 text-center text-sm text-ui-mutedText">
          Lista pojazdów będzie dostępna po zapisaniu miejsca.
        </div>
      </section>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppMultiSelect from '@/components/ui/AppMultiSelect.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import PlaceEventsPanel from '@/components/places/PlaceEventsPanel.vue'
import { useFleetStore } from '@/stores/fleetStore'
import { usePlaceStore } from '@/stores/placeStore'
import { useRepairStore } from '@/stores/repairStore'
import { useUiStore } from '@/stores/uiStore'
import type { AppSelectOption } from '@/components/ui/AppSelect.vue'
import type { Place, PlacePayload, PlaceVehicleEvent } from '@/types/place'

type PlaceTab = 'info' | 'events'
type VehicleEventType = 'entry' | 'exit' | 'inside'
type SortKey = 'vehicle' | 'type' | 'event' | 'date' | 'time'
type SortDirection = 'asc' | 'desc'
type TableRow = {
  key: string
  vehicleId: number
  licensePlate: string
  vehicleType: string | null
  make: string | null
  eventType: VehicleEventType
  occurredAt: string | null
  durationSeconds: number
}

const props = withDefaults(defineProps<{
  open: boolean
  place?: Place | null
  latitude?: number | null
  longitude?: number | null
}>(), {
  place: null,
  latitude: null,
  longitude: null,
})

const emit = defineEmits<{
  close: []
  saved: [place: Place]
}>()

const placeStore = usePlaceStore()
const fleetStore = useFleetStore()
const repairStore = useRepairStore()
const uiStore = useUiStore()
const { vehicleEventsByPlace, vehiclesInsideByPlace } = storeToRefs(placeStore)
const tabs: Array<{ value: PlaceTab; label: string }> = [
  { value: 'info', label: 'Informacje' },
  { value: 'events', label: 'Zdarzenia' },
]
const vehicleTypeOptions: AppSelectOption[] = [
  { value: 'TRUCK', label: 'Ciągniki' },
  { value: 'TRAILER', label: 'Naczepy' },
]
const eventTypeOptions: AppSelectOption[] = [
  { value: 'entry', label: 'Wjazdy' },
  { value: 'exit', label: 'Wyjazdy' },
]
const sortableColumns: Array<{ key: SortKey; label: string }> = [
  { key: 'vehicle', label: 'Pojazd' },
  { key: 'type', label: 'Typ' },
  { key: 'event', label: 'Zdarzenie' },
  { key: 'date', label: 'Data' },
  { key: 'time', label: 'Czas postoju' },
]
const activeTab = ref<PlaceTab>('info')
const activePlaceId = ref<number | null>(null)
const isEditing = ref(false)
const formError = ref('')
const vehicleTypeFilters = ref(['TRUCK', 'TRAILER'])
const eventTypeFilters = ref(['entry', 'exit'])
const onlyVehiclesInside = ref(true)
const dateFrom = ref('')
const dateTo = ref('')
const sortKey = ref<SortKey>('time')
const sortDirection = ref<SortDirection>('asc')
const clockNow = ref(Date.now())
const form = reactive(emptyForm())
let refreshTimer: number | null = null
let clockTimer: number | null = null

const activePlace = computed(() => {
  if (!activePlaceId.value) return null
  return placeStore.places.find((place) => place.id === activePlaceId.value) || props.place || null
})
const insideResponse = computed(() => activePlaceId.value ? vehiclesInsideByPlace.value[String(activePlaceId.value)] || null : null)
const events = computed(() => activePlaceId.value ? vehicleEventsByPlace.value[String(activePlaceId.value)] || [] : [])
const informationRows = computed(() => activePlace.value ? [
  { label: 'Nazwa', value: activePlace.value.name },
  { label: 'Miasto', value: activePlace.value.city || '—' },
  { label: 'Telefon', value: activePlace.value.phone || '—' },
  { label: 'E-mail', value: activePlace.value.email || '—' },
  { label: 'Promień', value: `${activePlace.value.radiusMeters} m` },
  { label: 'GPS', value: `${activePlace.value.latitude.toFixed(5)}, ${activePlace.value.longitude.toFixed(5)}` },
  { label: 'Kolor', value: activePlace.value.color, color: activePlace.value.color },
  { label: 'Opis', value: activePlace.value.description || '—' },
  { label: 'Widoczność', value: activePlace.value.visible ? 'Widoczne na mapie' : 'Ukryte' },
] : [])

const tableRows = computed<TableRow[]>(() => {
  const rows = onlyVehiclesInside.value ? insideRows() : eventRows()
  return rows
    .filter((row) => {
      const vehicleType = normalizeVehicleType(row.vehicleType)
      return !vehicleType || vehicleTypeFilters.value.includes(vehicleType)
    })
    .filter((row) => onlyVehiclesInside.value || eventTypeFilters.value.includes(row.eventType))
    .filter((row) => isWithinDateRange(row.occurredAt))
    .sort((first, second) => compareRows(first, second) * (sortDirection.value === 'asc' ? 1 : -1))
})

function emptyForm() {
  return { name: '', city: '', phone: '', email: '', radiusMeters: '100', color: '#7093ff', description: '', visible: true }
}

function syncForm(place: Place | null) {
  Object.assign(form, place ? {
    name: place.name,
    city: place.city || '',
    phone: place.phone || '',
    email: place.email || '',
    radiusMeters: String(place.radiusMeters),
    color: place.color || '#7093ff',
    description: place.description || '',
    visible: place.visible,
  } : emptyForm())
  formError.value = ''
}

function normalizeVehicleType(value: string | null) {
  const normalized = String(value || '').trim().toUpperCase()
  if (normalized === 'TRAILER') return 'TRAILER'
  if (normalized === 'TRUCK') return 'TRUCK'
  return ''
}

function vehicleFromEvent(event: PlaceVehicleEvent) {
  const vehicleId = Number(event.vehicleId ?? event.vehicle?.id)
  return fleetStore.apiVehicles.find((vehicle) => vehicle.id === vehicleId)
}

function eventRows(): TableRow[] {
  return events.value.flatMap((event, index) => {
    const vehicleId = Number(event.vehicleId ?? event.vehicle?.id)
    if (!Number.isFinite(vehicleId)) return []
    const vehicle = vehicleFromEvent(event)
    const occurredAt = event.occurredAt || event.createdAt || null
    const occurredAtTimestamp = timestamp(occurredAt)
    return [{
      key: `event-${event.id ?? index}`,
      vehicleId,
      licensePlate: event.vehicleLicensePlate || event.vehicle?.licensePlate || vehicle?.licensePlate || `#${vehicleId}`,
      vehicleType: vehicle?.type || null,
      make: vehicle?.make || null,
      eventType: event.eventType,
      occurredAt,
      durationSeconds: occurredAtTimestamp ? Math.max(0, Math.floor((clockNow.value - occurredAtTimestamp) / 1000)) : 0,
    }]
  })
}

function secondsSinceGenerated() {
  const generatedAt = timestamp(insideResponse.value?.generatedAt || null)
  return generatedAt ? Math.max(0, Math.floor((clockNow.value - generatedAt) / 1000)) : 0
}

function insideRows(): TableRow[] {
  const elapsed = secondsSinceGenerated()
  return (insideResponse.value?.vehicles || []).map((vehicle) => ({
    key: `inside-${vehicle.vehicleId}`,
    vehicleId: vehicle.vehicleId,
    licensePlate: vehicle.licensePlate || `#${vehicle.vehicleId}`,
    vehicleType: vehicle.vehicleType,
    make: vehicle.make,
    eventType: 'inside',
    occurredAt: vehicle.enteredAt,
    durationSeconds: vehicle.timeInZoneSeconds + elapsed,
  }))
}

function isWithinDateRange(value: string | null) {
  if (!dateFrom.value && !dateTo.value) return true
  const key = localDateKey(value)
  if (!key) return false
  return (!dateFrom.value || key >= dateFrom.value) && (!dateTo.value || key <= dateTo.value)
}

function localDateKey(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function timestamp(value: string | null) {
  if (!value) return 0
  const result = new Date(value).getTime()
  return Number.isNaN(result) ? 0 : result
}

function nullable(value: string) {
  return value.trim() || null
}

async function savePlace() {
  const wasExistingPlace = Boolean(activePlace.value)
  const name = form.name.trim()
  const radiusMeters = Number(form.radiusMeters)
  const latitude = activePlace.value?.latitude ?? props.latitude
  const longitude = activePlace.value?.longitude ?? props.longitude

  if (!name) {
    formError.value = 'Podaj nazwę miejsca.'
    return
  }
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    formError.value = 'Promień musi być liczbą większą od zera.'
    return
  }
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    formError.value = 'Wskaż punkt miejsca na mapie.'
    return
  }

  const payload: PlacePayload = {
    name,
    city: nullable(form.city),
    phone: nullable(form.phone),
    email: nullable(form.email),
    radiusMeters,
    color: form.color,
    description: nullable(form.description),
    visible: form.visible,
    latitude,
    longitude,
  }

  try {
    const saved = activePlace.value
      ? await placeStore.updatePlace(activePlace.value.id, payload)
      : await placeStore.createPlace(payload)
    activePlaceId.value = saved.id
    isEditing.value = false
    syncForm(saved)
    emit('saved', saved)
    uiStore.addToast({ type: 'success', title: wasExistingPlace ? 'Miejsce zaktualizowane' : 'Miejsce dodane', message: 'Zapisano dane strefy.' })
    void loadZoneData(false)
    void repairStore.loadDictionaries()
  } catch {
    // Global API interceptor displays the backend error.
  }
}

function cancelEditing() {
  if (!activePlace.value) {
    emit('close')
    return
  }
  syncForm(activePlace.value)
  isEditing.value = false
}

async function loadZoneData(silent: boolean) {
  if (!activePlaceId.value) return
  await Promise.allSettled([
    placeStore.loadVehiclesInside(activePlaceId.value, { silent }),
    placeStore.loadVehicleEvents(activePlaceId.value, { silent }),
  ])
}

function stopTimers() {
  if (refreshTimer !== null) window.clearInterval(refreshTimer)
  if (clockTimer !== null) window.clearInterval(clockTimer)
  refreshTimer = null
  clockTimer = null
}

function startTimers() {
  stopTimers()
  clockTimer = window.setInterval(() => { clockNow.value = Date.now() }, 1000)
  refreshTimer = window.setInterval(() => { void loadZoneData(true) }, 45_000)
}

function vehicleTypeLabel(value: string | null) {
  const normalized = normalizeVehicleType(value)
  return normalized === 'TRAILER' ? 'Naczepa' : normalized === 'TRUCK' ? 'Ciągnik' : 'Pojazd'
}

function eventTypeLabel(value: VehicleEventType) {
  return value === 'entry' ? 'Wjazd' : value === 'exit' ? 'Wyjazd' : 'W strefie'
}

function eventVariant(value: VehicleEventType): 'success' | 'warning' | 'info' {
  return value === 'entry' ? 'success' : value === 'exit' ? 'warning' : 'info'
}

function compareRows(first: TableRow, second: TableRow) {
  if (sortKey.value === 'vehicle') return first.licensePlate.localeCompare(second.licensePlate, 'pl')
  if (sortKey.value === 'type') return vehicleTypeLabel(first.vehicleType).localeCompare(vehicleTypeLabel(second.vehicleType), 'pl')
  if (sortKey.value === 'event') return eventTypeLabel(first.eventType).localeCompare(eventTypeLabel(second.eventType), 'pl')
  if (sortKey.value === 'date') return timestamp(first.occurredAt) - timestamp(second.occurredAt)
  return first.durationSeconds - second.durationSeconds
}

function setSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortKey.value = key
  sortDirection.value = 'asc'
}

function sortIcon(key: SortKey) {
  if (sortKey.value !== key) return ArrowUpDown
  return sortDirection.value === 'asc' ? ArrowUp : ArrowDown
}

function formatDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString('pl-PL') : '—'
}

function formatDuration(value: number) {
  const totalMinutes = Math.max(0, Math.floor(value / 60))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  return [days ? `${days} d` : '', hours ? `${hours} godz.` : '', `${minutes} min`].filter(Boolean).join(' ')
}

watch(() => [props.open, props.place?.id, props.latitude, props.longitude] as const, ([open]) => {
  stopTimers()
  if (!open) return
  activePlaceId.value = props.place?.id ?? null
  activeTab.value = 'info'
  isEditing.value = !props.place
  onlyVehiclesInside.value = true
  sortKey.value = 'time'
  sortDirection.value = 'asc'
  syncForm(props.place)
  clockNow.value = Date.now()
  if (activePlaceId.value) void loadZoneData(false)
  startTimers()
}, { immediate: true })

onBeforeUnmount(stopTimers)
</script>
