<template>
  <div class="space-y-5 xl:flex xl:h-[calc(100dvh-3rem)] xl:min-h-0 xl:flex-col xl:space-y-0 xl:gap-4 xl:overflow-hidden">
    <header class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-slate-950 dark:text-slate-50">Pojazdy</h1>
      </div>

      <div class="flex flex-col gap-2 lg:flex-row lg:items-end">
        <AppSelect
          v-model="typeFilter"
          class="min-w-40"
          label="Typ pojazdu"
          :options="typeOptions"
          size="sm"
        />
        <AppSelect
          v-model="statusFilter"
          class="min-w-40"
          label="Status"
          :options="statusOptions"
          size="sm"
        />
        <AppSelect
          v-model="ownershipFilter"
          class="min-w-40"
          label="Własność"
          :options="ownershipOptions"
          size="sm"
        />
        <AppInput
          v-model="searchQuery"
          class="lg:w-72"
          label="Wyszukaj"
          placeholder="Szukaj po rejestracji, marce, VIN, roku"
          size="sm"
        />
        <AppButton size="sm" @click="openCreateModal">
          <Plus class="h-4 w-4" />
          Dodaj pojazd
        </AppButton>
      </div>
    </header>

    <AppCard compact class="xl:min-h-0 xl:flex-1 xl:overflow-hidden" content-class="xl:flex xl:h-full xl:min-h-0 xl:flex-col">
      <div class="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>{{ filteredVehicles.length }} z {{ fleetStore.apiVehicles.length }} pojazdów</span>
        <span v-if="fleetStore.isVehiclesLoading">Pobieranie danych...</span>
      </div>

      <div class="overflow-x-auto xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
        <table class="w-full min-w-[980px] text-left text-sm">
          <thead class="border-b border-slate-100 text-xs uppercase text-slate-500 dark:border-app-border dark:text-slate-400">
            <tr>
              <th class="w-12 py-2 pr-3 font-medium">#</th>
              <th class="py-2 pr-3 font-medium">
                <SortButton label="Numer rejestracyjny" column="licensePlate" :sort-key="sortKey" :direction="sortDirection" @sort="setSort" />
              </th>
              <th class="py-2 pr-3 font-medium">
                <SortButton label="Typ pojazdu" column="type" :sort-key="sortKey" :direction="sortDirection" @sort="setSort" />
              </th>
              <th class="py-2 pr-3 font-medium">
                <SortButton label="Marka" column="make" :sort-key="sortKey" :direction="sortDirection" @sort="setSort" />
              </th>
              <th class="py-2 pr-3 font-medium">
                <SortButton label="Rok produkcji" column="productionYear" :sort-key="sortKey" :direction="sortDirection" @sort="setSort" />
              </th>
              <th class="py-2 pr-3 font-medium">
                <SortButton label="Przegląd techniczny" column="technicalInspection" :sort-key="sortKey" :direction="sortDirection" @sort="setSort" />
              </th>
              <th class="py-2 pr-3 font-medium">
                <SortButton label="Legalizacja tachografu" column="tachographInspection" :sort-key="sortKey" :direction="sortDirection" @sort="setSort" />
              </th>
              <th class="py-2 pr-3 font-medium">
                <SortButton label="Winieta UK" column="vignetteUk" :sort-key="sortKey" :direction="sortDirection" @sort="setSort" />
              </th>
              <th class="sticky right-0 z-10 w-16 bg-white py-2 pr-1 text-right font-medium shadow-[-1px_0_0_0_rgb(var(--rw-app-border))] dark:bg-app-panel">Akcje</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(vehicle, index) in paginatedVehicles"
              :key="vehicle.id"
              class="group border-b border-slate-100 transition last:border-0 hover:bg-slate-50 dark:border-app-border dark:hover:bg-app-elevated"
            >
              <td class="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{{ (currentPage - 1) * pageSize + index + 1 }}.</td>
              <td class="py-1.5 pr-3">
                <RouterLink
                  class="font-semibold text-slate-950 transition hover:text-slate-600 dark:text-slate-50 dark:hover:text-slate-300"
                  :to="{ name: 'vehicle-detail', params: { id: vehicle.id } }"
                >
                  {{ vehicle.licensePlate }}
                </RouterLink>
                <span class="ml-2 text-xs font-medium text-slate-400 dark:text-app-muted">#{{ vehicle.id }}</span>
              </td>
              <td class="py-1.5 pr-3">
                <AppBadge :variant="vehicleTypeVariant(vehicle.type)">{{ vehicleTypeLabel(vehicle.type) }}</AppBadge>
              </td>
              <td class="py-1.5 pr-3 text-slate-700 dark:text-slate-200">{{ vehicle.make || '-' }}</td>
              <td class="py-1.5 pr-3 text-slate-700 dark:text-slate-200">{{ vehicle.productionYear || '-' }}</td>
              <td class="py-1.5 pr-3"><DateCell :date="vehicle.technicalInspection" /></td>
              <td class="py-1.5 pr-3"><DateCell :date="vehicle.tachographInspection" /></td>
              <td class="py-1.5 pr-3"><DateCell :date="vehicle.vignetteUk" /></td>
              <td class="sticky right-0 z-10 bg-white py-1.5 pr-1 text-right shadow-[-1px_0_0_0_rgb(var(--rw-app-border))] transition group-hover:bg-slate-50 dark:bg-app-panel dark:group-hover:bg-app-elevated">
                <RouterLink
                  class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:bg-app-panel dark:text-slate-200 dark:hover:bg-app-elevated"
                  :to="{ name: 'vehicle-detail', params: { id: vehicle.id } }"
                  aria-label="Szczegóły pojazdu"
                >
                  <SquarePen class="h-4 w-4" />
                </RouterLink>
              </td>
            </tr>

            <tr v-if="!filteredVehicles.length">
              <td colspan="9" class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                Brak pojazdów pasujących do filtrów.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppPagination
        v-model:page="currentPage"
        v-model:page-size="pageSize"
        :total="filteredVehicles.length"
      />
    </AppCard>

    <Teleport to="body">
      <div
        v-if="isCreateModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        @click.self="closeCreateModal"
      >
        <form
          class="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel"
          @submit.prevent="submitCreateVehicle"
        >
          <header class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <div>
              <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Dodaj pojazd</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Dane zostaną zapisane przez POST /api/vehicles.</p>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:text-slate-300 dark:hover:bg-app-elevated"
              aria-label="Zamknij modal"
              @click="closeCreateModal"
            >
              <X class="h-4 w-4" />
            </button>
          </header>

          <div class="grid max-h-[70vh] gap-3 overflow-y-auto p-5 md:grid-cols-2">
            <AppInput v-model="createForm.licensePlate" label="Numer rejestracyjny" required />
            <AppSelect v-model="createForm.type" label="Typ pojazdu" :options="vehicleTypeFormOptions" />
            <AppInput v-model="createForm.make" label="Marka" />
            <AppInput v-model="createForm.vin" label="VIN" />
            <AppInput v-model="createForm.productionYear" label="Rok produkcji" type="number" />
            <AppDatePicker v-model="createForm.firstRegistration" label="Pierwsza rejestracja" />
            <AppInput v-model="createForm.euroClass" label="Klasa Euro" />
            <AppSelect v-model="createForm.ownership" label="Własność" :options="vehicleOwnershipFormOptions" />
            <AppDatePicker v-model="createForm.ownershipUntil" label="Własność do" />
            <AppDatePicker v-model="createForm.technicalInspection" label="Przegląd techniczny" />
            <AppDatePicker v-model="createForm.tachographInspection" label="Legalizacja tachografu" />
            <AppDatePicker v-model="createForm.vignetteUk" label="Winieta UK" />
            <AppDatePicker v-model="createForm.vignetteLuxembourg" label="Winieta Luksemburg" />
            <AppDatePicker v-model="createForm.vignetteDenmark" label="Winieta Dania" />
            <AppInput v-model="createForm.fuelTank" label="Zbiornik paliwa" type="number" />
            <AppSelect v-model="createForm.status" label="Status" :options="vehicleStatusFormOptions" />
          </div>

          <footer class="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-app-border">
            <AppButton type="button" variant="secondary" @click="closeCreateModal">Anuluj</AppButton>
            <AppButton type="submit" :loading="isCreatingVehicle">Zapisz pojazd</AppButton>
          </footer>
        </form>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref, watch, type PropType } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowDown, ArrowUp, ArrowUpDown, Plus, SquarePen, X } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppSelect, { type AppSelectOption } from '@/components/ui/AppSelect.vue'
