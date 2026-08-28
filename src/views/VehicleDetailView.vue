<template>
  <div class="space-y-3">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex items-center gap-3">
        <AppIconLink
          :to="{ name: 'vehicles' }"
          label="Wróć do listy pojazdów"
        >
          <ArrowLeft class="h-4 w-4" />
        </AppIconLink>
        <div>
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Pojazd</p>
          <h1 class="mt-1 ui-page-title">
            {{ vehicle?.licensePlate || 'Szczegóły pojazdu' }}
          </h1>
        </div>
      </div>

      <AppButton v-if="vehicle" size="sm" variant="secondary" @click="openServiceHistory">
        <History class="h-4 w-4" />
        Historia serwisowa
      </AppButton>

    </header>

    <div v-if="!vehicle && fleetStore.isVehiclesLoading" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-400">
      Pobieranie pojazdu...
    </div>

    <div v-else-if="!vehicle" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-400">
      Nie znaleziono pojazdu.
    </div>

    <div
      v-else
      class="grid min-w-0 gap-3"
      :class="isEditModalOpen
        ? 'xl:grid-cols-[32rem_minmax(0,1fr)] xl:items-start'
        : 'xl:grid-cols-[22rem_minmax(0,1fr)] xl:items-stretch'"
    >
        <AppCard class="h-full min-w-0" title="Informacje" :icon="Info" compact content-class="!p-0">
          <template #actions>
            <AppButton
              v-if="!isEditModalOpen"
              size="sm"
              variant="secondary"
              :disabled="!canUpdateVehicles"
              :title="!canUpdateVehicles ? 'Brak uprawnienia: vehicles.update' : undefined"
              @click="openEditModal"
            >
              <SquarePen class="h-4 w-4" />
              Edytuj
            </AppButton>
            <div v-else class="flex items-center gap-2">
              <AppButton size="sm" variant="ghost" :disabled="isUpdatingVehicle" @click="closeEditModal">
                <X class="h-4 w-4" />
                Anuluj
              </AppButton>
              <AppButton form="vehicle-inline-edit-form" type="submit" size="sm" :loading="isUpdatingVehicle">
                <Check class="h-4 w-4" />
                Zapisz
              </AppButton>
            </div>
          </template>

          <div class="border-b border-ui-divider bg-ui-muted px-4 py-3">
            <div class="flex min-w-0 items-center justify-between gap-3">
              <div class="flex min-w-0 items-center gap-2.5">
                <span class="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--rw-radius-control)] border border-ui-border bg-ui-surface text-ui-mutedText">
                  <Truck class="h-4 w-4" />
                </span>
                <div class="min-w-0">
                  <p class="ui-caption">Pojazd</p>
                  <p class="truncate text-sm font-semibold text-ui-text">{{ vehicle.licensePlate }}</p>
                </div>
              </div>
              <AppBadge :variant="vehicle.status === 'ACTIVE' ? 'success' : 'neutral'">{{ statusLabel(vehicle.status) }}</AppBadge>
            </div>
          </div>

          <div v-if="!isEditModalOpen" class="divide-y divide-ui-divider px-4">
            <InfoRow label="Numer rejestracyjny" :value="vehicle.licensePlate" />
            <InfoRow label="Typ pojazdu" :value="vehicleTypeLabel(vehicle.type)" />
            <InfoRow label="Marka" :value="vehicle.make" />
            <InfoRow label="VIN" :value="vehicle.vin" />
            <InfoRow label="Pierwsza rejestracja" :value="formatDate(vehicle.firstRegistration)" />
            <InfoRow label="Rok produkcji" :value="formatValue(vehicle.productionYear)" />
            <InfoRow label="Klasa Euro" :value="vehicle.euroClass" />
            <InfoRow label="Własność" :value="ownershipLabel(vehicle.ownership)" />
            <InfoRow label="Własność do" :value="formatDate(vehicle.ownershipUntil)" />
            <InfoRow label="Zbiornik paliwa" :value="fuelTankLabel(vehicle.fuelTank)" />
            <InfoRow label="Ostatnia pozycja" :value="formatDateTime(vehicle.lastPositionAt)" />
            <div class="grid min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-start gap-3 py-3">
              <p class="ui-caption">Opis pojazdu</p>
              <p class="whitespace-pre-wrap break-words text-right text-[13px] font-semibold leading-5 text-ui-text">
                {{ vehicle.description || '—' }}
              </p>
            </div>
          </div>

          <form v-else id="vehicle-inline-edit-form" class="grid gap-3 px-4 py-3 sm:grid-cols-2" @submit.prevent="submitVehicleEdit">
            <AppInput v-model="editForm.licensePlate" label="Numer rejestracyjny" size="sm" required />
            <AppSelect v-model="editForm.type" label="Typ pojazdu" :options="vehicleTypeFormOptions" size="sm" />
            <AppInput v-model="editForm.make" label="Marka" size="sm" />
            <AppInput v-model="editForm.vin" label="VIN" size="sm" />
            <AppInput v-model="editForm.productionYear" label="Rok produkcji" type="number" size="sm" />
            <AppDatePicker v-model="editForm.firstRegistration" label="Pierwsza rejestracja" size="sm" />
            <AppInput v-model="editForm.euroClass" label="Klasa Euro" size="sm" />
            <AppSelect v-model="editForm.ownership" label="Własność" :options="vehicleOwnershipFormOptions" size="sm" />
            <AppDatePicker v-model="editForm.ownershipUntil" label="Własność do" size="sm" />
            <AppDatePicker v-model="editForm.technicalInspection" label="Przegląd techniczny" size="sm" />
            <AppDatePicker v-model="editForm.tachographInspection" label="Legalizacja tachografu" size="sm" />
            <AppDatePicker v-model="editForm.vignetteUk" label="Winieta UK" size="sm" />
            <AppInput v-model="editForm.fuelTank" label="Zbiornik paliwa" type="number" size="sm" />
            <AppSelect v-model="editForm.status" label="Status" :options="vehicleStatusFormOptions" size="sm" />
            <AppTextarea
              v-model="editForm.description"
              class="sm:col-span-2"
              label="Opis pojazdu"
              placeholder="Wpisz dodatkowe informacje o pojeździe"
              :maxlength="1000"
              :rows="4"
              size="sm"
              show-counter
            />
          </form>
        </AppCard>

        <div class="flex min-h-0 min-w-0 flex-col gap-3">
          <div class="grid gap-3 lg:grid-cols-2">
          <AppCard class="h-full min-w-0" title="Przeglądy i winiety" :icon="CalendarCheck" compact content-class="!p-3">
            <div class="space-y-1.5">
              <InspectionRow label="Przegląd techniczny" :date="vehicle.technicalInspection" />
              <InspectionRow label="Legalizacja tachografu" :date="vehicle.tachographInspection" />
              <InspectionRow label="Winieta UK" :date="vehicle.vignetteUk" />
            </div>
          </AppCard>

          <AppCard class="h-full min-w-0" title="Urządzenie" :icon="Cpu" compact content-class="!p-3">
            <div class="flex items-start justify-between gap-4 rounded-[var(--rw-radius-control)] border border-ui-border bg-ui-muted p-2.5">
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
                :disabled="!canAssignDevices"
              />
              <AppButton
                size="sm"
                variant="secondary"
                :loading="isAssigningDevice"
                :disabled="!canAssignDevices || !deviceIdInput.trim()"
                :title="!canAssignDevices ? 'Brak uprawnienia: devices.assign' : undefined"
                @click="assignDevice"
              >
                Przypisz
              </AppButton>
              <AppButton
                size="sm"
                variant="secondary"
                :disabled="!canAssignDevices || !vehicle.assignedDeviceId"
                :title="!canAssignDevices ? 'Brak uprawnienia: devices.assign' : undefined"
                @click="openUnassignDeviceModal"
              >
                Odepnij
              </AppButton>
            </div>
          </AppCard>
          </div>

      <div class="min-w-0 space-y-3">
        <AppCard title="Dokumenty pojazdu" :icon="Files" compact>
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

        <AppCard v-if="canReadVehiclePhotos" title="Zdjęcia pojazdu" :icon="Images" compact>
          <VehiclePhotoGallery :vehicle-id="vehicle.id" />
        </AppCard>
        </div>
      </div>
        </div>
    <AppModal
      :open="isServiceHistoryOpen"
      title="Historia serwisowa"
      size="full"
      body-class="!min-h-0 !overflow-hidden !p-0"
      @close="isServiceHistoryOpen = false"
    >
      <div class="grid h-full min-h-0 lg:grid-cols-[30rem_minmax(0,1fr)]">
        <aside class="min-h-0 overflow-y-auto border-b border-ui-divider bg-ui-muted p-3 lg:border-b-0 lg:border-r">
          <div v-if="isRepairsLoading" class="p-4 ui-body-sm text-ui-mutedText">Pobieranie historii...</div>
          <div v-else-if="!repairHistory.length" class="rounded-[var(--rw-radius-control)] border border-dashed border-ui-border p-4 ui-body-sm text-ui-mutedText">
            Brak wpisów w książce serwisowej.
          </div>
          <div v-else class="ui-table-shell overflow-x-auto">
            <table class="ui-table w-full min-w-[27rem]">
              <thead class="ui-table-head">
                <tr>
                  <th class="ui-table-cell font-medium">Naprawa</th>
                  <th class="ui-table-cell w-28 font-medium">Termin</th>
                  <th class="ui-table-cell w-28 font-medium">Status</th>
                  <th class="ui-table-cell w-10"></th>
                </tr>
              </thead>
              <tbody>
                <template v-for="repair in repairHistory" :key="repairKey(repair)">
                  <tr class="ui-table-row cursor-pointer" @click="handleRepairHistoryClick(repair)">
                    <td class="ui-table-cell">
                      <p class="truncate font-semibold text-ui-text">{{ repairTitle(repair) }}</p>
                      <p class="mt-0.5 truncate ui-caption">{{ repairPlace(repair) }}</p>
                    </td>
                    <td class="ui-table-cell w-36 align-middle ui-caption">{{ serviceRepairRangeLabel(repair) }}</td>
                    <td class="ui-table-cell align-middle">
                      <AppBadge :variant="repairStatusVariant(repair)">{{ repairStatus(repair) }}</AppBadge>
                    </td>
                    <td class="ui-table-cell text-right">
                      <ChevronDown class="h-4 w-4 text-ui-icon transition" :class="isRepairExpanded(repair) ? 'rotate-180' : ''" />
                    </td>
                  </tr>
                  <tr v-if="isRepairExpanded(repair)">
                    <td colspan="4" class="border-b border-ui-divider bg-ui-muted p-3">
                      <div class="space-y-3">
                        <div class="grid gap-2 text-xs text-ui-text-secondary sm:grid-cols-2">
                          <span>Przyjazd: <strong class="text-ui-text">{{ repairDate(repairDetail(repair)) }}</strong></span>
                          <span>Wyjazd: <strong class="text-ui-text">{{ repairDepartureDate(repairDetail(repair)) }}</strong></span>
                          <span>Utworzył: <strong class="text-ui-text">{{ repairCreatedBy(repairDetail(repair)) }}</strong></span>
                          <span>Usterki: <strong class="text-ui-text">{{ repairFaultsSummary(repairDetail(repair)) }}</strong></span>
                        </div>
                        <p v-if="repairDescription(repairDetail(repair))" class="rounded-[var(--rw-radius-control)] border border-ui-border bg-ui-surface p-2.5 ui-body-sm text-ui-text-secondary">
                          {{ repairDescription(repairDetail(repair)) }}
                        </p>
                        <ul v-if="repairFaults(repairDetail(repair)).length" class="space-y-1.5">
                          <li
                            v-for="fault in repairFaults(repairDetail(repair))"
                            :key="repairFaultKey(fault)"
                            class="flex items-start justify-between gap-2 rounded-[var(--rw-radius-control)] border border-ui-border bg-ui-surface p-2"
                          >
                            <span class="min-w-0 text-xs font-medium text-ui-text">{{ repairFaultDescription(fault) }}</span>
                            <AppBadge :variant="repairFaultStatusVariant(fault)">{{ repairFaultStatusLabel(fault) }}</AppBadge>
                          </li>
                        </ul>
                        <RouterLink
                          v-if="repair.id"
                          class="inline-flex h-8 items-center gap-1.5 rounded-[var(--rw-radius-control)] border border-ui-border bg-ui-surface px-2.5 text-xs font-semibold text-ui-text transition hover:bg-ui-hover"
                          :to="{ name: 'repair-detail', params: { id: repair.id } }"
                        >
                          <ExternalLink class="h-3.5 w-3.5" />
                          Przejdź do szczegółów
                        </RouterLink>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </aside>

        <section class="hidden min-h-0 flex-col bg-ui-surface p-3 sm:p-4 lg:flex">
          <header class="mb-3 flex items-center justify-between gap-3">
            <AppIconButton label="Poprzedni miesiąc" @click="changeServiceHistoryMonth(-1)">
              <ChevronLeft class="h-4 w-4" />
            </AppIconButton>
            <h3 class="text-sm font-semibold capitalize text-ui-text sm:text-base">{{ serviceHistoryMonthLabel }}</h3>
            <AppIconButton label="Następny miesiąc" @click="changeServiceHistoryMonth(1)">
              <ChevronRight class="h-4 w-4" />
            </AppIconButton>
          </header>

          <div class="grid grid-cols-7 border-l border-t border-ui-divider text-center">
            <div v-for="dayName in serviceCalendarWeekdays" :key="dayName" class="border-b border-r border-ui-divider bg-ui-muted px-1 py-2 ui-caption">
              {{ dayName }}
            </div>
          </div>
          <div class="service-calendar-grid relative grid min-h-0 flex-1 grid-cols-7 grid-rows-6 overflow-hidden border-l border-ui-divider">
            <div
              v-for="day in serviceCalendarDays"
              :key="day.key"
              class="service-calendar-day min-h-16 border-b border-r border-ui-divider p-1.5 sm:min-h-20 sm:p-2"
              :class="day.isCurrentMonth ? 'bg-ui-surface' : 'bg-ui-muted text-ui-mutedText'"
            >
              <span class="inline-flex h-5 min-w-5 items-center justify-center text-[11px] font-semibold" :class="day.isToday ? 'rounded-full bg-ui-text px-1 text-ui-surface' : ''">
                {{ day.date.getDate() }}
              </span>
            </div>

            <div class="pointer-events-none absolute inset-0 grid grid-cols-7 grid-rows-6">
              <AppPopover
                  v-for="segment in serviceCalendarRangeSegments"
                  :key="segment.key"
                  :open="openServiceCalendarPopoverKey === segment.key"
                  :open-on-hover="true"
                  :hover-delay="700"
                  :match-width="false"
                  :max-height="440"
                  :trigger-class="serviceCalendarSegmentTriggerClass(segment)"
                  :trigger-style="serviceCalendarSegmentStyle(segment)"
                  :trigger-id="segment.isFirstForRepair ? serviceRepairAnchorId(segment.repair) : undefined"
                  content-class="w-80 overflow-hidden p-0"
                  @update:open="setServiceCalendarPopover(segment.key, $event)"
                >
                  <template #trigger>
                    <button
                      type="button"
                      class="block h-5 w-full truncate px-2 py-1 text-left text-[10px] font-semibold leading-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ui-focus sm:text-[11px]"
                      :class="serviceCalendarRepairClass(segment.repair)"
                      :aria-label="`Pokaż szczegóły: ${repairTitle(segment.repair)}`"
                    >
                      {{ repairPlace(segment.repair) }}
                    </button>
                  </template>

                  <div class="border-b border-ui-divider bg-ui-muted px-3 py-2.5">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="truncate text-sm font-semibold text-ui-text">{{ repairTitle(segment.repair) }}</p>
                        <p class="mt-0.5 truncate ui-caption">{{ repairPlace(segment.repair) }}</p>
                        <p class="mt-1 text-xs font-medium text-ui-text-secondary">{{ serviceRepairRangeLabel(segment.repair) }}</p>
                      </div>
                      <AppBadge :variant="repairStatusVariant(segment.repair)">{{ repairStatus(segment.repair) }}</AppBadge>
                    </div>
                  </div>
                  <div class="space-y-2.5 p-3">
                    <p v-if="repairDescription(segment.repair)" class="line-clamp-3 border-t border-ui-divider pt-2 text-xs leading-5 text-ui-text-secondary">
                      {{ repairDescription(segment.repair) }}
                    </p>
                    <div class="border-t border-ui-divider pt-2">
                      <p class="mb-1.5 text-xs font-semibold text-ui-text">Usterki</p>
                      <div v-if="repairFaults(repairDetail(segment.repair)).length" class="max-h-36 space-y-1 overflow-y-auto pr-1">
                        <div
                          v-for="fault in repairFaults(repairDetail(segment.repair))"
                          :key="repairFaultKey(fault)"
                          class="flex items-start gap-2 rounded-[6px] bg-ui-muted px-2 py-1.5"
                        >
                          <Check v-if="repairFaultStatusLabel(fault) === 'Zrobiona'" class="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600 dark:text-success-400" />
                          <span v-else class="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-ui-border-strong" />
                          <div class="min-w-0 flex-1">
                            <p class="break-words text-xs font-medium leading-4 text-ui-text">{{ repairFaultDescription(fault) }}</p>
                            <p v-if="repairFaultVisibleNote(fault)" class="mt-0.5 break-words ui-caption">{{ repairFaultVisibleNote(fault) }}</p>
                          </div>
                        </div>
                      </div>
                      <p v-else class="rounded-[6px] bg-ui-muted px-2 py-1.5 ui-caption">Brak usterek.</p>
                    </div>
                    <RouterLink
                      v-if="segment.repair.id"
                      :to="{ name: 'repair-detail', params: { id: segment.repair.id } }"
                      class="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[6px] border border-ui-border bg-ui-surface px-3 text-sm font-medium text-ui-text-secondary shadow-soft transition hover:border-ui-border-strong hover:bg-ui-hover hover:text-ui-text focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"
                    >
                      <ExternalLink class="h-4 w-4" />
                      Przejdź do szczegółów
                    </RouterLink>
                  </div>
              </AppPopover>
            </div>
          </div>
        </section>
      </div>
    </AppModal>

    <AppConfirmModal
      :open="isUnassignDeviceModalOpen"
      title="Odpiąć urządzenie?"
      :description="unassignDeviceDescription"
      confirm-label="Odepnij urządzenie"
      confirm-variant="danger"
      :busy="isUnassigningDevice"
      @close="closeUnassignDeviceModal"
      @confirm="unassignDevice"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, type PropType } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { ArrowLeft, CalendarCheck, Check, ChevronDown, ChevronLeft, ChevronRight, Cpu, ExternalLink, FileText, Files, History, Images, Info, SquarePen, Truck, X } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppConfirmModal from '@/components/ui/AppConfirmModal.vue'
