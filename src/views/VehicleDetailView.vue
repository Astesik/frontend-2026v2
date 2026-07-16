<template>
  <div class="space-y-5">
    <header class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex items-center gap-3">
        <RouterLink
          class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:bg-app-panel dark:text-slate-200 dark:hover:bg-app-elevated"
          :to="{ name: 'vehicles' }"
          aria-label="Wróć do listy pojazdów"
        >
          <ArrowLeft class="h-4 w-4" />
        </RouterLink>
        <div>
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Pojazd</p>
          <h1 class="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">
            {{ vehicle?.licensePlate || 'Szczegóły pojazdu' }}
          </h1>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <AppButton size="sm" variant="secondary" :disabled="!vehicle" @click="openEditModal">
          <SquarePen class="h-4 w-4" />
          Edytuj
        </AppButton>
        <AppButton disabled size="sm" variant="danger">
          <Trash2 class="h-4 w-4" />
          Usuń
        </AppButton>
      </div>
    </header>

    <div v-if="!vehicle && fleetStore.isVehiclesLoading" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-400">
      Pobieranie pojazdu...
    </div>

    <div v-else-if="!vehicle" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-400">
      Nie znaleziono pojazdu.
    </div>

    <div v-else class="space-y-5">
      <div class="grid gap-5 xl:grid-cols-[1.1fr_0.9fr] xl:items-stretch">
        <AppCard class="h-full" title="Dane podstawowe" compact>
          <div class="grid gap-3 md:grid-cols-2">
            <InfoRow label="Numer rejestracyjny" :value="vehicle.licensePlate" />
            <InfoRow label="Typ pojazdu" :value="vehicleTypeLabel(vehicle.type)" />
            <InfoRow label="Marka" :value="vehicle.make" />
            <InfoRow label="VIN" :value="vehicle.vin" />
            <InfoRow label="Pierwsza rejestracja" :value="formatDate(vehicle.firstRegistration)" />
            <InfoRow label="Rok produkcji" :value="formatValue(vehicle.productionYear)" />
            <InfoRow label="Klasa Euro" :value="vehicle.euroClass" />
            <InfoRow label="Własność" :value="ownershipLabel(vehicle.ownership)" />
            <InfoRow label="Własność do" :value="formatDate(vehicle.ownershipUntil)" />
            <InfoRow label="Status" :value="statusLabel(vehicle.status)" />
            <InfoRow label="Zbiornik paliwa" :value="fuelTankLabel(vehicle.fuelTank)" />
            <InfoRow label="Ostatnia pozycja" :value="formatDateTime(vehicle.lastPositionAt)" />
          </div>
        </AppCard>

        <div class="grid gap-5 xl:grid-rows-2">
          <AppCard class="h-full" title="Przeglądy i winiety" compact>
            <div class="space-y-2">
              <InspectionRow label="Przegląd techniczny" :date="vehicle.technicalInspection" />
              <InspectionRow label="Legalizacja tachografu" :date="vehicle.tachographInspection" />
              <InspectionRow label="Winieta UK" :date="vehicle.vignetteUk" />
            </div>
          </AppCard>

          <AppCard class="h-full" title="Urządzenia" compact>
            <div class="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 p-3 dark:border-app-border">
              <div>
                <p class="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Przypisane urządzenie</p>
                <p class="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-50">
                  {{ vehicle.assignedDeviceId ? `#${vehicle.assignedDeviceId}` : 'Brak' }}
                </p>
              </div>
              <Cpu class="h-5 w-5 text-slate-400" />
            </div>

            <div class="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <DeviceSelect
                v-model="deviceIdInput"
                placeholder="Wybierz urządzenie"
                size="sm"
                :reload-key="devicesReloadKey"
              />
              <AppButton size="sm" variant="secondary" :loading="isAssigningDevice" :disabled="!deviceIdInput.trim()" @click="assignDevice">
                Przypisz
              </AppButton>
              <AppButton size="sm" variant="secondary" :disabled="!vehicle.assignedDeviceId" @click="openUnassignDeviceModal">
                Odepnij
              </AppButton>
            </div>
          </AppCard>
        </div>
      </div>

      <div class="grid gap-5 xl:grid-cols-2">
        <AppCard title="Historia serwisowa" compact>
          <div v-if="isRepairsLoading" class="py-6 text-sm text-slate-500 dark:text-slate-400">
            Pobieranie historii...
          </div>

          <div v-else-if="!repairHistory.length" class="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-app-border dark:text-slate-400">
            Brak wpisów w książce serwisowej.
          </div>

          <div v-else class="space-y-2">
            <article
              v-for="repair in repairHistory"
              :key="repairKey(repair)"
              class="overflow-hidden rounded-2xl border border-slate-100 transition dark:border-app-border"
            >
              <button
                type="button"
                class="flex w-full items-start justify-between gap-3 p-3 text-left transition hover:bg-slate-50 dark:hover:bg-app-elevated"
                @click="toggleRepairHistory(repair)"
              >
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="font-semibold text-slate-950 dark:text-slate-50">{{ repairTitle(repair) }}</p>
                    <AppBadge :variant="repairStatusVariant(repair)">{{ repairStatus(repair) }}</AppBadge>
                  </div>
                  <div class="mt-2 grid gap-1 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-3">
                    <span>Data: {{ repairDate(repair) }}</span>
                    <span>Miejsce: {{ repairPlace(repair) }}</span>
                    <span>Usterki: {{ repairFaultsSummary(repair) }}</span>
                  </div>
                </div>
                <ChevronDown
                  class="mt-1 h-4 w-4 shrink-0 text-slate-400 transition"
                  :class="{ 'rotate-180': isRepairExpanded(repair) }"
                />
              </button>

              <div v-if="isRepairExpanded(repair)" class="border-t border-slate-100 p-3 dark:border-app-border">
                <p v-if="repairDescription(repairDetail(repair))" class="mb-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-app-elevated dark:text-slate-200">
                  {{ repairDescription(repairDetail(repair)) }}
                </p>

                <div class="grid gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                  <span>Przyjazd: {{ repairDate(repairDetail(repair)) }}</span>
                  <span>Wyjazd: {{ repairDepartureDate(repairDetail(repair)) }}</span>
                  <span>Miejsce: {{ repairPlace(repairDetail(repair)) }}</span>
                  <span>Utworzył: {{ repairCreatedBy(repairDetail(repair)) }}</span>
                </div>

                <section class="mt-4">
                  <div class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                    <Wrench class="h-3.5 w-3.5" />
                    Usterki
                  </div>

                  <div v-if="!repairFaults(repairDetail(repair)).length" class="rounded-2xl border border-dashed border-slate-200 p-3 text-sm text-slate-500 dark:border-app-border dark:text-slate-400">
                    Brak usterek w tej naprawie.
                  </div>

                  <ul v-else class="space-y-2">
                    <li
                      v-for="fault in repairFaults(repairDetail(repair))"
                      :key="repairFaultKey(fault)"
                      class="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 p-3 dark:border-app-border"
                    >
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-slate-950 dark:text-slate-50">{{ repairFaultDescription(fault) }}</p>
                        <p v-if="repairFaultMechanic(fault)" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Mechanik: {{ repairFaultMechanic(fault) }}
                        </p>
                        <p v-if="repairFaultNote(fault)" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Notatka: {{ repairFaultNote(fault) }}
                        </p>
                      </div>
                      <AppBadge :variant="repairFaultStatusVariant(fault)">{{ repairFaultStatusLabel(fault) }}</AppBadge>
                    </li>
                  </ul>
                </section>

                <section class="mt-4">
                  <div class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                    <MessageSquare class="h-3.5 w-3.5" />
                    Komentarze
                  </div>

                  <div v-if="!repairComments(repairDetail(repair)).length" class="rounded-2xl border border-dashed border-slate-200 p-3 text-sm text-slate-500 dark:border-app-border dark:text-slate-400">
                    Brak komentarzy.
                  </div>

                  <div v-else class="space-y-2">
                    <div
                      v-for="comment in repairComments(repairDetail(repair))"
                      :key="comment.id"
                      class="rounded-2xl bg-slate-50 p-3 dark:bg-app-elevated"
                    >
                      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span class="font-semibold text-slate-700 dark:text-slate-200">{{ repairCommentAuthor(comment) }}</span>
                        <span>{{ formatDateTime(comment.createdAt) }}</span>
                      </div>
                      <p class="mt-1 text-sm text-slate-700 dark:text-slate-200">{{ comment.content }}</p>
                    </div>
                  </div>
                </section>

                <RouterLink
                  v-if="repair.id"
                  class="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-app-border dark:text-slate-200 dark:hover:bg-app-elevated"
                  :to="{ name: 'repair-detail', params: { id: repair.id } }"
                >
                  <ExternalLink class="h-3.5 w-3.5" />
                  Pełne szczegóły
                </RouterLink>
              </div>
            </article>
          </div>
        </AppCard>

        <AppCard title="Dokumenty pojazdu" compact>
          <div class="grid gap-2 sm:grid-cols-2">
            <div
              v-for="document in mockedDocuments"
              :key="document"
              class="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3 dark:border-app-border"
            >
              <div class="flex min-w-0 items-center gap-2">
                <FileText class="h-4 w-4 shrink-0 text-slate-400" />
                <span class="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{{ document }}</span>
              </div>
              <AppBadge variant="neutral">Mock</AppBadge>
            </div>
          </div>
        </AppCard>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="isEditModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        @click.self="closeEditModal"
      >
        <form
          class="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel"
          @submit.prevent="submitVehicleEdit"
        >
          <header class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <div>
              <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Edytuj pojazd</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">Zmiany zostaną zapisane przez PATCH /api/vehicles/{id}.</p>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:text-slate-300 dark:hover:bg-app-elevated"
              aria-label="Zamknij modal"
              @click="closeEditModal"
            >
              <X class="h-4 w-4" />
            </button>
          </header>

          <div class="grid max-h-[70vh] gap-3 overflow-y-auto p-5 md:grid-cols-2">
            <AppInput v-model="editForm.licensePlate" label="Numer rejestracyjny" required />
            <AppSelect v-model="editForm.type" label="Typ pojazdu" :options="vehicleTypeFormOptions" />
            <AppInput v-model="editForm.make" label="Marka" />
            <AppInput v-model="editForm.vin" label="VIN" />
            <AppInput v-model="editForm.productionYear" label="Rok produkcji" type="number" />
            <AppDatePicker v-model="editForm.firstRegistration" label="Pierwsza rejestracja" />
            <AppInput v-model="editForm.euroClass" label="Klasa Euro" />
            <AppSelect v-model="editForm.ownership" label="Własność" :options="vehicleOwnershipFormOptions" />
            <AppDatePicker v-model="editForm.ownershipUntil" label="Własność do" />
            <AppDatePicker v-model="editForm.technicalInspection" label="Przegląd techniczny" />
            <AppDatePicker v-model="editForm.tachographInspection" label="Legalizacja tachografu" />
            <AppDatePicker v-model="editForm.vignetteUk" label="Winieta UK" />
            <AppInput v-model="editForm.fuelTank" label="Zbiornik paliwa" type="number" />
            <AppSelect v-model="editForm.status" label="Status" :options="vehicleStatusFormOptions" />
          </div>

          <footer class="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-app-border">
            <AppButton type="button" variant="secondary" @click="closeEditModal">Anuluj</AppButton>
            <AppButton type="submit" :loading="isUpdatingVehicle">Zapisz zmiany</AppButton>
          </footer>
        </form>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="isUnassignDeviceModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        @click.self="closeUnassignDeviceModal"
      >
        <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <header class="flex items-start gap-3 border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-danger-50 text-danger-600 dark:bg-danger-500/15 dark:text-danger-400">
              <Cpu class="h-5 w-5" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Odpiąć urządzenie?</h2>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Czy na pewno chcesz odpiąć urządzenie {{ vehicle?.assignedDeviceId ? `#${vehicle.assignedDeviceId}` : '' }} od pojazdu {{ vehicle?.licensePlate }}?
              </p>
            </div>
          </header>

          <footer class="flex justify-end gap-2 px-5 py-4">
            <AppButton type="button" variant="secondary" @click="closeUnassignDeviceModal">Anuluj</AppButton>
            <AppButton type="button" variant="danger" :loading="isUnassigningDevice" @click="unassignDevice">
              Odepnij urządzenie
            </AppButton>
          </footer>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref, watch, type PropType } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRoute } from 'vue-router'
