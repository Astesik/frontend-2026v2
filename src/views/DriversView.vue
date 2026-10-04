<template>
  <div class="space-y-5 xl:flex xl:h-[calc(100dvh-3rem)] xl:min-h-0 xl:flex-col xl:space-y-0 xl:gap-4 xl:overflow-hidden">
    <header class="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
      <AppInput
        v-model="searchQuery"
        class="w-full sm:w-72"
        label="Wyszukaj"
        placeholder="Imię, nazwisko, tachoid lub ID"
        size="sm"
        clearable
      />
      <AppMultiSelect
        v-model="statusFilters"
        class="w-full sm:w-40"
        label="Status"
        :options="statusFilterOptions"
        all-selected-label="Wszystkie"
        placeholder="Brak statusów"
        size="sm"
      />
    </header>

    <AppCard compact class="xl:min-h-0 xl:flex-1 xl:overflow-hidden" content-class="xl:flex xl:h-full xl:min-h-0 xl:flex-col">
      <div class="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 ui-caption">
        <span>{{ filteredDrivers.length }} z {{ driverStore.drivers.length }} kierowców</span>
        <span v-if="driverStore.isLoading">Pobieranie danych...</span>
      </div>

      <div class="overflow-x-auto xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
        <table class="ui-table min-w-[940px]">
          <thead class="ui-table-head">
            <tr>
              <th class="w-12 py-2 pr-3 font-medium">#</th>
              <th v-for="column in sortableColumns" :key="column.key" class="py-2 pr-3 font-medium">
                <button type="button" class="inline-flex items-center gap-1.5 transition hover:text-ui-text" @click="setSort(column.key)">
                  {{ column.label }}
                  <component :is="sortIcon(column.key)" class="h-3.5 w-3.5" />
                </button>
              </th>
              <th class="sticky right-0 z-10 w-28 bg-ui-muted py-2 pr-1 text-right font-medium shadow-[-1px_0_0_0_rgb(var(--rw-border))]">Akcje</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(driver, index) in paginatedDrivers"
              :key="driver.id"
              class="ui-table-row group"
              :class="editingDriverId === driver.id ? '!bg-ui-selected' : ''"
            >
              <td class="py-1.5 pr-3 text-ui-mutedText">{{ (currentPage - 1) * pageSize + index + 1 }}.</td>
              <td class="py-1.5 pr-3">
                <span class="font-semibold text-ui-text">{{ driverDisplayName(driver) }}</span>
                <span class="ml-2 text-xs font-medium text-ui-mutedText">#{{ driver.id }}</span>
              </td>
              <td class="py-1.5 pr-3">
                <AppInput
                  v-if="editingDriverId === driver.id"
                  v-model="editForm.firstName"
                  class="w-40"
                  size="sm"
                  :maxlength="100"
                  aria-label="Imię kierowcy"
                />
                <span v-else class="text-ui-text-secondary">{{ driver.firstName || '-' }}</span>
              </td>
              <td class="py-1.5 pr-3">
                <AppInput
                  v-if="editingDriverId === driver.id"
                  v-model="editForm.lastName"
                  class="w-40"
                  size="sm"
                  :maxlength="100"
                  aria-label="Nazwisko kierowcy"
                />
                <span v-else class="text-ui-text-secondary">{{ driver.lastName || '-' }}</span>
              </td>
              <td class="py-1.5 pr-3">
                <AppInput
                  v-if="editingDriverId === driver.id"
                  v-model="editForm.tachoid"
                  class="w-44"
                  size="sm"
                  type="number"
                  aria-label="Tachoid kierowcy"
                />
                <span v-else class="font-mono text-xs text-ui-text-secondary">{{ driver.tachoid }}</span>
              </td>
              <td class="py-1.5 pr-3">
                <AppSelect
                  v-if="editingDriverId === driver.id"
                  v-model="editForm.status"
                  class="w-32"
                  size="sm"
                  :options="statusOptions"
                  aria-label="Status kierowcy"
                />
                <AppBadge v-else fixed-width="md" :variant="driver.status === 'ACTIVE' ? 'success' : 'neutral'">
                  {{ statusLabel(driver.status) }}
                </AppBadge>
              </td>
              <td
                class="sticky right-0 z-10 bg-ui-surface py-1.5 pr-1 text-right shadow-[-1px_0_0_0_rgb(var(--rw-border))] transition group-hover:bg-ui-hover"
                :class="editingDriverId === driver.id ? '!bg-ui-selected' : ''"
              >
                <div class="inline-flex items-center justify-end gap-1">
                  <template v-if="editingDriverId === driver.id">
                    <button
                      type="button"
                      class="ui-icon-button !h-8 !w-8 text-success-600 dark:text-success-400"
                      :disabled="driverStore.isMutating"
                      aria-label="Zatwierdź zmiany"
                      title="Zatwierdź"
                      @click="saveDriver(driver)"
                    >
                      <Check class="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      class="ui-icon-button !h-8 !w-8"
                      :disabled="driverStore.isMutating"
                      aria-label="Anuluj edycję"
                      title="Anuluj"
                      @click="cancelEditing"
                    >
                      <X class="h-4 w-4" />
                    </button>
                  </template>
                  <template v-else>
                    <button
                      v-if="canUpdateDrivers"
                      type="button"
                      class="ui-icon-button !h-8 !w-8"
                      :disabled="editingDriverId !== null || driverStore.isMutating"
                      aria-label="Edytuj kierowcę"
                      title="Edytuj"
                      @click="startEditing(driver)"
                    >
                      <SquarePen class="h-4 w-4" />
                    </button>
                    <button
                      v-if="canDeleteDrivers"
                      type="button"
                      class="ui-icon-button !h-8 !w-8 text-danger-600 dark:text-danger-400"
                      :disabled="editingDriverId !== null || driverStore.isMutating"
                      aria-label="Usuń kierowcę"
                      title="Usuń"
                      @click="driverToDelete = driver"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                    <span v-if="!canUpdateDrivers && !canDeleteDrivers" class="text-ui-mutedText">-</span>
                  </template>
                </div>
              </td>
            </tr>

            <tr v-if="!filteredDrivers.length">
              <td colspan="7" class="py-10 text-center ui-body-sm text-ui-mutedText">
                Brak kierowców pasujących do filtrów.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <AppPagination
        v-model:page="currentPage"
        v-model:page-size="pageSize"
        :total="filteredDrivers.length"
      />
    </AppCard>

    <AppConfirmModal
      :open="Boolean(driverToDelete)"
      title="Usunąć kierowcę?"
      :description="driverToDelete ? `Czy na pewno chcesz usunąć kierowcę ${driverDisplayName(driverToDelete)}? Synchronizacja może dodać go ponownie.` : undefined"
      confirm-label="Usuń"
      confirm-variant="danger"
      :busy="driverStore.isMutating"
      @close="driverToDelete = null"
      @confirm="confirmDeleteDriver"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, type Component } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown, Check, SquarePen, Trash2, X } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppConfirmModal from '@/components/ui/AppConfirmModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppMultiSelect from '@/components/ui/AppMultiSelect.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppSelect, { type AppSelectOption } from '@/components/ui/AppSelect.vue'