import { vehicleService, type VehiclePayload } from '@/services/vehicleService'
import { useFleetStore } from '@/stores/fleetStore'
import { useUiStore } from '@/stores/uiStore'
import type { ApiVehicle } from '@/types/fleet'

type VehicleSortKey =
  | 'licensePlate'
  | 'type'
  | 'make'
  | 'productionYear'
  | 'technicalInspection'
  | 'tachographInspection'
  | 'vignetteUk'

type SortDirection = 'asc' | 'desc'

const fleetStore = useFleetStore()
const uiStore = useUiStore()
const searchQuery = ref('')
const typeFilter = ref('all')
const statusFilter = ref('all')
const ownershipFilter = ref('all')
const sortKey = ref<VehicleSortKey>('licensePlate')
const sortDirection = ref<SortDirection>('asc')
const currentPage = ref(1)
const pageSize = ref(10)
const isCreateModalOpen = ref(false)
const isCreatingVehicle = ref(false)

const createForm = reactive(createEmptyVehicleForm())

const typeOptions: AppSelectOption[] = [
  { label: 'Wszystkie typy', value: 'all' },
  { label: 'Ciągniki', value: 'TRUCK' },
  { label: 'Naczepy', value: 'TRAILER' },
]

const vehicleTypeFormOptions: AppSelectOption[] = [
  { label: 'Ciągnik', value: 'TRUCK' },
  { label: 'Naczepa', value: 'TRAILER' },
]

