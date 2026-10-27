<template>
  <div v-if="canRead" class="relative flex h-full min-h-0 w-full overflow-hidden bg-ui-canvas text-ui-text">
    <aside v-show="expanded" class="absolute inset-y-0 left-0 z-20 flex w-full min-w-0 flex-col border-r border-ui-border bg-ui-canvas md:relative md:w-96 md:shrink-0">
      <div class="flex shrink-0 items-center gap-1 border-b border-ui-border p-2">
        <button v-for="item in tabs" :key="item.value" class="h-9 flex-1 rounded-md border px-2 text-xs font-medium transition" :class="tab === item.value ? 'border-ui-border bg-ui-surface' : 'border-transparent hover:bg-ui-muted'" :disabled="item.value === 'result' && !store.result" @click="tab = item.value">{{ item.label }}</button>
        <AppIconButton label="Schowaj listę" @click="expanded = false"><PanelLeftClose :size="16" /></AppIconButton>
      </div>
      <template v-if="tab === 'vehicles'">
        <div class="space-y-2 p-3">
          <AppSelect v-model="store.selectedFleetId" :options="fleets" size="sm" />
          <AppInput v-model="store.vehicleSearch" placeholder="Szukaj pojazdu" size="sm" clearable />
        </div>
        <FleetVehicleList :vehicles="vehicles" :selected-id="store.selectedVehicleId" :sort-key="sortKey" :sort-direction="sortDirection" @select="selectVehicle" @sort="sort">
          <template #alerts="{vehicle}"><TriangleAlert v-if="vehicle.alerts.length" :size="14" class="text-amber-500" :title="vehicle.alerts.map(a => a.title).join(', ')" /></template>
        </FleetVehicleList>
        <p v-if="!vehicles.length" class="p-3 text-xs text-ui-text-secondary">{{ fleet.isVehiclesLoading ? 'Ładowanie pojazdów…' : 'Brak aktywnych ciągników pasujących do filtrów.' }}</p>
      </template>
      <template v-else-if="tab === 'route'">
        <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
          <section>
            <h2 class="ui-section-title mb-2">Początek trasy</h2>
            <button class="w-full rounded-md border border-ui-border bg-ui-surface p-3 text-left text-sm" @click="tab = 'vehicles'">
              <span class="font-semibold">{{ store.selectedVehicle?.plateNumber || 'Wybierz ciągnik' }}</span>
              <span class="mt-1 block text-xs text-ui-text-secondary">{{ store.selectedVehicle?.hasPosition ? store.selectedVehicle.latitude.toFixed(5) + ', ' + store.selectedVehicle.longitude.toFixed(5) : 'Brak pozycji GPS' }}</span>
            </button>
          </section>
          <section>
            <div class="mb-2 flex items-center justify-between"><h2 class="ui-section-title">Punkty trasy</h2><AppIconButton label="Wskaż punkt na mapie" :disabled="!store.selectedVehicle" @click="addOnMap = !addOnMap; if (addOnMap) expanded = false"><MapPin :size="16" /></AppIconButton></div>
            <div v-for="(point, index) in store.waypoints" :key="point.id" class="mb-2 flex items-center gap-1">
              <span class="w-4 shrink-0 text-xs font-semibold">{{ String.fromCharCode(65 + index) }}</span>
              <AppInput :model-value="point.address" placeholder="Adres, miasto lub kod pocztowy" size="sm" clearable class="min-w-0 flex-1" @update:model-value="point.address = String($event); point.position = null" />
              <div class="flex shrink-0 flex-col"><button :disabled="index === 0" class="disabled:opacity-25" aria-label="Przesuń punkt w górę" @click="store.movePoint(index, -1)"><ChevronUp :size="14" /></button><button :disabled="index === store.waypoints.length - 1" class="disabled:opacity-25" aria-label="Przesuń punkt w dół" @click="store.movePoint(index, 1)"><ChevronDown :size="14" /></button></div>
              <AppIconButton label="Usuń punkt" @click="store.removePoint(point.id)"><X :size="14" /></AppIconButton>
            </div>
            <AppButton variant="secondary" size="sm" class="w-full" :disabled="store.waypoints.length >= 26" @click="store.addPoint()"><Plus :size="14" />Dodaj punkt</AppButton>
          </section>
          <details>
            <summary class="cursor-pointer text-sm font-semibold">Opcje tankowania</summary>
            <div class="mt-3 space-y-3">
              <AppMultiSelect v-model="store.settings.providers" label="Dostawcy stacji" placeholder="Wszyscy dostawcy" :options="providers" />
              <AppSelect v-model="store.settings.priceType" label="Cena" :options="[{value:'FINAL',label:'Cena końcowa'},{value:'BASE',label:'Cena bazowa'}]" />
              <AppDatePicker v-model="store.settings.priceDate" label="Data cen (domyślnie dzisiaj)" />
              <div class="grid grid-cols-2 gap-3"><AppInput v-for="field in FUEL_ROUTE_NUMERIC_FIELDS" :key="field.key" :label="field.label" :model-value="String(store.settings[field.key])" type="number" @update:model-value="store.settings[field.key] = $event === '' ? NaN : Number($event)" /></div>
            </div>
          </details>
          <p v-if="store.error" class="ui-error" role="alert">{{ store.error }}</p>
        </div>
        <div class="shrink-0 border-t border-ui-border p-3"><AppButton class="w-full" :loading="store.isLoading" :disabled="!store.selectedVehicle || store.isLoading" @click="calculate"><Fuel :size="16" />{{ store.isLoading ? 'Obliczanie trasy…' : 'Znajdź stacje na trasie' }}</AppButton></div>
      </template>
      <div v-else class="min-h-0 flex-1 overflow-y-auto"><FuelRouteResults /></div>
    </aside>
    <div class="relative min-h-0 min-w-0 flex-1">
      <FuelRouteMap :add-on-map="addOnMap" @point="addPoint" />
      <AppIconButton v-if="!expanded" class="absolute left-3 top-3 z-10" label="Pokaż panel tankowań" @click="expanded = true"><PanelLeftOpen :size="18" /></AppIconButton>
      <div v-if="addOnMap" class="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-md border border-ui-border bg-ui-surface p-3 text-sm shadow-sm">Kliknij na mapie, aby dodać punkt.<AppIconButton label="Anuluj wskazywanie" @click="addOnMap = false; expanded = true"><X :size="16" /></AppIconButton></div>
    </div>
  </div>
  <div v-else class="p-4 text-sm text-ui-text-secondary">Brak dostępu do planowania tankowań.</div>