import { ArrowLeft, ChevronDown, Cpu, ExternalLink, FileText, MessageSquare, SquarePen, Trash2, Wrench, X } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect, { type AppSelectOption } from '@/components/ui/AppSelect.vue'
import DeviceSelect from '@/components/selects/DeviceSelect.vue'
import { vehicleService, type VehiclePayload } from '@/services/vehicleService'
import { useFleetStore } from '@/stores/fleetStore'
import { useRepairStore, type VehicleRepairHistoryItem } from '@/stores/repairStore'
import { useUiStore } from '@/stores/uiStore'
import type { ApiVehicle } from '@/types/fleet'
import type { RepairComment, RepairFault } from '@/types/repair'

type VehicleForm = ReturnType<typeof createEmptyVehicleForm>
type RepairHistoryLike = VehicleRepairHistoryItem
type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info'
type RepairHistoryFault = RepairFault | string | {
  id?: number | string
  name?: string | null
  description?: string | null
  status?: string | null
  note?: string | null
  assignedMechanicFullName?: string | null
}

const route = useRoute()
const fleetStore = useFleetStore()
const repairStore = useRepairStore()
const uiStore = useUiStore()
const {
  vehicleRepairHistory,
  repairDetailsById,
  repairCommentsById,
  isVehicleRepairHistoryLoading: isRepairsLoading,
} = storeToRefs(repairStore)
const isEditModalOpen = ref(false)
const isUnassignDeviceModalOpen = ref(false)
const isUpdatingVehicle = ref(false)
const isAssigningDevice = ref(false)
const isUnassigningDevice = ref(false)
const deviceIdInput = ref('')
const devicesReloadKey = ref(0)
const editForm = reactive(createEmptyVehicleForm())
const expandedRepairIds = ref<Set<string>>(new Set())