const vehicleOwnershipFormOptions: AppSelectOption[] = [
  { label: 'Własny', value: 'OWN' },
  { label: 'Leasing', value: 'LEASE' },
  { label: 'Wynajem', value: 'RENT' },
  { label: 'Brak', value: 'NONE' },
]

const vehicleStatusFormOptions: AppSelectOption[] = [
  { label: 'Aktywny', value: 'ACTIVE' },
  { label: 'Nieaktywny', value: 'INACTIVE' },
]

const statusOptions = computed<AppSelectOption[]>(() => [
  { label: 'Wszystkie statusy', value: 'all' },
  ...uniqueOptions(fleetStore.apiVehicles.map((vehicle) => vehicle.status).filter(Boolean) as string[]),
])

const ownershipOptions = computed<AppSelectOption[]>(() => [
  { label: 'Wszystkie własności', value: 'all' },
  ...uniqueOptions(fleetStore.apiVehicles.map((vehicle) => vehicle.ownership).filter(Boolean) as string[]),
])

const filteredVehicles = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return fleetStore.apiVehicles.filter((vehicle) => {
    const matchesType = typeFilter.value === 'all' || vehicle.type === typeFilter.value
    const matchesStatus = statusFilter.value === 'all' || vehicle.status === statusFilter.value
    const matchesOwnership = ownershipFilter.value === 'all' || vehicle.ownership === ownershipFilter.value

    if (!matchesType || !matchesStatus || !matchesOwnership) {
      return false
    }

    if (!query) {
      return true
    }

    return [
      vehicle.licensePlate,
      vehicle.make,
      vehicle.vin,
      vehicle.productionYear ? String(vehicle.productionYear) : null,
      vehicle.type,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  })
})