import AppIconLink from '@/components/ui/AppIconLink.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppPopover from '@/components/ui/AppPopover.vue'
import AppSelect, { type AppSelectOption } from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import DeviceSelect from '@/components/selects/DeviceSelect.vue'
import VehiclePhotoGallery from '@/components/vehicles/VehiclePhotoGallery.vue'
import { vehicleService, type VehiclePayload } from '@/services/vehicleService'
import { useAuthStore } from '@/stores/authStore'
import { useFleetStore } from '@/stores/fleetStore'
import { useRepairStore, type VehicleRepairHistoryItem } from '@/stores/repairStore'
import { useUiStore } from '@/stores/uiStore'
import type { ApiVehicle } from '@/types/fleet'
import type { RepairComment, RepairFault } from '@/types/repair'

type VehicleForm = ReturnType<typeof createEmptyVehicleForm>
type RepairHistoryLike = VehicleRepairHistoryItem
type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info'
interface ServiceCalendarDay {
  date: Date
  key: string
  isCurrentMonth: boolean
  isToday: boolean
}
interface ServiceCalendarRangeSegment {
  key: string
  repair: RepairHistoryLike
  row: number
  startColumn: number
  columnSpan: number
  lane: number
  isFirstForRepair: boolean
}
type RepairHistoryFault = RepairFault | string | {
  id?: number | string
  name?: string | null
  description?: string | null
  status?: string | null
  note?: string | null
  assignedMechanicFullName?: string | null
}

