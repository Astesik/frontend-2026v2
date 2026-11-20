<template>
  <AppCard title="Transakcje" compact class="flex min-w-0 flex-col md:min-h-0 md:flex-1" content-class="flex min-h-0 flex-1 flex-col !p-0">
    <template #actions>
      <div class="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
        <AppMultiSelect
          v-model="exciseCountries" label="Odliczenie akcyzy" placeholder="Bez odliczenia"
          all-selected-label="Belgia i Francja" size="sm" class="w-48"
          :options="exciseOptions" :show-select-all="false" :disabled="gross"
        />
        <button
          type="button" role="switch" aria-label="Ceny i sumy brutto" :aria-checked="gross"
          class="inline-flex items-center gap-2 rounded-md px-1 text-xs font-medium focus-visible:outline-ui-focus"
          @click="gross = !gross"
        >
          <span :class="gross ? 'text-ui-mutedText' : 'text-ui-text'">Netto</span>
          <span class="relative h-5 w-9 rounded-full transition-colors" :class="gross ? 'bg-ui-text' : 'bg-ui-border-strong'">
            <span class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-ui-surface shadow-soft transition-transform" :class="{ 'translate-x-4': gross }" />
          </span>
          <span :class="gross ? 'text-ui-text' : 'text-ui-mutedText'">Brutto</span>
        </button>
      </div>
    </template>
    <div class="grid grid-cols-2 items-start gap-3 border-b border-ui-divider p-3 lg:grid-cols-4 xl:grid-cols-[minmax(14rem,2fr)_repeat(4,minmax(0,1fr))]">
      <AppInput
        v-model="search" label="Szukaj" placeholder="Stacja, kod stacji lub rejestracja"
        size="sm" class="col-span-2 min-w-0 lg:col-span-4 xl:col-span-1" clearable :maxlength="120"
      />
      <AppDatePicker v-model="from" size="sm" label="Od" editable class="min-w-0" />
      <AppDatePicker v-model="to" size="sm" label="Do" editable class="min-w-0" :error="dateError || undefined" />
      <AppSelect v-model="fuelType" size="sm" label="Rodzaj paliwa" :options="fuelOptions" class="min-w-0" />
      <AppSelect v-if="canViewVerification" v-model="gpsFilter" size="sm" label="Wynik GPS" :options="gpsOptions" class="min-w-0" />
    </div>
    <p v-if="loading && !rows.length" class="p-4 ui-caption" role="status">Pobieranie transakcji…</p>
    <p v-else-if="!rows.length && !error && !dateError" class="p-4 ui-caption">
      {{ filtered ? 'Brak transakcji pasujących do filtrów.' : 'Brak zapisanych transakcji.' }}
    </p>
    <div v-if="rows.length" class="max-h-[70dvh] min-h-0 overflow-auto md:max-h-none">
      <FuelTransactionTable
        :rows="rows" :gross="gross" :excise-countries="exciseCountries" :can-view-verification="canViewVerification"
        :suggested-vehicle-ids="suggestedVehicleIds" :can-create-station="canCreateStation"
        @verify="selected = $event" @create-station="createStation"
      />
    </div>
    <FuelStationFormModal
      v-if="stationDraft && canCreateStation" :open="true" :station="null" :initial-values="stationDraft"
      @close="stationDraft = null" @saved="load('poll')"
    />
    <FuelTransactionVerificationDialog
      :transaction="canViewVerification ? selected : null" :can-verify="canVerify" @close="selected = null"
    />
    <p v-if="error" class="p-4 ui-error" role="alert">{{ error }}</p>
    <p v-if="vehicleLookupError" class="p-4 ui-error" role="alert">{{ vehicleLookupError }}</p>
    <div v-if="hasMore" class="border-t border-ui-divider p-3">
      <AppButton size="sm" variant="secondary" :loading="loading" @click="load('more')">Pokaż kolejne</AppButton>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppMultiSelect from '@/components/ui/AppMultiSelect.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import FuelTransactionTable from '@/components/fuel/FuelTransactionTable.vue'
import FuelTransactionVerificationDialog from '@/components/fuel/FuelTransactionVerificationDialog.vue'
import FuelStationFormModal from '@/components/fuel-stations/FuelStationFormModal.vue'
import { useFuelStationPermissions } from '@/composables/useFuelStationPermissions'
import { useWorkspacePolling } from '@/composables/useWorkspace'
import { getApiErrorMessage } from '@/services/api'
import { fuelImportService, type FuelHistoryFilters, type FuelTransactionRow } from '@/services/fuelImportService'
import { fuelGpsLabels } from '@/services/fuelVerificationService'
import { useAuthStore } from '@/stores/authStore'
import { useFuelStationStore } from '@/stores/fuelStationStore'
import { vehicleService } from '@/services/vehicleService'
import type { ApiVehicle } from '@/types/fleet'
import type { FuelStationWrite } from '@/types/fuelStation'