</template>
<script setup lang="ts">
import { onActivated, onDeactivated } from 'vue'
import { useWorkspaceActive } from '@/composables/useWorkspace'
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { ChevronDown, ChevronUp, Fuel, MapPin, PanelLeftClose, PanelLeftOpen, Plus, TriangleAlert, X } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppMultiSelect from '@/components/ui/AppMultiSelect.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import FleetVehicleList from '@/components/map/FleetVehicleList.vue'
import FuelRouteMap from '@/components/map/FuelRouteMap.vue'
import FuelRouteResults from '@/components/map/FuelRouteResults.vue'
import { useFleetStore } from '@/stores/fleetStore'
import { useFuelRouteStore } from '@/stores/fuelRouteStore'
import { useAuthStore } from '@/stores/authStore'
import { useFuelRoutePermissions } from '@/composables/useFuelRoutePermissions'
import { FUEL_ROUTE_NUMERIC_FIELDS } from '@/utils/fuelRoute'
const fleet = useFleetStore(), store = useFuelRouteStore(), auth = useAuthStore(), {canRead} = useFuelRoutePermissions()
const expanded = ref(true), addOnMap = ref(false), tab = ref('vehicles'), sortKey = ref<'order'|'plate'|'fuel'>('plate'), sortDirection = ref<'asc'|'desc'>('asc')
const tabs = [{value:'vehicles',label:'Pojazdy'},{value:'route',label:'Trasa'},{value:'result',label:'Wynik'}]
const providers = ['IDS','EUROWAG','E100','AS24'].map(value => ({value,label:value}))
const canReadGroups = computed(() => auth.hasActiveCompanyRole('COMPANY_ADMIN') || auth.hasActiveCompanyPermission('vehicle_groups.read'))
const fleets = computed(() => [{value:'type:truck',label:'Ciągniki'}, ...(canReadGroups.value ? fleet.vehicleGroups.map(group => ({value:group.id,label:group.name})) : [])])
const vehicles = computed(() => {
  const q = store.vehicleSearch.trim().toLocaleLowerCase('pl-PL')
  return fleet.vehicles.filter(v => v.rawType === 'TRUCK' && v.rawStatus === 'ACTIVE' && (store.selectedFleetId === 'type:truck' || fleet.isVehicleInGroup(store.selectedFleetId,v.id)) && (!q || (v.plateNumber + ' ' + (v.driverName || '')).toLocaleLowerCase('pl-PL').includes(q))).sort((a,b) => {
    const comparison = sortKey.value === 'fuel' ? (a.fuelPct ?? -1) - (b.fuelPct ?? -1) : sortKey.value === 'order' ? a.backendId - b.backendId : a.plateNumber.localeCompare(b.plateNumber,'pl',{numeric:true})
    return sortDirection.value === 'asc' ? comparison : -comparison
  })
})
function sort(key: 'order'|'plate'|'fuel') { sortDirection.value = sortKey.value === key && sortDirection.value === 'asc' ? 'desc' : 'asc'; sortKey.value = key }
function selectVehicle(id: string) { store.selectVehicle(id); tab.value = 'route' }
function addPoint(position: {lat:number;lng:number}) { store.addPoint(position); addOnMap.value = false; expanded.value = true; tab.value = 'route' }
async function calculate() { if (await store.calculate()) tab.value = 'result' }
watch(() => store.selectedFleetId, async id => { if (id !== 'type:truck' && canReadGroups.value) await fleet.fetchVehicleGroup(id) })
watch(() => auth.activeCompanyId, id => { store.ensureCompany(id); tab.value = 'vehicles' })
watch(canRead, allowed => { if (!allowed) store.resetApiState() })
let interval: ReturnType<typeof setInterval> | undefined, polling = false, disposed = false
const workspaceActive = useWorkspaceActive()
function startWorkspacePolling() {
  clearInterval(interval)
  interval = setInterval(async () => { if (!workspaceActive.value || polling || !canRead.value) return; polling = true; try { await fleet.fetchLastPositions({silent:true}) } finally { polling = false } },30000)
}
onActivated(startWorkspacePolling)
onDeactivated(() => { clearInterval(interval); interval = undefined })
onMounted(async () => {
  store.ensureCompany(auth.activeCompanyId)
  if (!canRead.value) return
  if (!fleet.vehicles.length && !fleet.isVehiclesLoading) await fleet.fetchVehicles()
  await fleet.fetchLastPositions()
  if (disposed) return
  if (canReadGroups.value && !fleet.vehicleGroups.length) await fleet.fetchVehicleGroups()
  if (disposed) return
  if (workspaceActive.value) startWorkspacePolling()
})
onBeforeUnmount(() => { disposed = true; clearInterval(interval); store.resetApiState() })
</script>