const route = useRoute()
const authStore = useAuthStore()
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
const originalEditForm = ref<VehicleForm>(createEmptyVehicleForm())
const expandedRepairIds = ref<Set<string>>(new Set())
const isServiceHistoryOpen = ref(false)
const openServiceCalendarPopoverKey = ref<string | null>(null)
const focusedServiceRepairKey = ref<string | null>(null)
const serviceHistoryMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const serviceCalendarWeekdays = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd']

const vehicleId = computed(() => String(route.params.id || ''))
const vehicle = computed(() => fleetStore.apiVehicles.find((item) => String(item.id) === vehicleId.value) || null)
const unassignDeviceDescription = computed(() => {
  if (!vehicle.value) return ''
  const deviceLabel = vehicle.value.assignedDeviceId ? `#${vehicle.value.assignedDeviceId}` : ''
  return `Czy na pewno chcesz odpiąć urządzenie ${deviceLabel} od pojazdu ${vehicle.value.licensePlate}?`
})
const repairHistory = computed(() => [...(vehicleRepairHistory.value[vehicleId.value] || [])].sort((first, second) => repairTimestamp(second) - repairTimestamp(first)))
const serviceHistoryMonthLabel = computed(() => serviceHistoryMonth.value.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }))
const serviceCalendarDays = computed<ServiceCalendarDay[]>(() => {
  const year = serviceHistoryMonth.value.getFullYear()
  const month = serviceHistoryMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const start = new Date(year, month, 1 - mondayOffset)
  const todayKey = calendarDateKey(new Date())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return {
      date,
      key: calendarDateKey(date),
      isCurrentMonth: date.getMonth() === month,
      isToday: calendarDateKey(date) === todayKey,
    }
  })
})
const serviceCalendarRangeSegments = computed<ServiceCalendarRangeSegment[]>(() => {
  const days = serviceCalendarDays.value
  if (!days.length) return []

  const dayIndexByKey = new Map(days.map((day, index) => [day.key, index]))
  const firstDayTimestamp = new Date(days[0].date.getFullYear(), days[0].date.getMonth(), days[0].date.getDate()).getTime()
  const lastDay = days[days.length - 1].date
  const lastDayTimestamp = new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate()).getTime()
  const occupiedLanes = Array.from({ length: 6 }, () => [] as Array<{ start: number; end: number; lane: number }>)
  const segments: ServiceCalendarRangeSegment[] = []

  const repairs = [...repairHistory.value].sort((first, second) => repairTimestamp(first) - repairTimestamp(second))

  for (const repair of repairs) {
    const range = normalizedServiceRepairRange(repair)
    if (!range) continue

    const rangeStartTimestamp = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate()).getTime()
    const rangeEndTimestamp = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate()).getTime()
    if (rangeEndTimestamp < firstDayTimestamp || rangeStartTimestamp > lastDayTimestamp) continue

    const clippedStart = new Date(Math.max(rangeStartTimestamp, firstDayTimestamp))
    const clippedEnd = new Date(Math.min(rangeEndTimestamp, lastDayTimestamp))
    const startIndex = dayIndexByKey.get(calendarDateKey(clippedStart))
    const endIndex = dayIndexByKey.get(calendarDateKey(clippedEnd))
    if (startIndex === undefined || endIndex === undefined) continue

    let isFirstForRepair = true

    for (let row = Math.floor(startIndex / 7); row <= Math.floor(endIndex / 7); row += 1) {
      const segmentStart = Math.max(startIndex, row * 7)
      const segmentEnd = Math.min(endIndex, row * 7 + 6)
      const startColumn = segmentStart % 7
      const endColumn = segmentEnd % 7
      const rowLanes = occupiedLanes[row]
      let lane = 0

      while (rowLanes.some((item) => item.lane === lane && item.start <= endColumn && item.end >= startColumn)) {
        lane += 1
      }

      rowLanes.push({ start: startColumn, end: endColumn, lane })
      segments.push({
        key: `${repairKey(repair)}-${row}-${startColumn}-${endColumn}`,
        repair,
        row,
        startColumn,
        columnSpan: endColumn - startColumn + 1,
        lane,
        isFirstForRepair,
      })
      isFirstForRepair = false
    }
  }

  return segments
})
const canUpdateVehicles = computed(() => hasPermission('vehicles.update'))
const canAssignDevices = computed(() => hasPermission('devices.assign'))
const canReadVehiclePhotos = computed(() => authStore.hasActiveCompanyPermission('vehicle_photos.read'))

