<template>
  <div class="space-y-5 md:flex md:h-full md:min-h-0 md:flex-col md:space-y-0 md:gap-4 md:overflow-hidden">
    <ResponsiveListToolbar v-model:sort-key="sortKey" v-model:sort-direction="sortDirection" :columns="sortableColumns">
      <template #search>
        <AppInput
          v-model="searchQuery"
          label="Wyszukaj"
          placeholder="Nazwa, numer seryjny, ID"
          size="sm"
          clearable
        />
      </template>
      <template #filters>
        <AppMultiSelect
          v-model="providerFilters"
          class="min-w-0 lg:w-40"
          label="Dostawca"
          :options="providerFilterOptions"
          all-selected-label="Wszyscy"
          placeholder="Brak dostawców"
          size="sm"
        />
        <AppMultiSelect
          v-model="assignmentFilters"
          class="min-w-0 lg:w-36"
          label="Przypisanie"
          :options="assignmentFilterOptions"
          all-selected-label="Wszystkie"
          placeholder="Brak statusów"
          size="sm"
        />
      </template>
    </ResponsiveListToolbar>

    <AppCard compact class="md:min-h-0 md:flex-1 md:overflow-hidden" content-class="md:flex md:h-full md:min-h-0 md:flex-col">
      <div class="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 ui-caption">
        <span>{{ filteredDevices.length }} z {{ deviceStore.devices.length }} urządzeń</span>
        <span v-if="deviceStore.isLoading">Pobieranie danych...</span>
      </div>

      <div class="min-w-0 md:min-h-0 md:flex-1 md:overflow-y-auto lg:overflow-x-auto">
        <ul v-if="paginatedDevices.length" class="divide-y divide-ui-divider lg:hidden" aria-label="Urządzenia">
          <li v-for="device in paginatedDevices" :key="device.id">
            <RouterLink
              class="flex min-w-0 items-center gap-3 rounded-md py-3 transition hover:bg-ui-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-focus"
              :to="{ name: 'device-detail', params: { id: device.id } }"
            >
              <div class="min-w-0 flex-1 space-y-1">
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span class="text-sm font-semibold text-ui-text [overflow-wrap:anywhere]">{{ device.deviceName || `Urządzenie #${device.id}` }}</span>
                  <AppBadge :variant="device.status === 'ACTIVE' ? 'success' : 'neutral'">{{ deviceStatusLabel(device.status) }}</AppBadge>
                </div>
                <p class="ui-caption [overflow-wrap:anywhere]">{{ providerLabel(device.provider) }} · {{ deviceAssignmentLabel(device) }}</p>
                <p class="ui-caption" :title="device.lastPositionAt ? formatDateTime(device.lastPositionAt) : undefined">
                  Ostatnia pozycja <span class="ml-1 font-medium" :class="lastPositionClasses(device.lastPositionAt)">{{ formatPositionAge(device.lastPositionAt) }}</span>
                </p>
              </div>
              <ChevronRight class="h-4 w-4 shrink-0 text-ui-icon" aria-hidden="true" />
            </RouterLink>
          </li>
        </ul>
        <p v-else-if="!deviceStore.isLoading" class="py-8 text-center ui-body-sm text-ui-mutedText lg:hidden">Brak urządzeń pasujących do filtrów.</p>

        <table class="ui-table hidden min-w-[1120px] lg:table">
          <thead class="ui-table-head">
            <tr>
              <th class="w-12 py-2 pr-3 font-medium">#</th>
              <th v-for="column in sortableColumns" :key="column.key" class="py-2 pr-3 font-medium">
                <button type="button" class="inline-flex items-center gap-1.5 transition hover:text-ui-text" @click="setSort(column.key)">
                  {{ column.label }}
                  <component :is="sortIcon(column.key)" class="h-3.5 w-3.5" />
                </button>
              </th>
              <th class="sticky right-0 z-10 w-16 bg-ui-muted py-2 pr-1 text-right font-medium shadow-[-1px_0_0_0_rgb(var(--rw-border))]">Akcje</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(device, index) in paginatedDevices"
              :key="device.id"
              class="ui-table-row group"
            >
              <td class="py-1.5 pr-3 text-ui-mutedText">{{ (currentPage - 1) * pageSize + index + 1 }}.</td>
              <td class="py-1.5 pr-3">
                <RouterLink class="font-semibold text-ui-text transition hover:text-ui-text-secondary" :to="{ name: 'device-detail', params: { id: device.id } }">
                  {{ device.deviceName || `Urządzenie #${device.id}` }}
                </RouterLink>
                <span class="ml-2 text-xs font-medium text-ui-mutedText">#{{ device.id }}</span>
              </td>
              <td class="py-1.5 pr-3 font-mono text-xs text-ui-text-secondary">{{ device.serialNumber }}</td>
              <td class="py-1.5 pr-3"><AppBadge fixed-width="sm" variant="neutral">{{ deviceTypeLabel(device.type) }}</AppBadge></td>
              <td class="py-1.5 pr-3"><AppBadge fixed-width="sm" :variant="device.status === 'ACTIVE' ? 'success' : 'neutral'">{{ deviceStatusLabel(device.status) }}</AppBadge></td>
              <td class="py-1.5 pr-3 text-ui-text-secondary">{{ providerLabel(device.provider) }}</td>
              <td class="py-1.5 pr-3">
                <RouterLink
                  v-if="device.assignedVehicleId"
                  class="inline-flex min-w-24 items-center justify-center rounded-[var(--rw-radius-control)] border border-info-100 bg-info-50 px-2 py-1 text-xs font-semibold text-info-600 transition hover:border-info-200 hover:bg-info-100 dark:border-info-400/40 dark:bg-info-400/10 dark:text-info-400"
                  :to="{ name: 'vehicle-detail', params: { id: device.assignedVehicleId } }"
                >
                  {{ device.assignedVehicleLicensePlate || `Pojazd #${device.assignedVehicleId}` }}
                </RouterLink>
                <AppBadge v-else fixed-width="md" variant="neutral">Wolne</AppBadge>
              </td>
              <td class="py-1.5 pr-3 font-medium" :class="lastPositionClasses(device.lastPositionAt)">{{ formatDateTime(device.lastPositionAt) }}</td>
              <td class="py-1.5 pr-3 text-ui-text-secondary">{{ formatDateTime(device.createdAt) }}</td>
              <td class="sticky right-0 z-10 bg-ui-surface py-1.5 pr-1 text-right shadow-[-1px_0_0_0_rgb(var(--rw-border))] transition group-hover:bg-ui-hover">
                <RouterLink
                  class="ui-icon-button !h-8 !w-8"
                  :to="{ name: 'device-detail', params: { id: device.id } }"
                  aria-label="Szczegóły urządzenia"
                >
                  <SquarePen class="h-4 w-4" />
                </RouterLink>
              </td>
            </tr>

            <tr v-if="!filteredDevices.length">
              <td colspan="10" class="py-10 text-center ui-body-sm text-ui-mutedText">Brak urządzeń pasujących do filtrów.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppPagination
        v-model:page="currentPage"
        v-model:page-size="pageSize"
        :total="filteredDevices.length"
      />
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { useWorkspaceViewState } from '@/composables/useWorkspace'
import { computed, onMounted, ref, watch, type Component } from 'vue'
import { RouterLink } from 'vue-router'
import { IconArrowDown as ArrowDown, IconArrowUp as ArrowUp, IconArrowsSort as ArrowUpDown, IconChevronRight as ChevronRight, IconEdit as SquarePen } from '@tabler/icons-vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppMultiSelect from '@/components/ui/AppMultiSelect.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import ResponsiveListToolbar from '@/components/ui/ResponsiveListToolbar.vue'
import type { AppSelectOption } from '@/components/ui/AppSelect.vue'
import { useDeviceStore } from '@/stores/deviceStore'
import type { DeviceListItem, DeviceProvider, DeviceStatus, DeviceType } from '@/types/device'
import { persistStringArray, readPersistedStringArray } from '@/utils/persistedFilters'

