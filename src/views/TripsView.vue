<template>
  <div class="min-w-0 space-y-3 lg:flex lg:h-[calc(100dvh-3rem)] lg:min-h-0 lg:flex-col lg:gap-3 lg:space-y-0">
    <header class="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <h1 class="ui-page-title">Zjazdy i wyjazdy</h1>
      <div class="flex items-center gap-2"><AppRefreshCountdown v-if="canRead" :remaining="remaining" :seconds="30" :loading="store.isLoading" /><AppButton v-if="canCreate" size="sm" :disabled="store.isMutating || store.isLoading || editorLoading || editingId !== null" @click="openCreate"><Plus class="h-4 w-4" />Dodaj pojazd</AppButton></div>
    </header>
    <div v-if="canRead" class="flex shrink-0 flex-wrap items-center gap-2">
      <AppInput v-model="store.searchQuery" class="w-full sm:w-72" size="sm" placeholder="Szukaj pojazdu, kierowcy lub uwag" aria-label="Szukaj wpisu" :disabled="editorLoading || editingId !== null" clearable />
      <VehicleReturnColumns />
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:justify-end">
        <AppIconButton label="Poprzedni tydzień" size="sm" :disabled="store.isMutating" @click="moveWeek(-1)"><ChevronLeft class="h-4 w-4" /></AppIconButton>
        <div class="w-64 max-w-[calc(100vw-7rem)] shrink-0"><AppSearchSelect v-model="store.selectedWeekStart" size="sm" :options="weekOptions" :disabled="store.isMutating" aria-label="Wybierz tydzień" /></div>
        <AppIconButton label="Następny tydzień" size="sm" :disabled="store.isMutating || store.selectedWeekStart >= latestWeek" @click="moveWeek(1)"><ChevronRight class="h-4 w-4" /></AppIconButton>
        <AppButton size="sm" variant="secondary" :disabled="store.isMutating" @click="store.selectedWeekStart = returnWeekStart()">Bieżący tydzień</AppButton>
      </div>
    </div>
    <p v-if="!canRead" class="ui-surface p-8 text-center ui-body-sm text-ui-mutedText">Nie masz dostępu do zjazdów i wyjazdów w aktywnej firmie.</p>
    <section v-else class="ui-surface min-w-0 overflow-hidden lg:min-h-0 lg:flex-1">
      <div v-if="store.isLoading && !store.week" class="flex items-center justify-center gap-2 p-10 ui-body-sm text-ui-mutedText" role="status"><LoaderCircle class="h-4 w-4 animate-spin" />Pobieranie wpisów...</div>
      <div v-else-if="store.error && !store.week" class="p-8 text-center"><p class="ui-error" role="alert">{{ store.error }}</p><AppButton size="sm" variant="secondary" class="mt-3" @click="store.loadWeek()">Spróbuj ponownie</AppButton></div>
      <template v-else>
        <div v-if="store.error" class="border-b border-ui-divider p-3 ui-error" role="alert">{{ store.error }}</div>
        <div class="hidden h-full overflow-auto lg:block">
          <table class="ui-table" :style="{minWidth: `${tableMinimumWidth}px`}">
            <thead class="ui-table-head sticky top-0 z-10"><tr>
              <th class="w-10 px-3 py-2 text-left">Lp.</th>
              <th v-for="column in store.visibleColumns" :key="column.key" class="border-r border-ui-divider px-3 py-2 whitespace-nowrap" :class="isStation(column.key) ? 'text-center' : 'text-left'" :style="columnStyle(column.key)" :title="column.label">{{ column.key === 'days' ? 'Dni' : column.label }}</th>
              <th class="sticky right-0 z-20 bg-ui-muted px-2 py-2 text-right w-px whitespace-nowrap">Akcje</th>
            </tr></thead>
            <tbody v-for="(entry, index) in displayEntries" :key="entry.id">
              <tr class="ui-table-row cursor-pointer" @click="toggle(entry.id)">
                <td class="px-3 py-1.5 text-ui-mutedText">{{ index + 1 }}.</td>
                <td v-for="column in store.visibleColumns" :key="column.key" class="border-r border-ui-divider px-3 py-1.5 text-xs" :class="isStation(column.key) ? 'text-center' : 'whitespace-nowrap'" :style="columnStyle(column.key)">
                  <AppCheckbox v-if="isStation(column.key)" @click.stop :model-value="station(entry, column.key) === 'DONE'" :aria-label="`${column.label} ${entry.truck.licensePlate}`" :title="station(entry, column.key) === 'NOT_REQUIRED' ? 'Nie dotyczy' : station(entry, column.key) === 'DONE' ? 'Wykonane' : 'Do zrobienia'" :disabled="!canUpdate || store.isMutating || editorLoading || editingId !== null" @update:model-value="changeStation(entry, stationField(column.key), $event ? 'DONE' : 'PENDING')" />
                  <VehicleReturnCell v-else :entry="entry" :column="column.key" :timezone="timezone" />
                </td>
                <td class="sticky right-0 bg-ui-surface px-2 py-1 w-px"><div class="flex w-max justify-end gap-1" @click.stop>
                  <AppIconButton label="Rozwiń szczegóły" size="sm" :aria-expanded="expanded.includes(entry.id)" @click="toggle(entry.id)"><ChevronDown class="h-4 w-4" :class="expanded.includes(entry.id) ? 'rotate-180' : ''" /></AppIconButton>
                  <AppIconButton v-if="canUpdate" label="Edytuj wpis" size="sm" :disabled="store.isMutating || editorLoading || editingId !== null" @click="openEdit(entry.id)"><SquarePen class="h-4 w-4" /></AppIconButton>
                  <AppIconButton v-if="canDelete" label="Usuń wpis" size="sm" variant="danger" :disabled="store.isMutating || editorLoading || editingId !== null" @click="deleteEntry = entry"><Trash2 class="h-4 w-4" /></AppIconButton>
                </div></td>
              </tr>
              <tr v-if="expanded.includes(entry.id)" class="border-b border-ui-divider bg-ui-muted"><td :colspan="store.visibleColumns.length + 2"><VehicleReturnEntryDetails :entry="entry" :timezone="timezone" :can-read-repairs="canReadRepairs" :show-fuel="showFuel" :editing="editingId === entry.id" @cancel-edit="closeInlineEditor" @saved="savedInlineEditor" /></td></tr>
            </tbody>
          </table>
        </div>
        <div class="divide-y divide-ui-divider lg:hidden">
          <article v-for="entry in displayEntries" :key="entry.id" class="min-w-0">
            <div class="p-3 cursor-pointer" @click="toggle(entry.id)">
              <div class="flex items-center justify-between gap-2">
                <div class="flex min-w-0 items-center gap-1.5"><button type="button" class="flex min-w-0 items-center gap-2 text-sm font-semibold text-ui-text" :aria-expanded="expanded.includes(entry.id)" @click.stop="toggle(entry.id)"><Truck class="h-4 w-4 shrink-0" /><span class="truncate">{{ entry.truck.licensePlate }}</span><ChevronDown class="h-4 w-4 shrink-0" :class="expanded.includes(entry.id) ? 'rotate-180' : ''" /></button><VehicleReturnInspectionAlert :vehicle="entry.truck" :timezone="timezone" /></div>
                <div class="flex shrink-0 gap-1" @click.stop><AppIconButton v-if="canUpdate" label="Edytuj wpis" size="sm" :disabled="store.isMutating || editorLoading || editingId !== null" @click="openEdit(entry.id)"><SquarePen class="h-4 w-4" /></AppIconButton><AppIconButton v-if="canDelete" label="Usuń wpis" size="sm" variant="danger" :disabled="store.isMutating || editorLoading || editingId !== null" @click="deleteEntry = entry"><Trash2 class="h-4 w-4" /></AppIconButton></div>
              </div>
              <dl class="mt-2 grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-3 gap-y-1 text-xs text-ui-text-secondary">
                <template v-for="column in store.visibleColumns.filter(item => item.key !== 'truck')" :key="column.key">
                  <dt class="text-ui-mutedText">{{ column.label }}</dt><dd class="min-w-0">
                    <AppCheckbox v-if="isStation(column.key)" @click.stop :model-value="station(entry, column.key) === 'DONE'" :aria-label="`${column.label} ${entry.truck.licensePlate}`" :disabled="!canUpdate || store.isMutating || editorLoading || editingId !== null" @update:model-value="changeStation(entry, stationField(column.key), $event ? 'DONE' : 'PENDING')" />
                    <VehicleReturnCell v-else :entry="entry" :column="column.key" :timezone="timezone" />
                  </dd>
                </template>
              </dl>
            </div>
            <VehicleReturnEntryDetails v-if="expanded.includes(entry.id)" class="border-t border-ui-divider bg-ui-muted" :entry="entry" :timezone="timezone" :can-read-repairs="canReadRepairs" :show-fuel="showFuel" :editing="editingId === entry.id" @cancel-edit="closeInlineEditor" @saved="savedInlineEditor" />
          </article>
        </div>
        <div v-if="!displayEntries.length" class="p-10 text-center"><Route class="mx-auto h-7 w-7 text-ui-icon" /><p class="mt-3 ui-body-sm text-ui-mutedText">{{ store.searchQuery ? 'Brak wyników wyszukiwania.' : 'Brak wpisów w wybranym tygodniu.' }}</p></div>
      </template>
    </section>
    <VehicleReturnModal :open="editorOpen" @close="closeEditor" />
    <AppConfirmModal :open="Boolean(deleteEntry)" title="Usunąć wpis zjazdu / wyjazdu?" :description="deleteEntry ? `Usuniesz wpis dla ${deleteEntry.truck.licensePlate}. Pojazd i jego naprawy pozostaną bez zmian.` : ''" confirm-label="Usuń" confirm-variant="danger" :confirm-disabled="Boolean(store.conflict)" :busy="store.isMutating" @close="closeDelete" @confirm="confirmDelete">
      <div v-if="store.conflict" class="space-y-2 ui-body-sm text-ui-text-secondary"><p>Wpis został zmieniony. Porównaj aktualne dane przed usunięciem.</p><p>{{ returnWeekLabel(store.conflict.weekStart) }} · {{ store.conflict.notes || 'Bez uwag' }}</p><AppButton size="sm" variant="secondary" @click="reloadDelete">Wczytaj aktualny wpis</AppButton></div>
    </AppConfirmModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronDown, ChevronLeft, ChevronRight, LoaderCircle, Plus, Route, SquarePen, Trash2, Truck } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppConfirmModal from '@/components/ui/AppConfirmModal.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSearchSelect from '@/components/ui/AppSearchSelect.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppRefreshCountdown from '@/components/ui/AppRefreshCountdown.vue'
