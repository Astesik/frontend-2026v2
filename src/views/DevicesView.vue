<template>
  <div class="space-y-5 xl:flex xl:h-[calc(100dvh-3rem)] xl:min-h-0 xl:flex-col xl:space-y-0 xl:gap-4 xl:overflow-hidden">
    <header class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Telematyka</p>
        <h1 class="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">Urządzenia</h1>
      </div>

      <div class="flex flex-col gap-2 sm:grid sm:grid-cols-2 xl:flex xl:flex-row xl:items-end">
        <AppSelect v-model="typeFilter" class="min-w-40" label="Typ urządzenia" :options="typeOptions" size="sm" />
        <AppSelect v-model="statusFilter" class="min-w-40" label="Status" :options="statusOptions" size="sm" />
        <AppSelect v-model="providerFilter" class="min-w-44" label="Dostawca" :options="providerOptions" size="sm" />
        <AppInput
          v-model="searchQuery"
          class="sm:col-span-2 xl:w-72"
          label="Wyszukaj"
          placeholder="Nazwa, numer seryjny, ID"
          size="sm"
          clearable
        />
      </div>
    </header>

    <AppCard compact class="xl:min-h-0 xl:flex-1 xl:overflow-hidden" content-class="xl:flex xl:h-full xl:min-h-0 xl:flex-col">
      <div class="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>{{ filteredDevices.length }} z {{ deviceStore.devices.length }} urządzeń</span>
        <span v-if="deviceStore.isLoading">Pobieranie danych...</span>
      </div>

      <div class="overflow-x-auto xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
        <table class="w-full min-w-[1120px] text-left text-sm">
          <thead class="border-b border-slate-100 text-xs uppercase text-slate-500 dark:border-app-border dark:text-slate-400">
            <tr>
              <th class="w-12 py-2 pr-3 font-medium">#</th>
              <th v-for="column in sortableColumns" :key="column.key" class="py-2 pr-3 font-medium">
                <button type="button" class="inline-flex items-center gap-1.5 transition hover:text-slate-950 dark:hover:text-slate-50" @click="setSort(column.key)">
                  {{ column.label }}
                  <component :is="sortIcon(column.key)" class="h-3.5 w-3.5" />
                </button>
              </th>
              <th class="sticky right-0 z-10 w-16 bg-white py-2 pr-1 text-right font-medium shadow-[-1px_0_0_0_rgb(var(--rw-app-border))] dark:bg-app-panel">Akcje</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(device, index) in paginatedDevices"
              :key="device.id"
              class="group border-b border-slate-100 transition last:border-0 hover:bg-slate-50 dark:border-app-border dark:hover:bg-app-elevated"
            >
              <td class="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{{ (currentPage - 1) * pageSize + index + 1 }}.</td>
              <td class="py-1.5 pr-3">
                <RouterLink class="font-semibold text-slate-950 transition hover:text-slate-600 dark:text-slate-50 dark:hover:text-slate-300" :to="{ name: 'device-detail', params: { id: device.id } }">
                  {{ device.deviceName || `Urządzenie #${device.id}` }}
                </RouterLink>
                <span class="ml-2 text-xs font-medium text-slate-400 dark:text-app-muted">#{{ device.id }}</span>
              </td>
              <td class="py-1.5 pr-3 font-mono text-xs text-slate-700 dark:text-slate-200">{{ device.serialNumber }}</td>
              <td class="py-1.5 pr-3"><AppBadge variant="neutral">{{ deviceTypeLabel(device.type) }}</AppBadge></td>
              <td class="py-1.5 pr-3"><AppBadge :variant="device.status === 'ACTIVE' ? 'success' : 'neutral'">{{ deviceStatusLabel(device.status) }}</AppBadge></td>
              <td class="py-1.5 pr-3 text-slate-700 dark:text-slate-200">{{ providerLabel(device.provider) }}</td>
              <td class="py-1.5 pr-3"><AppBadge :variant="device.assignedToVehicle ? 'info' : 'neutral'">{{ device.assignedToVehicle ? 'Przypisane' : 'Wolne' }}</AppBadge></td>
              <td class="py-1.5 pr-3 font-medium" :class="lastPositionClasses(device.lastPositionAt)">{{ formatDateTime(device.lastPositionAt) }}</td>
              <td class="py-1.5 pr-3 text-slate-700 dark:text-slate-200">{{ formatDateTime(device.createdAt) }}</td>
              <td class="sticky right-0 z-10 bg-white py-1.5 pr-1 text-right shadow-[-1px_0_0_0_rgb(var(--rw-app-border))] transition group-hover:bg-slate-50 dark:bg-app-panel dark:group-hover:bg-app-elevated">
                <RouterLink
                  class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:bg-app-panel dark:text-slate-200 dark:hover:bg-app-elevated"
                  :to="{ name: 'device-detail', params: { id: device.id } }"
                  aria-label="Szczegóły urządzenia"
                >
                  <SquarePen class="h-4 w-4" />
                </RouterLink>
              </td>
            </tr>

            <tr v-if="!filteredDevices.length">
              <td colspan="10" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">Brak urządzeń pasujących do filtrów.</td>
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
import { computed, onMounted, ref, watch, type Component } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowDown, ArrowUp, ArrowUpDown, SquarePen } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppSelect, { type AppSelectOption } from '@/components/ui/AppSelect.vue'
import { useDeviceStore } from '@/stores/deviceStore'
import type { DeviceListItem, DeviceProvider, DeviceStatus, DeviceType } from '@/types/device'