const sortedVehicles = computed(() => {
  const direction = sortDirection.value === 'asc' ? 1 : -1

  return [...filteredVehicles.value].sort((first, second) => (
    compareVehicleValues(first, second, sortKey.value) * direction
  ))
})

const paginatedVehicles = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedVehicles.value.slice(start, start + pageSize.value)
})

watch([searchQuery, typeFilter, statusFilter, ownershipFilter], () => {
  currentPage.value = 1
})

const SortButton = defineComponent({
  props: {
    label: {
      type: String,
      required: true,
    },
    column: {
      type: String as PropType<VehicleSortKey>,
      required: true,
    },
    sortKey: {
      type: String as PropType<VehicleSortKey>,
      required: true,
    },
    direction: {
      type: String as PropType<SortDirection>,
      required: true,
    },
  },
  emits: ['sort'],
  setup(props, { emit }) {
    return () => {
      const isActive = props.sortKey === props.column
      const Icon = isActive ? (props.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown

      return h(
        'button',
        {
          type: 'button',
          class: [
            'inline-flex items-center gap-1.5 transition hover:text-slate-950 dark:hover:text-slate-50',
            isActive ? 'text-slate-950 dark:text-slate-50' : '',
          ],
          onClick: () => emit('sort', props.column),
        },
        [
          h('span', props.label),
          h(Icon, { class: 'h-3.5 w-3.5' }),
        ],
      )
    }
  },
})

const DateCell = defineComponent({
  props: {
    date: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  setup(props) {
    return () => {
      if (!props.date) {
        return h('span', { class: 'text-slate-400 dark:text-app-muted' }, '-')
      }

      const days = daysUntil(props.date)

      return h('span', { class: 'group relative inline-flex items-center' }, [
        h('span', { class: ['font-medium', deadlineDateClasses(days)] }, formatDate(props.date)),
        h(
          'span',
          {
            class: 'pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm group-hover:block dark:border-app-border dark:bg-app-panel dark:text-slate-100',
          },
          deadlineTooltipText(days),
        ),
      ])
    }
  },
})

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values))
    .sort((first, second) => first.localeCompare(second, 'pl'))
    .map((value) => ({
      label: statusOrOwnershipLabel(value),
      value,
    }))
}

function statusOrOwnershipLabel(value: string) {
  const labels: Record<string, string> = {
    ACTIVE: 'Aktywne',
    INACTIVE: 'Nieaktywne',
    OWN: 'Własne',
    LEASE: 'Leasing',
    RENT: 'Wynajem',
    NONE: 'Brak',
  }

  return labels[value] || value
}

function vehicleTypeLabel(type: string | null) {
  if (type === 'TRAILER') {
    return 'Naczepa'
  }

  if (type === 'TRUCK') {
    return 'Ciągnik'
  }

  return type || '-'
}

function vehicleTypeVariant(type: string | null) {
  return type === 'TRAILER' ? 'info' : 'neutral'
}

function formatDate(value: string | null) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('pl-PL')
}