type DeviceSortKey = 'deviceName' | 'serialNumber' | 'type' | 'status' | 'provider' | 'assignedToVehicle' | 'lastPositionAt' | 'createdAt'
type SortDirection = 'asc' | 'desc'

const deviceStore = useDeviceStore()
const DEVICE_PROVIDER_FILTER_KEY = 'routewise.devices.providerFilters'
const DEVICE_ASSIGNMENT_FILTER_KEY = 'routewise.devices.assignmentFilters'
const DEVICE_PROVIDER_VALUES: DeviceProvider[] = ['LOCAL', 'GPS_ONLINE', 'FLESPI', 'ABERG']
const DEVICE_ASSIGNMENT_VALUES = ['assigned', 'unassigned'] as const
const searchQuery = ref('')
const providerFilters = ref(readPersistedStringArray(DEVICE_PROVIDER_FILTER_KEY, DEVICE_PROVIDER_VALUES, DEVICE_PROVIDER_VALUES))
const assignmentFilters = ref(readPersistedStringArray(DEVICE_ASSIGNMENT_FILTER_KEY, [...DEVICE_ASSIGNMENT_VALUES], DEVICE_ASSIGNMENT_VALUES))
const sortKey = ref<DeviceSortKey>('deviceName')
const sortDirection = ref<SortDirection>('asc')
const currentPage = ref(1)
const pageSize = ref(10)
const positionAgeFormatter = new Intl.RelativeTimeFormat('pl-PL', { style: 'short' })

const providerFilterOptions: AppSelectOption[] = [
  { label: 'Lokalne', value: 'LOCAL' },
  { label: 'GPS Online', value: 'GPS_ONLINE' },
  { label: 'Flespi', value: 'FLESPI' },
  { label: 'ABERG', value: 'ABERG' },
]

const assignmentFilterOptions: AppSelectOption[] = [
  { label: 'Przypisane', value: 'assigned' },
  { label: 'Wolne', value: 'unassigned' },
]