import { useAuthStore } from '@/stores/authStore'
import { useDriverStore } from '@/stores/driverStore'
import { useUiStore } from '@/stores/uiStore'
import type { DriverListItem, DriverPatchPayload, DriverStatus } from '@/types/driver'
import { persistStringArray, readPersistedStringArray } from '@/utils/persistedFilters'

type DriverSortKey = 'fullName' | 'firstName' | 'lastName' | 'tachoid' | 'status'
type SortDirection = 'asc' | 'desc'

const DRIVER_STATUS_FILTER_KEY = 'routewise.drivers.statusFilters'
const DRIVER_STATUS_VALUES: DriverStatus[] = ['ACTIVE', 'INACTIVE']
const driverStore = useDriverStore()
const authStore = useAuthStore()
const uiStore = useUiStore()
const searchQuery = ref('')
const statusFilters = ref(readPersistedStringArray(DRIVER_STATUS_FILTER_KEY, DRIVER_STATUS_VALUES, DRIVER_STATUS_VALUES))
const sortKey = ref<DriverSortKey>('fullName')
const sortDirection = ref<SortDirection>('asc')
const currentPage = ref(1)
const pageSize = ref(10)
const editingDriverId = ref<number | null>(null)
const driverToDelete = ref<DriverListItem | null>(null)
const editForm = reactive({ firstName: '', lastName: '', tachoid: '', status: 'ACTIVE' as DriverStatus })

const canUpdateDrivers = computed(() => hasPermission('drivers.update'))
const canDeleteDrivers = computed(() => hasPermission('drivers.delete'))

const statusOptions: AppSelectOption[] = [
  { label: 'Aktywny', value: 'ACTIVE' },
  { label: 'Nieaktywny', value: 'INACTIVE' },
]

const statusFilterOptions: AppSelectOption[] = statusOptions.map((option) => ({ ...option }))

const sortableColumns: Array<{ key: DriverSortKey; label: string }> = [
  { key: 'fullName', label: 'Kierowca' },
  { key: 'firstName', label: 'Imię' },
  { key: 'lastName', label: 'Nazwisko' },
  { key: 'tachoid', label: 'Tachoid' },
  { key: 'status', label: 'Status' },
]