type DeviceSortKey = 'deviceName' | 'serialNumber' | 'type' | 'status' | 'provider' | 'assignedToVehicle' | 'lastPositionAt' | 'createdAt'
type SortDirection = 'asc' | 'desc'

const deviceStore = useDeviceStore()
const searchQuery = ref('')
const typeFilter = ref<'all' | DeviceType>('all')
const statusFilter = ref<'all' | DeviceStatus>('all')
const providerFilter = ref<'all' | DeviceProvider>('all')
const sortKey = ref<DeviceSortKey>('deviceName')
const sortDirection = ref<SortDirection>('asc')
const currentPage = ref(1)
const pageSize = ref(10)

const typeOptions: AppSelectOption[] = [
  { label: 'Wszystkie typy', value: 'all' },
  { label: 'Nowe', value: 'NEW' },
  { label: 'Ciągniki', value: 'TRUCK' },
  { label: 'Naczepy', value: 'TRAILER' },
  { label: 'Samochody', value: 'CAR' },
]

const statusOptions: AppSelectOption[] = [
  { label: 'Wszystkie statusy', value: 'all' },
  { label: 'Aktywne', value: 'ACTIVE' },
  { label: 'Nieaktywne', value: 'INACTIVE' },
]

const providerOptions: AppSelectOption[] = [
  { label: 'Wszyscy dostawcy', value: 'all' },
  { label: 'Lokalne', value: 'LOCAL' },
  { label: 'GPS Online', value: 'GPS_ONLINE' },
  { label: 'Flespi', value: 'FLESPI' },
  { label: 'ABERG', value: 'ABERG' },
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
    if (typeFilter.value !== 'all' && device.type !== typeFilter.value) return false
    if (statusFilter.value !== 'all' && device.status !== statusFilter.value) return false
    if (providerFilter.value !== 'all' && device.provider !== providerFilter.value) return false

    if (!query) return true

    return [device.id, device.deviceName, device.serialNumber, device.provider, device.externalId, device.companyIntegrationId]
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

watch([searchQuery, typeFilter, statusFilter, providerFilter], () => {
  currentPage.value = 1
})

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
  if (key === 'assignedToVehicle') return device.assignedToVehicle ? 1 : 0
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

function formatDateTime(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })
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
</script>