function daysUntil(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const dueDate = new Date(value)

  if (Number.isNaN(dueDate.getTime())) {
    return null
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)

  return Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

function deadlineDateClasses(days: number | null) {
  if (days === null) {
    return 'text-slate-700 dark:text-slate-200'
  }

  if (days < 15) {
    return 'text-danger-600 dark:text-danger-400'
  }

  if (days < 30) {
    return 'text-amber-500 dark:text-amber-300'
  }

  return 'text-slate-700 dark:text-slate-200'
}

function deadlineTooltipText(days: number | null) {
  if (days === null) {
    return 'Nie można odczytać terminu'
  }

  if (days < 0) {
    const overdueDays = Math.abs(days)
    return `${overdueDays} ${overdueDays === 1 ? 'dzień' : 'dni'} po terminie`
  }

  if (days === 0) {
    return 'Termin dzisiaj'
  }

  return days === 1 ? 'Pozostał 1 dzień' : `Pozostało ${days} dni`
}

function sortableValue(vehicle: ApiVehicle, key: VehicleSortKey) {
  if (key === 'technicalInspection' || key === 'tachographInspection' || key === 'vignetteUk') {
    const value = vehicle[key]
    const time = value ? new Date(value).getTime() : Number.POSITIVE_INFINITY
    return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time
  }

  if (key === 'productionYear') {
    return vehicle.productionYear ?? Number.POSITIVE_INFINITY
  }

  return vehicle[key] || ''
}

function compareVehicleValues(first: ApiVehicle, second: ApiVehicle, key: VehicleSortKey) {
  const firstValue = sortableValue(first, key)
  const secondValue = sortableValue(second, key)

  if (typeof firstValue === 'number' && typeof secondValue === 'number') {
    return firstValue - secondValue
  }

  return String(firstValue).localeCompare(String(secondValue), 'pl', {
    numeric: true,
    sensitivity: 'base',
  })
}

function setSort(column: VehicleSortKey) {
  if (sortKey.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
    return
  }

  sortKey.value = column
  sortDirection.value = 'asc'
}

function createEmptyVehicleForm() {
  return {
    licensePlate: '',
    type: 'TRUCK',
    make: '',
    vin: '',
    firstRegistration: '',
    productionYear: '',
    euroClass: '',
    ownership: 'OWN',
    ownershipUntil: '',
    technicalInspection: '',
    tachographInspection: '',
    vignetteUk: '',
    vignetteLuxembourg: '',
    vignetteDenmark: '',
    fuelTank: '',
    status: 'ACTIVE',
  }
}

function resetCreateForm() {
  Object.assign(createForm, createEmptyVehicleForm())
}

function nullableText(value: string) {
  const normalized = value.trim()
  return normalized || null
}

function nullableNumber(value: string) {
  const normalized = value.trim()

  if (!normalized) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function createPayloadFromForm(): VehiclePayload {
  return {
    licensePlate: createForm.licensePlate.trim(),
    type: createForm.type || null,
    make: nullableText(createForm.make),
    vin: nullableText(createForm.vin),
    firstRegistration: nullableText(createForm.firstRegistration),
    productionYear: nullableNumber(createForm.productionYear),
    euroClass: nullableText(createForm.euroClass),
    ownership: createForm.ownership || null,
    ownershipUntil: nullableText(createForm.ownershipUntil),
    technicalInspection: nullableText(createForm.technicalInspection),
    tachographInspection: nullableText(createForm.tachographInspection),
    vignetteUk: nullableText(createForm.vignetteUk),
    vignetteLuxembourg: nullableText(createForm.vignetteLuxembourg),
    vignetteDenmark: nullableText(createForm.vignetteDenmark),
    fuelTank: nullableNumber(createForm.fuelTank),
    status: createForm.status || null,
  }
}

function openCreateModal() {
  resetCreateForm()
  isCreateModalOpen.value = true
}

function closeCreateModal() {
  if (!isCreatingVehicle.value) {
    isCreateModalOpen.value = false
  }
}

async function submitCreateVehicle() {
  if (!createForm.licensePlate.trim()) {
    return
  }

  isCreatingVehicle.value = true

  try {
    await vehicleService.createVehicle(createPayloadFromForm())
    await fleetStore.fetchVehicles({ silent: true })
    uiStore.addToast({
      type: 'success',
      title: 'Pojazd dodany',
      message: `Dodano pojazd ${createForm.licensePlate.trim()}.`,
    })
    isCreateModalOpen.value = false
  } catch {
    // API interceptor pokazuje szczegóły błędu.
  } finally {
    isCreatingVehicle.value = false
  }
}

onMounted(() => {
  if (!fleetStore.apiVehicles.length) {
    void fleetStore.fetchVehicles()
  }
})
</script>