const filteredDrivers = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('pl-PL')

  return driverStore.drivers.filter((driver) => {
    if (!statusFilters.value.includes(driver.status)) return false
    if (!query) return true

    return [driver.id, driver.tachoid, driver.firstName, driver.lastName, driver.fullName]
      .filter((value) => value !== null && value !== undefined)
      .some((value) => String(value).toLocaleLowerCase('pl-PL').includes(query))
  })
})

const sortedDrivers = computed(() => {
  const direction = sortDirection.value === 'asc' ? 1 : -1
  return [...filteredDrivers.value].sort((first, second) => compareDrivers(first, second, sortKey.value) * direction)
})

const paginatedDrivers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedDrivers.value.slice(start, start + pageSize.value)
})

watch([searchQuery, statusFilters], () => {
  currentPage.value = 1
})

watch(statusFilters, (value) => persistStringArray(DRIVER_STATUS_FILTER_KEY, value))

function hasPermission(permission: string) {
  return authStore.canManageCompany || authStore.hasActiveCompanyPermission(permission)
}

function driverDisplayName(driver: DriverListItem) {
  const name = driver.fullName?.trim() || [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim()
  return name || `Kierowca #${driver.id}`
}

function statusLabel(status: DriverStatus) {
  return status === 'ACTIVE' ? 'Aktywny' : 'Nieaktywny'
}

function sortIcon(column: DriverSortKey): Component {
  if (sortKey.value !== column) return ArrowUpDown
  return sortDirection.value === 'asc' ? ArrowUp : ArrowDown
}

function setSort(column: DriverSortKey) {
  if (sortKey.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }

  sortKey.value = column
  sortDirection.value = 'asc'
}

function sortableValue(driver: DriverListItem, key: DriverSortKey) {
  if (key === 'fullName') return driverDisplayName(driver)
  return driver[key] ?? ''
}

function compareDrivers(first: DriverListItem, second: DriverListItem, key: DriverSortKey) {
  const firstValue = sortableValue(first, key)
  const secondValue = sortableValue(second, key)
  if (typeof firstValue === 'number' && typeof secondValue === 'number') return firstValue - secondValue
  return String(firstValue).localeCompare(String(secondValue), 'pl', { numeric: true, sensitivity: 'base' })
}

function startEditing(driver: DriverListItem) {
  if (!canUpdateDrivers.value || editingDriverId.value !== null) return
  editingDriverId.value = driver.id
  editForm.firstName = driver.firstName || ''
  editForm.lastName = driver.lastName || ''
  editForm.tachoid = String(driver.tachoid)
  editForm.status = driver.status
}

function cancelEditing() {
  if (driverStore.isMutating) return
  editingDriverId.value = null
}

async function saveDriver(driver: DriverListItem) {
  if (editingDriverId.value !== driver.id || driverStore.isMutating) return

  const firstName = editForm.firstName.trim()
  const lastName = editForm.lastName.trim()
  const tachoid = Number(editForm.tachoid)

  if (firstName.length > 100 || lastName.length > 100) {
    uiStore.addToast({ type: 'warning', title: 'Nieprawidłowe dane', message: 'Imię i nazwisko mogą mieć maksymalnie 100 znaków.' })
    return
  }

  if (!editForm.tachoid.trim() || !Number.isSafeInteger(tachoid) || tachoid <= 0) {
    uiStore.addToast({ type: 'warning', title: 'Nieprawidłowy tachoid', message: 'Podaj poprawny dodatni numer tachoid.' })
    return
  }

  const payload: DriverPatchPayload = {}
  if (firstName !== (driver.firstName || '')) payload.firstName = firstName
  if (lastName !== (driver.lastName || '')) payload.lastName = lastName
  if (tachoid !== driver.tachoid) payload.tachoid = tachoid
  if (editForm.status !== driver.status) payload.status = editForm.status

  if (!Object.keys(payload).length) {
    cancelEditing()
    return
  }

  try {
    await driverStore.updateDriver(driver.id, payload)
    editingDriverId.value = null
    uiStore.addToast({ type: 'success', title: 'Kierowca zaktualizowany', message: 'Zapisano zmiany kierowcy.' })
  } catch {
    // Globalny interceptor pokazuje komunikat API.
  }
}

async function confirmDeleteDriver() {
  if (!driverToDelete.value || !canDeleteDrivers.value) return
  const driver = driverToDelete.value

  try {
    await driverStore.deleteDriver(driver.id)
    driverToDelete.value = null
    uiStore.addToast({ type: 'success', title: 'Kierowca usunięty', message: `Usunięto ${driverDisplayName(driver)}.` })
  } catch {
    // Globalny interceptor pokazuje komunikat API.
  }
}

onMounted(() => {
  void Promise.all([
    driverStore.loadDrivers(),
    driverStore.loadSelectDrivers({ silent: true }),
  ])
})
</script>
