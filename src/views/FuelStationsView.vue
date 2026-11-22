<template>
  <section class="flex min-h-0 min-w-0 flex-col text-ui-text md:h-full">
    <p v-if="!canRead" class="ui-surface p-6 text-ui-mutedText">Nie masz uprawnień do wyświetlania stacji paliw.</p>
    <AppCard
      v-else title="Stacje paliw" :icon="Fuel" compact
      class="flex min-h-0 flex-1 flex-col [&>.ui-card-header]:flex-wrap [&>.ui-card-header]:items-center"
      content-class="flex min-h-0 flex-1 flex-col !p-0"
    >
      <template #actions>
        <div class="flex flex-wrap gap-2">
          <AppButton v-if="canImport" size="sm" variant="secondary" :disabled="store.isChangingActive" @click="importOpen = true">
            <Upload class="h-4 w-4" />Importuj ceny IDS
          </AppButton>
          <AppButton v-if="canManage" size="sm" :disabled="store.isChangingActive" @click="editing = null; formOpen = true">
            <Plus class="h-4 w-4" />Dodaj stację
          </AppButton>
        </div>
      </template>

      <div class="grid shrink-0 grid-cols-2 items-start gap-3 border-b border-ui-divider p-3 lg:grid-cols-[minmax(14rem,2fr)_repeat(3,minmax(0,1fr))]">
        <AppInput v-model="store.filters.q" label="Szukaj" placeholder="Nazwa lub kod stacji" size="sm" clearable class="col-span-2 min-w-0 lg:col-span-1" />
        <AppSelect v-model="store.filters.provider" label="Dostawca" :options="providerOptions" size="sm" class="min-w-0" />
        <AppSelect v-model="store.filters.country" label="Kraj" :options="countryOptions" size="sm" class="min-w-0" />
        <AppSelect v-model="store.filters.active" label="Status" :options="activeOptions" size="sm" class="min-w-0" />
      </div>

      <p v-if="store.error" role="alert" class="ui-error px-4 py-3">{{ store.error }}</p>
      <div v-if="canManage && store.selectedIds.length" class="flex shrink-0 flex-wrap items-center gap-2 border-b border-ui-divider bg-ui-muted px-3 py-2" role="region" aria-label="Wybrane stacje">
        <span class="mr-auto ui-caption">Zaznaczono na tej stronie {{ store.selectedIds.length }}</span>
        <AppButton size="sm" variant="secondary" :disabled="activityDisabled" @click="store.setSelectedActive(true)">
          <Power class="h-4 w-4" />Aktywuj wybrane
        </AppButton>
        <AppButton size="sm" variant="secondary" :disabled="activityDisabled" @click="store.setSelectedActive(false)">
          <PowerOff class="h-4 w-4" />Dezaktywuj wybrane
        </AppButton>
      </div>

      <div class="relative flex min-h-48 flex-1 flex-col" :aria-busy="store.isLoading || store.isChangingActive">
        <div class="max-h-[70dvh] min-h-0 flex-1 overflow-auto md:max-h-none">
          <table class="ui-table min-w-[80rem] table-fixed" aria-label="Stacje paliw">
            <colgroup>
              <col v-if="canManage" class="w-10" />
              <col class="w-12" />
              <col />
              <col class="w-24" />
              <col class="w-32" />
              <col class="w-28" />
              <col class="w-28" />
              <col class="w-28" />
              <col class="w-40" />
              <col class="w-36" />
              <col class="w-24" />
            </colgroup>
            <thead class="ui-table-head">
              <tr class="divide-x divide-ui-divider [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:h-11 [&>th]:bg-ui-muted [&>th]:px-3 [&>th]:py-1 [&>th]:leading-tight">
                <th v-if="canManage" scope="col" class="!px-1">
                  <AppCheckbox :model-value="store.pageSelected" aria-label="Zaznacz widoczną stronę" :disabled="activityDisabled || !store.stations.length" @update:model-value="store.selectPage" />
                </th>
                <th scope="col">Lp.</th>
                <th scope="col">Stacja</th>
                <th scope="col">Dostawca</th>
                <th scope="col">Kraj</th>
                <th scope="col">Cena bazowa</th>
                <th scope="col">Cena końcowa</th>
                <th scope="col">Data ceny</th>
                <th scope="col">Status</th>
                <th scope="col">GPS</th>
                <th scope="col" class="right-0 !z-20 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(station, index) in store.stations" :key="station.id"
                class="ui-table-row group divide-x divide-ui-divider [&>td]:px-3 [&>td]:py-1 [&>td]:align-middle"
              >
                <td v-if="canManage" class="!px-1">
                  <AppCheckbox :model-value="store.selectedIds.includes(station.id)" :aria-label="'Zaznacz stację ' + station.stationName" :disabled="activityDisabled" @update:model-value="store.toggleSelection(station.id, $event)" />
                </td>
                <td class="text-xs tabular-nums text-ui-mutedText">{{ (store.filters.page - 1) * store.filters.size + index + 1 }}.</td>
                <td>
                  <p class="break-words font-medium text-ui-text">{{ station.stationName }}</p>
                  <p class="ui-caption">{{ station.stationCode }}</p>
                </td>
                <td>{{ station.provider }}</td>
                <td class="break-words">{{ station.country }}</td>
                <td class="whitespace-nowrap font-medium tabular-nums text-ui-text">{{ formatFuelPrice(station.latestPrice?.priceBase, station.latestPrice?.currency) }}</td>
                <td class="whitespace-nowrap font-medium tabular-nums text-ui-text">{{ formatFuelPrice(station.latestPrice?.priceFinal, station.latestPrice?.currency) }}</td>
                <td class="tabular-nums">
                  <time v-if="station.latestPrice" :datetime="station.latestPrice.priceDate">{{ dateLabel(station.latestPrice.priceDate) }}</time>
                  <span v-else>—</span>
                </td>
                <td>
                  <AppSwitch
                    v-if="canManage" :model-value="station.active" :label="station.active ? 'Aktywna' : 'Nieaktywna'"
                    class="!min-h-0 !gap-2 !border-0 !bg-transparent !px-0 !py-0 !shadow-none"
                    :disabled="activityDisabled" @update:model-value="store.setStationActive(station.id, $event)"
                  />
                  <AppBadge v-else :variant="station.active ? 'success' : 'neutral'">{{ station.active ? 'Aktywna' : 'Nieaktywna' }}</AppBadge>
                </td>
                <td class="break-words text-xs tabular-nums" :class="{ 'text-ui-mutedText': !hasStationLocation(station) }">{{ formatStationLocation(station) }}</td>
                <td class="sticky right-0 bg-ui-surface transition group-hover:bg-ui-hover">
                  <div class="flex items-center justify-end gap-1">
                    <AppIconButton label="Historia cen" size="sm" variant="ghost" @click="store.loadHistory(station)">
                      <History class="h-4 w-4" />
                    </AppIconButton>
                    <AppIconButton v-if="canManage" label="Edytuj stację" size="sm" variant="ghost" @click="editing = station; formOpen = true">
                      <SquarePen class="h-4 w-4" />
                    </AppIconButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-if="!store.isLoading && !store.error && !store.stations.length" class="pointer-events-none absolute inset-x-0 top-16 px-4 text-center ui-caption">Brak stacji pasujących do filtrów.</p>
        <AppLoadingIndicator
          v-if="store.isLoading || store.isChangingActive" class="absolute inset-0 z-20 bg-ui-surface/85"
          :label="store.isChangingActive ? 'Zapisywanie aktywności stacji…' : 'Ładowanie danych…'"
        />
      </div>

      <AppPagination v-model:page="store.filters.page" v-model:page-size="store.filters.size" :total="store.total" :page-sizes="[10,25,50,100,200]" class="px-3 !py-3" />
    </AppCard>
    <FuelStationImportModal :open="importOpen && canImport" @close="importOpen = false" />
    <FuelStationFormModal :open="formOpen && canManage" :station="editing" @close="formOpen = false" />
    <FuelStationHistoryModal />
  </section>
</template>
<script setup lang="ts">
import { toRef } from 'vue'
import { useWorkspaceViewState } from '@/composables/useWorkspace'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  IconGasStation as Fuel,
  IconHistory as History,
  IconPlus as Plus,
  IconToggleRight as Power,
  IconToggleLeft as PowerOff,
  IconEdit as SquarePen,
  IconUpload as Upload,
} from '@tabler/icons-vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppLoadingIndicator from '@/components/ui/AppLoadingIndicator.vue'
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
import { formatFuelPrice, formatStationLocation, hasStationLocation } from '@/utils/fuelStation'
import type { FuelStation } from '@/types/fuelStation'
const store = useFuelStationStore(), auth = useAuthStore()
const { canRead, canManage, canImport } = useFuelStationPermissions()
const activeOptions = [{ value: 'all', label: 'Wszystkie' }, { value: 'active', label: 'Aktywne' }, { value: 'inactive', label: 'Nieaktywne' }]
const activityDisabled = computed(() => store.isLoading || store.isChangingActive || store.isSaving || store.isImporting)
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