import VehicleReturnCell from '@/components/trips/VehicleReturnCell.vue'
import VehicleReturnInspectionAlert from '@/components/trips/VehicleReturnInspectionAlert.vue'
import VehicleReturnColumns from '@/components/trips/VehicleReturnColumns.vue'
import VehicleReturnModal from '@/components/trips/VehicleReturnModal.vue'
import VehicleReturnEntryDetails from '@/components/trips/VehicleReturnEntryDetails.vue'
import { useVehicleReturnStore } from '@/stores/vehicleReturnStore'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { useVehicleReturnPermissions } from '@/composables/useVehicleReturnPermissions'
import { newReturnForm, returnEntryWrite, returnWeekLabel, returnWeekStart, shiftReturnDate } from '@/utils/vehicleReturn'
import type { ReturnColumnKey } from '@/utils/vehicleReturnColumns'
import { getApiErrorMessage } from '@/services/api'
import type { ReturnStationStatus, VehicleReturnEntry } from '@/types/vehicleReturn'

const store = useVehicleReturnStore()
const auth = useAuthStore()
const route = useRoute(), router = useRouter()
const { canRead, canCreate, canUpdate, canDelete, canReadRepairs, canReadVehicles, canReadDrivers } = useVehicleReturnPermissions()
const editorOpen = ref(false), editorLoading = ref(false)
const editingId = ref<number | null>(null)
const displayEntries = computed(() => {
  const current = store.currentEntry
  if (editingId.value === null || !current || current.id !== editingId.value) return store.filteredEntries
  // Preserve the edited snapshot if a background refresh changes or removes its row.
  const entries = store.filteredEntries.map((entry) => entry.id === current.id ? current : entry)
  return entries.some((entry) => entry.id === current.id) ? entries : [...entries, current]
})
const expanded = ref<number[]>([])
const deleteEntry = ref<VehicleReturnEntry | null>(null)
let editorRequest = 0
const timezone = computed(() => store.week?.timezone || 'Europe/Warsaw')
const remaining = ref(30)
let nextRefreshAt = Date.now() + 30000
let refreshTimer: ReturnType<typeof setInterval> | undefined
const latestWeek = computed(() => shiftReturnDate(returnWeekStart(), 7))
const showFuel = computed(() => store.visibleColumns.some((item) => item.key === 'fuel'))
function columnStyle(key: ReturnColumnKey) {
  if (key === 'days') return { width: '64px', maxWidth: '64px' }
  if (key === 'notes') return { width: '300px', minWidth: '220px', maxWidth: '360px' }
  if (isStation(key)) return { width: '80px' }
  return {}
}
const tableMinimumWidth = computed(() => store.visibleColumns.reduce((total, column) => total + (column.key === 'notes' ? 260 : column.key === 'days' ? 64 : isStation(column.key) ? 80 : 130), 145))
function isStation(key: ReturnColumnKey) { return key === 'returnStation' || key === 'departureStation' }
function stationField(key: ReturnColumnKey) { return key === 'returnStation' ? 'returnStationStatus' as const : 'departureStationStatus' as const }
function station(entry: VehicleReturnEntry, key: ReturnColumnKey) { return entry[stationField(key)] }
const weekOptions = computed(() => {
  const current = returnWeekStart(), weeks = new Set<string>(store.selectedWeekStart <= latestWeek.value ? [store.selectedWeekStart] : [])
  for (let i = 1; i >= -52; i--) weeks.add(shiftReturnDate(current, i * 7))
  return [...weeks].sort().reverse().map((value) => ({value, label: (value === current ? 'Aktualny · ' : '') + returnWeekLabel(value)}))
})
function moveWeek(direction: number) { const next = shiftReturnDate(store.selectedWeekStart, direction * 7); if (next <= latestWeek.value) store.selectedWeekStart = next }
function toggle(id: number) {
  if (id === editingId.value) return
  expanded.value = expanded.value.includes(id) ? expanded.value.filter((value) => value !== id) : [...expanded.value, id]
}
function openCreate() {
  if (!canCreate.value || editingId.value !== null || editorLoading.value) return
  store.clearEditor()
  editorOpen.value = true
}
async function openEdit(id: number) {
  if (!canUpdate.value || editorLoading.value || store.isMutating || editingId.value !== null) return
  const request = ++editorRequest
  editorLoading.value = true
  store.clearEditor()
  try {
    const entry = await store.loadDetail(id)
    if (entry && request === editorRequest) {
      store.draft = newReturnForm(store.selectedWeekStart, entry)
      editingId.value = id
      if (!expanded.value.includes(id)) expanded.value.push(id)
      await store.loadDictionaries(canReadVehicles.value, canReadDrivers.value)
    }
  } catch (cause) {
    if (request === editorRequest) useUiStore().addToast({type:'error', title:'Nie udało się pobrać wpisu', message:getApiErrorMessage(cause)})
  } finally { if (request === editorRequest) editorLoading.value = false }
}
function closeInlineEditor() {
  if (store.isMutating) return
  editorRequest += 1
  editorLoading.value = false
  editingId.value = null
  store.clearEditor()
  if (route.query.entry) void router.replace({ name: 'trips' })
}
function savedInlineEditor() {
  editingId.value = null
  store.clearEditor()
  if (route.query.entry) void router.replace({ name: 'trips' })
}
function closeEditor() {
  if (store.isMutating) return
  editorOpen.value = false
  store.clearEditor()
  if (route.query.entry) void router.replace({name:'trips'})
}
async function changeStation(entry: VehicleReturnEntry, field: 'returnStationStatus' | 'departureStationStatus', value: string) {
  if (!canUpdate.value || store.isMutating || editingId.value !== null || editorLoading.value) return
  try { const result = await store.mutate({...returnEntryWrite(entry), [field]:value as ReturnStationStatus}, entry); if (result) void store.loadWeek() }
  catch {
    if (store.conflict) {
      store.currentEntry = entry
      store.draft = newReturnForm(store.selectedWeekStart, entry)
      editingId.value = entry.id
      if (!expanded.value.includes(entry.id)) expanded.value.push(entry.id)
      void store.loadDictionaries(canReadVehicles.value, canReadDrivers.value)
    }
  }
}
async function confirmDelete() {
  if (!canDelete.value || !deleteEntry.value || store.isMutating) return
  try {
    const response = await store.mutate(null, deleteEntry.value)
    if (response) { deleteEntry.value = null; void store.loadWeek() }
  } catch { /* The confirmation displays the conflict without automatically retrying. */ }
}
function closeDelete() { deleteEntry.value = null; store.conflict = null }
function reloadDelete() {
  if (store.conflict) deleteEntry.value = store.conflict
  store.conflict = null
}
watch(() => store.selectedWeekStart, () => {
  closeInlineEditor()
  expanded.value = []
  if (canRead.value) void store.loadWeek()
})
watch(() => store.lastRefreshedAt, (value) => { nextRefreshAt = (value || Date.now()) + 30000; remaining.value = 30 })
watch([() => auth.activeCompanyId, canRead], () => {
  editorRequest += 1
  editorLoading.value = false
  editorOpen.value = false
  editingId.value = null
  deleteEntry.value = null
  expanded.value = []
  store.resetApiState()
  if (canRead.value) void store.loadWeek()
})
onMounted(() => {
  refreshTimer = setInterval(() => {
    remaining.value = Math.max(0, Math.min(30, Math.ceil((nextRefreshAt - Date.now()) / 1000)))
    if (remaining.value === 0 && canRead.value && !store.isLoading && !store.isMutating && document.visibilityState === 'visible') {
      nextRefreshAt = Date.now() + 30000
      void store.loadWeek()
    }
  }, 250)
  if (canRead.value) {
    if (store.selectedWeekStart > latestWeek.value) store.selectedWeekStart = latestWeek.value
    else void store.loadWeek()
    const id = Number(route.query.entry)
    if (Number.isInteger(id) && id > 0) void openEdit(id)
  }
})
onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  editorRequest += 1
  store.clearEditor()
})
</script>
