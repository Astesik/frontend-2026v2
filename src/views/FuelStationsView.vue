<template>
  <section class="flex min-h-0 min-w-0 flex-col gap-4 text-ui-text md:h-full">
    <header class="flex shrink-0 flex-wrap items-end justify-between gap-3">
      <div class="flex min-w-0 flex-wrap items-end gap-2">
        <AppInput v-model="store.filters.q" placeholder="Szukaj stacji" aria-label="Szukaj stacji" size="sm" class="w-60 max-w-full" :disabled="!canRead" />
        <AppSelect v-model="store.filters.provider" :options="providerOptions" size="sm" class="!w-36" aria-label="Dostawca" :disabled="!canRead" />
        <AppSelect v-model="store.filters.country" :options="countryOptions" size="sm" class="!w-44" aria-label="Kraj" :disabled="!canRead" />
        <AppSelect v-model="store.filters.active" :options="activeOptions" size="sm" class="!w-36" aria-label="Aktywność stacji" :disabled="!canRead" />
      </div>
      <div class="flex flex-wrap gap-2">
        <AppButton v-if="canImport && canRead" variant="secondary" :disabled="store.isChangingActive" @click="importOpen = true"><Upload class="h-4 w-4" />Importuj ceny</AppButton>
        <AppButton v-if="canManage && canRead" :disabled="store.isChangingActive" @click="editing = null; formOpen = true"><Plus class="h-4 w-4" />Dodaj stację</AppButton>
      </div>
    </header>
    <div v-if="!canRead" class="ui-surface p-6 text-ui-mutedText">Nie masz uprawnień do wyświetlania stacji paliw.</div>
    <div v-else class="ui-surface flex min-h-0 flex-col overflow-hidden md:flex-1" :aria-busy="store.isChangingActive">
      <div class="flex shrink-0 items-center justify-between border-b border-ui-divider px-4 py-3"><h1 class="ui-section-title flex items-center gap-2"><Fuel class="h-4 w-4" />Stacje paliw</h1><span class="ui-caption">{{ store.total }} stacji</span></div>
      <p v-if="store.error" role="alert" class="ui-error px-4 pt-3">{{ store.error }}</p>
      <p v-if="store.isChangingActive" role="status" class="ui-caption px-4 pt-2">Zapisywanie aktywności stacji…</p>
      <div v-if="canManage && store.selectedIds.length" class="flex shrink-0 flex-wrap items-center gap-2 border-b border-ui-divider bg-info-50 px-4 py-2 dark:bg-info-400/10" role="region" aria-label="Wybrane stacje">
        <span class="mr-auto ui-body-sm">Zaznaczono na tej stronie: {{ store.selectedIds.length }}</span>
        <AppButton size="sm" variant="secondary" :disabled="activityDisabled" @click="store.setSelectedActive(true)"><Power class="h-4 w-4" />Aktywuj wybrane</AppButton>
        <AppButton size="sm" variant="secondary" :disabled="activityDisabled" @click="store.setSelectedActive(false)"><PowerOff class="h-4 w-4" />Dezaktywuj wybrane</AppButton>
      </div>
      <div class="max-h-[calc(100dvh-18rem)] min-h-48 overflow-auto md:min-h-0 md:max-h-none md:flex-1">
        <table class="ui-table w-full whitespace-nowrap text-left text-sm">
          <thead class="ui-table-head sticky top-0 z-10"><tr><th v-if="canManage" class="ui-table-cell !px-2"><AppCheckbox :model-value="store.pageSelected" aria-label="Zaznacz widoczną stronę" :disabled="activityDisabled || store.isLoading || !store.stations.length" @update:model-value="store.selectPage" /></th><th class="ui-table-cell">Stacja</th><th class="ui-table-cell">Dostawca</th><th class="ui-table-cell">Kraj</th><th class="ui-table-cell">Cena bazowa</th><th class="ui-table-cell">Cena końcowa</th><th class="ui-table-cell">Data ceny</th><th class="ui-table-cell">Status</th><th class="ui-table-cell">GPS</th><th class="ui-table-cell sticky right-0 bg-ui-muted text-right">Akcje</th></tr></thead>
          <tbody>
            <tr v-if="store.isLoading"><td :colspan="columnCount" class="ui-table-cell py-12 text-center text-ui-mutedText">Pobieranie stacji…</td></tr>
            <template v-else><tr v-for="station in store.stations" :key="station.id" class="ui-table-row">
              <td v-if="canManage" class="ui-table-cell !px-2"><AppCheckbox :model-value="store.selectedIds.includes(station.id)" :aria-label="`Zaznacz stację ${station.stationName}`" :disabled="activityDisabled" @update:model-value="store.toggleSelection(station.id, $event)" /></td>
              <td class="ui-table-cell"><p class="font-semibold">{{ station.stationName }}</p><span class="ui-caption">{{ station.stationCode }}</span></td><td class="ui-table-cell">{{ station.provider }}</td><td class="ui-table-cell">{{ station.country }}</td>
              <td class="ui-table-cell tabular-nums">{{ formatFuelPrice(station.latestPrice?.priceBase, station.latestPrice?.currency) }}</td><td class="ui-table-cell font-semibold tabular-nums">{{ formatFuelPrice(station.latestPrice?.priceFinal, station.latestPrice?.currency) }}</td><td class="ui-table-cell">{{ station.latestPrice ? dateLabel(station.latestPrice.priceDate) : '—' }}</td>
              <td class="ui-table-cell"><AppSwitch v-if="canManage" :model-value="station.active" :label="station.active ? 'Aktywna' : 'Nieaktywna'" class="min-w-36 !py-1" :disabled="activityDisabled" @update:model-value="store.setStationActive(station.id, $event)" /><AppBadge v-else :variant="station.active ? 'success' : 'neutral'">{{ station.active ? 'Aktywna' : 'Nieaktywna' }}</AppBadge></td>
              <td class="ui-table-cell"><span :title="hasStationLocation(station) ? `${station.lat}, ${station.lng}` : 'Brak współrzędnych'">{{ hasStationLocation(station) ? 'Tak' : '—' }}</span></td>
              <td class="ui-table-cell sticky right-0 bg-ui-surface"><div class="flex justify-end gap-1"><AppIconButton label="Historia cen" variant="ghost" @click="store.loadHistory(station)"><History class="h-4 w-4" /></AppIconButton><AppIconButton v-if="canManage" label="Edytuj stację" variant="ghost" @click="editing = station; formOpen = true"><SquarePen class="h-4 w-4" /></AppIconButton></div></td>
            </tr><tr v-if="!store.stations.length"><td :colspan="columnCount" class="ui-table-cell py-12 text-center text-ui-mutedText">Brak stacji pasujących do filtrów.</td></tr></template>
          </tbody>
        </table>
      </div>
      <AppPagination v-model:page="store.filters.page" v-model:page-size="store.filters.size" :total="store.total" :page-sizes="[10,25,50,100,200]" class="px-4 pb-4" />
    </div>
    <FuelStationImportModal :open="importOpen && canImport" @close="importOpen = false" />
    <FuelStationFormModal :open="formOpen && canManage" :station="editing" @close="formOpen = false" />
    <FuelStationHistoryModal />
  </section>