const sortableColumns: Array<{ key: DeviceSortKey; label: string }> = [
  { key: 'deviceName', label: 'Nazwa' },
  { key: 'serialNumber', label: 'Numer seryjny' },
  { key: 'type', label: 'Typ' },
  { key: 'status', label: 'Status' },
  { key: 'provider', label: 'Dostawca' },
  { key: 'assignedToVehicle', label: 'Przypisanie' },
  { key: 'lastPositionAt', label: 'Ostatnia pozycja' },
  { key: 'createdAt', label: 'Utworzono' },
]

const filteredDevices = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return deviceStore.devices.filter((device) => {
    if (!providerFilters.value.includes(device.provider)) return false

    const assignment = device.assignedToVehicle ? 'assigned' : 'unassigned'
    if (!assignmentFilters.value.includes(assignment)) return false

    if (!query) return true

    return [device.id, device.deviceName, device.serialNumber, device.provider, device.externalId, device.companyIntegrationId, device.assignedVehicleLicensePlate]
      .filter((value) => value !== null && value !== undefined)
      .some((value) => String(value).toLowerCase().includes(query))
  })
})

const sortedDevices = computed(() => {
  const direction = sortDirection.value === 'asc' ? 1 : -1
  return [...filteredDevices.value].sort((first, second) => compareDeviceValues(first, second, sortKey.value) * direction)
})

const paginatedDevices = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedDevices.value.slice(start, start + pageSize.value)
})

watch([searchQuery, providerFilters, assignmentFilters], () => {
  currentPage.value = 1
})

watch(providerFilters, (value) => persistStringArray(DEVICE_PROVIDER_FILTER_KEY, value))
watch(assignmentFilters, (value) => persistStringArray(DEVICE_ASSIGNMENT_FILTER_KEY, value))

function sortIcon(column: DeviceSortKey): Component {
  if (sortKey.value !== column) return ArrowUpDown
  return sortDirection.value === 'asc' ? ArrowUp : ArrowDown
}

function setSort(column: DeviceSortKey) {
  if (sortKey.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }

  sortKey.value = column
  sortDirection.value = 'asc'
}

function sortableValue(device: DeviceListItem, key: DeviceSortKey) {
  if (key === 'assignedToVehicle') return device.assignedVehicleLicensePlate || (device.assignedToVehicle ? 'Przypisane' : 'Wolne')
  if (key === 'lastPositionAt' || key === 'createdAt') {
    const value = device[key]
    const timestamp = value ? new Date(value).getTime() : Number.POSITIVE_INFINITY
    return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp
  }
  return device[key] ?? ''
}

function compareDeviceValues(first: DeviceListItem, second: DeviceListItem, key: DeviceSortKey) {
  const firstValue = sortableValue(first, key)
  const secondValue = sortableValue(second, key)
  if (typeof firstValue === 'number' && typeof secondValue === 'number') return firstValue - secondValue
  return String(firstValue).localeCompare(String(secondValue), 'pl', { numeric: true, sensitivity: 'base' })
}

function deviceTypeLabel(type: DeviceType) {
  return { NEW: 'Nowe', TRUCK: 'Ciągnik', TRAILER: 'Naczepa', CAR: 'Samochód' }[type]
}

function deviceStatusLabel(status: DeviceStatus) {
  return status === 'ACTIVE' ? 'Aktywne' : 'Nieaktywne'
}

function providerLabel(provider: DeviceProvider) {
  return { LOCAL: 'Lokalne', GPS_ONLINE: 'GPS Online', FLESPI: 'Flespi', ABERG: 'ABERG' }[provider]
}

function deviceAssignmentLabel(device: DeviceListItem) {
  if (device.assignedVehicleLicensePlate) return device.assignedVehicleLicensePlate
  if (device.assignedVehicleId) return `Pojazd #${device.assignedVehicleId}`
  return device.assignedToVehicle ? 'Przypisane' : 'Wolne'
}

function formatPositionAge(value: string | null) {
  const timestamp = value ? new Date(value).getTime() : NaN
  if (!Number.isFinite(timestamp)) return 'Brak danych'

  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000))
  if (minutes === 0) return 'przed chwilą'
  if (minutes < 60) return positionAgeFormatter.format(-minutes, 'minute')

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return positionAgeFormatter.format(-hours, 'hour')
  return positionAgeFormatter.format(-Math.floor(hours / 24), 'day')
}

function formatDateTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function lastPositionClasses(value: string | null) {
  if (!value) return 'text-danger-600 dark:text-danger-400'
  const timestamp = new Date(value).getTime()
  const isOffline = Number.isNaN(timestamp) || Date.now() - timestamp >= 24 * 60 * 60 * 1000
  return isOffline
    ? 'text-danger-600 dark:text-danger-400'
    : 'text-slate-700 dark:text-slate-200'
}

onMounted(() => {
  void deviceStore.loadDevices()
})
useWorkspaceViewState({ searchQuery, providerFilters, assignmentFilters, sortKey, sortDirection, currentPage, pageSize }, { providerFilters: ['LOCAL', 'GPS_ONLINE', 'FLESPI', 'ABERG'], assignmentFilters: ['assigned', 'unassigned'] })
</script>