const props = defineProps<{ vehicleId?: number; importId?: number }>()
const auth = useAuthStore()
const hasPermission = (permission: string) => Boolean(auth.activeCompanyId && (
  auth.user?.sysAdmin || auth.user?.globalRoles?.includes('GLOBAL_ADMIN')
  || auth.hasActiveCompanyRole('COMPANY_ADMIN') || auth.hasActiveCompanyPermission(permission)
))
const canViewVerification = computed(() => hasPermission('positions.read'))
const canVerify = computed(() => hasPermission('fuel_imports.manage'))
const canReadVehicles = computed(() => hasPermission('vehicles.read'))
const { canRead: canReadStations, canManage: canManageStations } = useFuelStationPermissions()
const canCreateStation = computed(() => canReadStations.value && canManageStations.value)
const stationStore = useFuelStationStore()
const stationDraft = ref<FuelStationWrite | null>(null)
const vehicles = ref<ApiVehicle[]>([])
const vehicleLookupError = ref('')
const selected = ref<FuelTransactionRow | null>(null)
const gross = ref(false)
const exciseCountries = ref<string[]>([])
const exciseOptions = [
  { value: 'BE', label: 'Belgia · 0,19130 €/l' },
  { value: 'FR', label: 'Francja · 0,1556 €/l' },
]
const rows = ref<FuelTransactionRow[]>([])
const registrationKey = (value: string) => value.replace(/\s+/g, '').toUpperCase()
const suggestedVehicleIds = computed(() => {
  const byRegistration = new Map<string, number | null>()
  for (const vehicle of vehicles.value) {
    const key = registrationKey(vehicle.licensePlate)
    byRegistration.set(key, byRegistration.has(key) ? null : vehicle.id)
  }
  const suggestions = new Map<number, number>()
  for (const row of rows.value) {
    if (!row.reportedRegistration) continue
    const id = byRegistration.get(registrationKey(row.reportedRegistration))
    if (id != null) suggestions.set(row.row, id)
  }
  return suggestions
})
const nextPage = ref(0)
const loading = ref(false)
const hasMore = ref(false)
const error = ref('')
const search = ref('')
const query = ref('')
const from = ref('')
const to = ref('')
const fuelType = ref('')
const gpsFilter = ref('')
const dateError = computed(() => from.value && to.value && from.value > to.value ? 'Podaj datę równą lub późniejszą od daty „Od”.' : '')
const filtered = computed(() => Boolean(query.value || from.value || to.value || fuelType.value || gpsFilter.value))
const filters = computed<FuelHistoryFilters>(() => ({
  vehicleId: props.vehicleId,
  importId: props.importId,
  gpsStatus: canViewVerification.value ? gpsFilter.value || undefined : undefined,
  q: query.value || undefined,
  from: from.value || undefined,
  to: to.value || undefined,
  fuelType: fuelType.value || undefined,
}))
const fuelOptions = [
  { value: '', label: 'Wszystkie produkty' },
  { value: 'DIESEL', label: 'Olej napędowy' },
  { value: 'ADBLUE', label: 'AdBlue' },
  { value: 'OTHER', label: 'Inne' },
]
const gpsOptions = [
  { value: '', label: 'Wszystkie wyniki' },
  ...Object.entries(fuelGpsLabels).map(([value, label]) => ({ value, label })),
]
let revision = 0

watch(() => [auth.activeCompanyId, canReadVehicles.value], async (_value, _previous, onCleanup) => {
  let current = true
  onCleanup(() => { current = false })
  vehicles.value = []
  vehicleLookupError.value = ''
  stationDraft.value = null
  if (!canReadVehicles.value) return
  try {
    const result = await vehicleService.getVehicles({ silent: true })
    if (current) vehicles.value = result
  } catch (cause) {
    if (current) vehicleLookupError.value = `Nie udało się dopasować sugestii pojazdów. ${getApiErrorMessage(cause)}`
  }
}, { immediate: true })

function createStation(item: FuelTransactionRow) {
  if (!canCreateStation.value || item.stationKnown) return
  stationStore.ensureCompany(auth.activeCompanyId)
  void stationStore.loadProviders()
  stationDraft.value = {
    provider: item.provider || 'IDS',
    stationCode: item.stationCode,
    stationName: item.stationName || '',
    country: item.country || '',
    lat: null,
    lng: null,
  }
}

watch(search, (value, _previous, onCleanup) => {
  const timer = window.setTimeout(() => { query.value = value.trim() }, 250)
  onCleanup(() => window.clearTimeout(timer))
})

async function load(mode: 'reset' | 'more' | 'poll') {
  if (mode !== 'reset' && loading.value) return
  const request = ++revision
  const currentFilters = filters.value
  const silent = mode === 'poll'
  if (mode === 'reset') {
    rows.value = []
    hasMore.value = false
    nextPage.value = 0
    loading.value = false
    error.value = ''
  }
  if (dateError.value) return

  if (!silent) {
    loading.value = true
    error.value = ''
  }
  let page = mode === 'more' ? nextPage.value : 0
  const end = silent ? Math.max(1, nextPage.value) : page + 1
  const items = new Map((mode === 'more' ? rows.value : []).map(row => [row.row, row]))
  try {
    let more = true
    while (page < end && more) {
      const result = await fuelImportService.history(page, currentFilters)
      if (request !== revision) return
      for (const row of result.rows) items.set(row.row, row)
      more = result.hasMore
      page++
    }
    rows.value = [...items.values()]
    nextPage.value = page
    hasMore.value = more
    error.value = ''
  } catch (cause) {
    if (request === revision && (!silent || nextPage.value === 0)) error.value = getApiErrorMessage(cause)
  } finally {
    if (request === revision && !silent) loading.value = false
  }
}

watch(filters, () => load('reset'), { immediate: true })
useWorkspacePolling(() => load('poll'), 10_000)
</script>