</template>
<script setup lang="ts">
import { toRef } from 'vue'
import { useWorkspaceViewState } from '@/composables/useWorkspace'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Fuel, History, Plus, Power, PowerOff, SquarePen, Upload } from 'lucide-vue-next'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import FuelStationHistoryModal from '@/components/fuel-stations/FuelStationHistoryModal.vue'
import FuelStationImportModal from '@/components/fuel-stations/FuelStationImportModal.vue'
import FuelStationFormModal from '@/components/fuel-stations/FuelStationFormModal.vue'
import { useFuelStationStore } from '@/stores/fuelStationStore'
import { useAuthStore } from '@/stores/authStore'
import { useFuelStationPermissions } from '@/composables/useFuelStationPermissions'
import { formatFuelPrice, hasStationLocation } from '@/utils/fuelStation'
import type { FuelStation } from '@/types/fuelStation'
const store = useFuelStationStore(), auth = useAuthStore()
const { canRead, canManage, canImport } = useFuelStationPermissions()
const activeOptions = [{ value: 'all', label: 'Wszystkie' }, { value: 'active', label: 'Aktywne' }, { value: 'inactive', label: 'Nieaktywne' }]
const activityDisabled = computed(() => store.isChangingActive || store.isSaving || store.isImporting)
const columnCount = computed(() => canManage.value ? 10 : 9)
watch(canManage, () => { store.selectedIds = [] })
const importOpen = ref(false), formOpen = ref(false), editing = ref<FuelStation | null>(null)
const providerOptions = computed(() => [{ value: '', label: 'Wszyscy dostawcy' }, ...store.providers.map(p => ({ value: p.code, label: p.code }))])
const countryOptions = computed(() => [{ value: '', label: 'Wszystkie kraje' }, ...store.countries.map(c => ({ value: c.country, label: c.country }))])
useWorkspaceViewState({ searchQuery: toRef(store.filters, 'q'), provider: toRef(store.filters, 'provider'), country: toRef(store.filters, 'country'), active: toRef(store.filters, 'active'), currentPage: toRef(store.filters, 'page'), pageSize: toRef(store.filters, 'size') })
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch([() => auth.activeCompanyId, canRead], () => { store.ensureCompany(auth.activeCompanyId); importOpen.value = false; formOpen.value = false; store.closeHistory(); if (canRead.value) { void store.loadProviders(); void store.loadCountries(); void store.loadStations() } }, { immediate: true })
watch(() => store.filters.provider, () => { store.filters.country = ''; if (canRead.value) void store.loadCountries() })
watch(() => [store.filters.provider, store.filters.country, store.filters.q, store.filters.active, store.filters.size], () => {
  store.filters.page = 1; clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { if (canRead.value) void store.loadStations() }, 300)
})
watch(() => store.filters.page, () => { clearTimeout(searchTimer); if (canRead.value) void store.loadStations() })
function dateLabel(value: string) { return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
onBeforeUnmount(() => { clearTimeout(searchTimer); store.closeHistory() })
</script>