const vehicleId = computed(() => String(route.params.id || ''))
const vehicle = computed(() => fleetStore.apiVehicles.find((item) => String(item.id) === vehicleId.value) || null)
const repairHistory = computed(() => [...(vehicleRepairHistory.value[vehicleId.value] || [])].sort((first, second) => repairTimestamp(second) - repairTimestamp(first)))

const mockedDocuments = [
  'Dowód rejestracyjny',
  'Certyfikat emisji spalin',
  'CIF',
  'COC',
  'Zdjęcia pojazdu',
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

const InfoRow = defineComponent({
  props: {
    label: {
      type: String,
      required: true,
    },
    value: {
      type: [String, Number] as PropType<string | number | null | undefined>,
      default: null,
    },
  },
  setup(props) {
    return () => h('div', { class: 'rounded-2xl border border-slate-100 p-3 dark:border-app-border' }, [
      h('p', { class: 'text-xs font-medium uppercase text-slate-500 dark:text-slate-400' }, props.label),
      h('p', { class: 'mt-1 break-words text-sm font-semibold text-slate-950 dark:text-slate-50' }, formatValue(props.value)),
    ])
  },
})

const InspectionRow = defineComponent({
  props: {
    label: {
      type: String,
      required: true,
    },
    date: {
      type: String as PropType<string | null>,
      default: null,
    },
  },
  setup(props) {
    return () => {
      const days = daysUntil(props.date)
      const variant: 'neutral' | 'success' | 'warning' | 'error' =
        days === null ? 'neutral' : days < 15 ? 'error' : days < 30 ? 'warning' : 'success'

      return h('div', { class: 'flex items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3 dark:border-app-border' }, [
        h('div', [
          h('p', { class: 'text-sm font-semibold text-slate-950 dark:text-slate-50' }, props.label),
          h('p', { class: 'mt-1 text-xs text-slate-500 dark:text-slate-400' }, formatDate(props.date)),
        ]),
        h(AppBadge, { variant }, () => daysLabel(days)),
      ])
    }
  },
})

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

function resetFormFromVehicle(form: VehicleForm, source: ApiVehicle) {
  Object.assign(form, {
    licensePlate: source.licensePlate || '',
    type: source.type || 'TRUCK',
    make: source.make || '',
    vin: source.vin || '',
    firstRegistration: dateInputValue(source.firstRegistration),
    productionYear: source.productionYear ? String(source.productionYear) : '',
    euroClass: source.euroClass || '',
    ownership: source.ownership || 'OWN',
    ownershipUntil: dateInputValue(source.ownershipUntil),
    technicalInspection: dateInputValue(source.technicalInspection),
    tachographInspection: dateInputValue(source.tachographInspection),
    vignetteUk: dateInputValue(source.vignetteUk),
    vignetteLuxembourg: dateInputValue(source.vignetteLuxembourg),
    vignetteDenmark: dateInputValue(source.vignetteDenmark),
    fuelTank: source.fuelTank ? String(source.fuelTank) : '',
    status: source.status || 'ACTIVE',
  })
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

function payloadFromForm(form: VehicleForm): VehiclePayload {
  return {
    licensePlate: form.licensePlate.trim(),
    type: form.type || null,
    make: nullableText(form.make),
    vin: nullableText(form.vin),
    firstRegistration: nullableText(form.firstRegistration),
    productionYear: nullableNumber(form.productionYear),
    euroClass: nullableText(form.euroClass),
    ownership: form.ownership || null,
    ownershipUntil: nullableText(form.ownershipUntil),
    technicalInspection: nullableText(form.technicalInspection),
    tachographInspection: nullableText(form.tachographInspection),
    vignetteUk: nullableText(form.vignetteUk),
    vignetteLuxembourg: nullableText(form.vignetteLuxembourg),
    vignetteDenmark: nullableText(form.vignetteDenmark),
    fuelTank: nullableNumber(form.fuelTank),
    status: form.status || null,
  }
}

function dateInputValue(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  const isoDate = value.match(/^(\d{4}-\d{2}-\d{2})/)
  return isoDate ? isoDate[1] : ''
}

function formatValue(value: string | number | null | undefined) {
  return value === null || value === undefined || value === '' ? '-' : String(value)
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('pl-PL')
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

function daysLabel(days: number | null) {
  if (days === null) {
    return 'Brak'
  }

  if (days < 0) {
    return `${Math.abs(days)}d po terminie`
  }

  return `${days}d`
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

function ownershipLabel(value: string | null) {
  const labels: Record<string, string> = {
    OWN: 'Własny',
    LEASE: 'Leasing',
    RENT: 'Wynajem',
    NONE: 'Brak',
  }

  return value ? labels[value] || value : '-'
}

function statusLabel(value: string | null) {
  const labels: Record<string, string> = {
    ACTIVE: 'Aktywny',
    INACTIVE: 'Nieaktywny',
  }

  return value ? labels[value] || value : '-'
}

function fuelTankLabel(value: number | null) {
  return value ? `${value} l` : '-'
}

function devicePayloadValue(value: string) {
  const normalized = value.trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : normalized
}

function openEditModal() {
  if (!vehicle.value) {
    return
  }

  resetFormFromVehicle(editForm, vehicle.value)
  isEditModalOpen.value = true
}

function closeEditModal() {
  if (!isUpdatingVehicle.value) {
    isEditModalOpen.value = false
  }
}

function openUnassignDeviceModal() {
  if (vehicle.value?.assignedDeviceId) {
    isUnassignDeviceModalOpen.value = true
  }
}

function closeUnassignDeviceModal() {
  if (!isUnassigningDevice.value) {
    isUnassignDeviceModalOpen.value = false
  }
}

async function submitVehicleEdit() {
  if (!vehicle.value || !editForm.licensePlate.trim()) {
    return
  }

  isUpdatingVehicle.value = true

  try {
    await vehicleService.updateVehicle(vehicle.value.id, payloadFromForm(editForm))
    await fleetStore.fetchVehicles({ silent: true })
    uiStore.addToast({
      type: 'success',
      title: 'Pojazd zaktualizowany',
      message: `Zapisano zmiany dla ${editForm.licensePlate.trim()}.`,
    })
    isEditModalOpen.value = false
  } catch {
    // API interceptor pokazuje szczegóły błędu.
  } finally {
    isUpdatingVehicle.value = false
  }
}

async function assignDevice() {
  if (!vehicle.value || !deviceIdInput.value.trim()) {
    return
  }

  isAssigningDevice.value = true
  const plateNumber = vehicle.value.licensePlate

  try {
    await vehicleService.assignDevice(vehicle.value.id, devicePayloadValue(deviceIdInput.value))
    await fleetStore.fetchVehicles({ silent: true })
    devicesReloadKey.value += 1
    uiStore.addToast({
      type: 'success',
      title: 'Urządzenie przypisane',
      message: `Przypisano urządzenie do ${plateNumber}.`,
    })
    deviceIdInput.value = ''
  } catch {
    // API interceptor pokazuje szczegóły błędu.
  } finally {
    isAssigningDevice.value = false
  }
}

async function unassignDevice() {
  if (!vehicle.value?.assignedDeviceId) {
    return
  }

  isUnassigningDevice.value = true
  const plateNumber = vehicle.value.licensePlate

  try {
    await vehicleService.unassignDevice(vehicle.value.id)
    await fleetStore.fetchVehicles({ silent: true })
    devicesReloadKey.value += 1
    isUnassignDeviceModalOpen.value = false
    uiStore.addToast({
      type: 'success',
      title: 'Urządzenie odpięte',
      message: `Odpięto urządzenie od ${plateNumber}.`,
    })
  } catch {
    // API interceptor pokazuje szczegóły błędu.
  } finally {
    isUnassigningDevice.value = false
  }
}

function repairKey(repair: RepairHistoryLike) {
  return String(repair.id || repair.number || repair.createdAt || repair.updatedAt || JSON.stringify(repair))
}

function repairTimestamp(repair: RepairHistoryLike) {
  const value = repair.plannedArrivalAt || repair.startedAt || repair.createdAt || repair.updatedAt || null

  if (!value) {
    return 0
  }

  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function repairTitle(repair: RepairHistoryLike) {
  return `Naprawa #${repair.id || repair.number || '-'}`
}

function repairStatus(repair: RepairHistoryLike) {
  const labels: Record<string, string> = {
    new: 'Nowa',
    planned: 'Zaplanowana',
    ready_to_be_repaired: 'Gotowa',
    at_location: 'W lokalizacji',
    IN_FIELD: 'W terenie',
    in_field: 'W terenie',
    done: 'Zakończona',
    cancelled: 'Anulowana',
  }

  return labels[String(repair.status || '')] || String(repair.status || 'Historia')
}

function repairStatusVariant(repair: RepairHistoryLike): BadgeVariant {
  const status = String(repair.status || '').toLowerCase()

  if (status === 'done') {
    return 'success'
  }

  if (status === 'cancelled') {
    return 'error'
  }

  if (status === 'at_location' || status === 'in_field') {
    return 'warning'
  }

  return 'neutral'
}

function repairDate(repair: RepairHistoryLike) {
  return formatDateTime(repair.plannedArrivalAt || repair.startedAt || repair.createdAt || repair.updatedAt || null)
}

function repairDescription(repair: RepairHistoryLike) {
  return repair.description ? String(repair.description) : ''
}

function repairPlace(repair: RepairHistoryLike) {
  if (typeof repair.place === 'string') {
    return repair.place
  }

  return repair.place?.name || repair.placeName || (repair.placeId ? `#${repair.placeId}` : '-')
}

function repairFaultsSummary(repair: RepairHistoryLike) {
  const total = repair.totalFaults ?? repair.faults?.length ?? 0
  const done = repair.doneFaults ?? repair.faults?.filter((fault) => typeof fault !== 'string' && 'status' in fault && String(fault.status).toLowerCase() === 'done').length ?? 0
  return `${done}/${total}`
}

function repairDepartureDate(repair: RepairHistoryLike) {
  return formatDateTime(repair.plannedDepartureAt || repair.finishedAt || null)
}

function isRepairExpanded(repair: RepairHistoryLike) {
  return expandedRepairIds.value.has(repairKey(repair))
}

async function toggleRepairHistory(repair: RepairHistoryLike) {
  const key = repairKey(repair)
  const nextExpandedIds = new Set(expandedRepairIds.value)

  if (nextExpandedIds.has(key)) {
    nextExpandedIds.delete(key)
    expandedRepairIds.value = nextExpandedIds
    return
  }

  nextExpandedIds.add(key)
  expandedRepairIds.value = nextExpandedIds

  if (!repair.id || repairCommentsById.value[String(repair.id)]) {
    return
  }

  try {
    await repairStore.loadRepairDetail(repair.id, { silent: true })
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Nie udało się pobrać szczegółów',
      message: 'Szczegóły naprawy są chwilowo niedostępne.',
    })
  }
}

function repairDetail(repair: RepairHistoryLike): RepairHistoryLike {
  return (repair.id ? repairDetailsById.value[String(repair.id)] || repair : repair) as RepairHistoryLike
}

function repairFaults(repair: RepairHistoryLike): RepairHistoryFault[] {
  return Array.isArray(repair.faults) ? repair.faults : []
}

function repairFaultKey(fault: RepairHistoryFault) {
  if (typeof fault === 'string') {
    return fault
  }

  return String(fault.id || fault.description || fault.name || JSON.stringify(fault))
}

function repairFaultDescription(fault: RepairHistoryFault) {
  return typeof fault === 'string' ? fault : fault.description || fault.name || '-'
}

function repairFaultStatusLabel(fault: RepairHistoryFault) {
  if (typeof fault === 'string') {
    return 'Otwarta'
  }

  return String(fault.status || '').toLowerCase() === 'done' ? 'Zrobiona' : 'Otwarta'
}

function repairFaultStatusVariant(fault: RepairHistoryFault): BadgeVariant {
  if (typeof fault === 'string') {
    return 'neutral'
  }

  return String(fault.status || '').toLowerCase() === 'done' ? 'success' : 'neutral'
}

function repairFaultMechanic(fault: RepairHistoryFault) {
  return typeof fault === 'string' ? '' : fault.assignedMechanicFullName || ''
}

function repairFaultNote(fault: RepairHistoryFault) {
  return typeof fault === 'string' ? '' : fault.note || ''
}

function repairCreatedBy(repair: RepairHistoryLike) {
  if (repair.createdByUsername) {
    return repair.createdByUsername
  }

  if (repair.createdBy && typeof repair.createdBy === 'object') {
    return repair.createdBy.username || '-'
  }

  return repair.createdBy ? `#${repair.createdBy}` : '-'
}

function repairComments(repair: RepairHistoryLike) {
  if (!repair.id) {
    return (repair.comments || []) as RepairComment[]
  }

  return repairCommentsById.value[String(repair.id)] || repair.comments || []
}

function repairCommentAuthor(comment: RepairComment) {
  return comment.createdByUsername || (comment.createdBy ? `Użytkownik #${comment.createdBy}` : 'Użytkownik')
}

async function loadRepairHistory() {
  if (!vehicleId.value) {
    return
  }

  try {
    await repairStore.loadVehicleRepairHistory(vehicleId.value)
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Nie udało się pobrać historii',
      message: 'Historia serwisowa pojazdu jest chwilowo niedostępna.',
    })
  }
}

onMounted(async () => {
  if (!fleetStore.apiVehicles.length) {
    await fleetStore.fetchVehicles()
  }

  await loadRepairHistory()
})

watch(vehicleId, () => {
  deviceIdInput.value = ''
  expandedRepairIds.value = new Set()
  void loadRepairHistory()
})
</script>