const mockedDocuments = [
  'Dowód rejestracyjny',
  'Certyfikat emisji spalin',
  'CIF',
  'COC',
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
    return () => h('div', { class: 'grid min-w-0 grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-center gap-3 py-3' }, [
      h('p', { class: 'ui-caption' }, props.label),
      h('p', { class: 'min-w-0 break-words text-right text-[13px] font-semibold text-ui-text' }, formatValue(props.value)),
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

      return h('div', { class: 'flex items-center justify-between gap-3 rounded-[var(--rw-radius-control)] border border-ui-border bg-ui-muted px-2.5 py-2' }, [
        h('div', [
          h('p', { class: 'text-xs font-semibold text-ui-text' }, props.label),
          h('p', { class: 'mt-0.5 ui-caption' }, formatDate(props.date)),
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
    description: '',
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
    description: source.description || '',
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

function payloadFromForm(form: VehicleForm, preserveEmptyDescription = false): VehiclePayload {
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
    description: preserveEmptyDescription ? form.description.trim() : nullableText(form.description),
  }
}

function changedPayloadFromForm(form: VehicleForm, original: VehicleForm): VehiclePayload {
  const fullPayload = payloadFromForm(form, true)
  const changedPayload: VehiclePayload = {}

  ;(Object.keys(form) as Array<keyof VehicleForm>).forEach((key) => {
    if (form[key] !== original[key]) {
      Object.assign(changedPayload, { [key]: fullPayload[key] })
    }
  })

  return changedPayload
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

function hasPermission(permission: string) {
  return authStore.canManageCompany || authStore.hasActiveCompanyPermission(permission)
}

function calendarDateKey(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function serviceRepairStart(repair: RepairHistoryLike) {
  const value = repair.arrivalTime || repair.plannedArrivalAt
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function serviceRepairEnd(repair: RepairHistoryLike) {
  const value = repair.departureTime || repair.plannedDepartureAt || repair.arrivalTime || repair.plannedArrivalAt
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function serviceCalendarRepairClass(repair: RepairHistoryLike) {
  const status = String(repair.status || '').toLowerCase()

  if (status === 'done') return 'bg-success-100/80 text-success-700 dark:bg-success-400/15 dark:text-success-400'
  if (status === 'cancelled') return 'bg-ui-muted text-ui-mutedText'
  if (status === 'at_location' || status === 'ready_to_be_repaired') return 'bg-warning-100/80 text-warning-700 dark:bg-warning-400/15 dark:text-warning-400'
  if (status === 'in_field') return 'bg-info-100/80 text-info-700 dark:bg-info-400/15 dark:text-info-400'
  return 'bg-ui-selected text-ui-text'
}

function isSameCalendarDay(first: Date, second: Date) {
  return calendarDateKey(first) === calendarDateKey(second)
}

function normalizedServiceRepairRange(repair: RepairHistoryLike) {
  const start = serviceRepairStart(repair)
  const end = serviceRepairEnd(repair)

  if (!start || !end) return null
  return start.getTime() <= end.getTime() ? { start, end } : { start: end, end: start }
}

function serviceCalendarSegmentStyle(segment: ServiceCalendarRangeSegment) {
  return {
    gridColumn: `${segment.startColumn + 1} / span ${segment.columnSpan}`,
    gridRow: `${segment.row + 1}`,
    marginTop: `${28 + segment.lane * 24}px`,
  }
}

function serviceCalendarSegmentTriggerClass(segment: ServiceCalendarRangeSegment) {
  return [
    'service-calendar-overlay-range',
    focusedServiceRepairKey.value === repairKey(segment.repair) ? 'service-calendar-overlay-range--focused' : '',
  ].filter(Boolean).join(' ')
}

function serviceRepairAnchorId(repair: RepairHistoryLike) {
  return `service-repair-${repairKey(repair).replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

function setServiceCalendarPopover(key: string, open: boolean) {
  if (open) {
    openServiceCalendarPopoverKey.value = key
  } else if (openServiceCalendarPopoverKey.value === key) {
    openServiceCalendarPopoverKey.value = null
  }
}

function serviceRepairRangeLabel(repair: RepairHistoryLike) {
  const range = normalizedServiceRepairRange(repair)
  if (!range) return '-'

  const format = (date: Date) => date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  if (isSameCalendarDay(range.start, range.end)) return format(range.start)
  return `${format(range.start)} - ${format(range.end)}`
}

function changeServiceHistoryMonth(offset: number) {
  serviceHistoryMonth.value = new Date(
    serviceHistoryMonth.value.getFullYear(),
    serviceHistoryMonth.value.getMonth() + offset,
    1,
  )
}

function openServiceHistory() {
  const newestRepairDate = repairHistory.value.map(serviceRepairStart).find(Boolean)

  if (newestRepairDate) {
    serviceHistoryMonth.value = new Date(newestRepairDate.getFullYear(), newestRepairDate.getMonth(), 1)
  }

  isServiceHistoryOpen.value = true
}

function openEditModal() {
  if (!vehicle.value || !canUpdateVehicles.value) {
    return
  }

  resetFormFromVehicle(editForm, vehicle.value)
  originalEditForm.value = { ...editForm }
  isEditModalOpen.value = true
}

function closeEditModal() {
  if (!isUpdatingVehicle.value) {
    isEditModalOpen.value = false
  }
}

function openUnassignDeviceModal() {
  if (canAssignDevices.value && vehicle.value?.assignedDeviceId) {
    isUnassignDeviceModalOpen.value = true
  }
}

function closeUnassignDeviceModal() {
  if (!isUnassigningDevice.value) {
    isUnassignDeviceModalOpen.value = false
  }
}

async function submitVehicleEdit() {
  if (!vehicle.value || !canUpdateVehicles.value || !editForm.licensePlate.trim()) {
    return
  }

  isUpdatingVehicle.value = true

  try {
    const payload = changedPayloadFromForm(editForm, originalEditForm.value)

    if (!Object.keys(payload).length) {
      isEditModalOpen.value = false
      return
    }

    const updatedVehicle = await vehicleService.updateVehicle(vehicle.value.id, payload)
    fleetStore.upsertApiVehicle(updatedVehicle)
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
  if (!vehicle.value || !canAssignDevices.value || !deviceIdInput.value.trim()) {
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
  if (!vehicle.value?.assignedDeviceId || !canAssignDevices.value) {
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

let serviceRepairFocusTimer: number | null = null

async function handleRepairHistoryClick(repair: RepairHistoryLike) {
  void toggleRepairHistory(repair)

  const start = serviceRepairStart(repair)
  if (!start) return

  serviceHistoryMonth.value = new Date(start.getFullYear(), start.getMonth(), 1)
  focusedServiceRepairKey.value = repairKey(repair)
  openServiceCalendarPopoverKey.value = null
  await nextTick()

  document.getElementById(serviceRepairAnchorId(repair))?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'center',
  })

  if (serviceRepairFocusTimer !== null) window.clearTimeout(serviceRepairFocusTimer)
  serviceRepairFocusTimer = window.setTimeout(() => {
    focusedServiceRepairKey.value = null
    serviceRepairFocusTimer = null
  }, 1800)
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

  const name = 'name' in fault ? fault.name : null
  return String(fault.id || fault.description || name || JSON.stringify(fault))
}

function repairFaultDescription(fault: RepairHistoryFault) {
  if (typeof fault === 'string') return fault
  const name = 'name' in fault ? fault.name : null
  return fault.description || name || '-'
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

function repairFaultVisibleNote(fault: RepairHistoryFault) {
  const note = repairFaultNote(fault).trim()
  return note.toLocaleLowerCase('pl-PL') === 'oznaczone jako wykonane' ? '' : note
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

watch(isServiceHistoryOpen, (open) => {
  if (!open) openServiceCalendarPopoverKey.value = null
})

onBeforeUnmount(() => {
  if (serviceRepairFocusTimer !== null) window.clearTimeout(serviceRepairFocusTimer)
})
</script>

<style scoped>
:global(.service-calendar-overlay-range) {
  display: block;
  min-width: 0;
  height: 1.25rem;
  overflow: hidden;
  align-self: start;
  pointer-events: auto;
  position: relative;
  z-index: 5;
  margin-right: 1px;
  margin-left: 1px;
  border-radius: 4px;
  transition: box-shadow 180ms ease, transform 180ms ease;
}

:global(.service-calendar-overlay-range--focused) {
  z-index: 8;
  box-shadow: 0 0 0 2px rgb(var(--rw-focus-ring));
  transform: translateY(-1px);
}
</style>
