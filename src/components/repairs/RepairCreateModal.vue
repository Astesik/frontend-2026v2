<template>
  <AppModal
    :open="open"
    :title="quickReport ? 'Dodaj usterkę' : 'Dodaj nową naprawę'"
    :size="quickReport ? 'sm' : 'xl'"
    :busy="isMutating"
    :close-on-backdrop="false"
    :close-on-escape="false"
    :panel-class="quickReport ? 'h-[calc(100dvh-1.5rem)] sm:h-[32rem]' : 'h-[calc(100dvh-1.5rem)] sm:h-[38rem]'"
    body-class="!min-h-0 !flex-1 !overflow-hidden !bg-ui-surface !p-3 sm:!p-4"
    @close="closeModal"
  >
    <form v-if="!result" id="shared-create-repair-form" class="h-full min-h-0 min-w-0 gap-3 sm:gap-4" :class="quickReport ? 'grid grid-rows-[minmax(0,1fr)]' : 'space-y-4 overflow-y-auto md:grid md:grid-cols-[19rem_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] md:space-y-0 md:overflow-hidden'" @submit.prevent="submitRepair">
      <section v-if="!quickReport" class="min-w-0 space-y-3">
        <div class="grid grid-cols-1 gap-2 md:gap-3">
          <AppSearchSelect
            v-model="form.vehicleId"
            label="Pojazd"
            placeholder="Wybierz pojazd"
            :options="vehicleOptions"
            :disabled="lockVehicle"
            :error="detailsError && !form.vehicleId ? 'Wybierz pojazd.' : undefined"
          />

          <AppSelect v-model="form.status" label="Status" :options="repairStatusOptions" />
          <AppDateTimePicker v-model="form.arrivalAt" label="Planowany przyjazd" default-time="08:00" />
          <AppDateTimePicker v-model="form.departureAt" label="Planowany odjazd" default-time="16:00" />
          <AppSwitch v-model="form.urgent" label="Pilne" />
        </div>
        <div v-if="!quickReport && existingCurrentWeekRepair" class="repair-warning mt-3">
            <CalendarClock class="h-5 w-5 shrink-0" />
            <p class="min-w-0 flex-1 text-sm font-semibold">Dla tego pojazdu istnieje już naprawa w tym tygodniu.</p>
            <AppButton type="button" size="sm" variant="secondary" @click="openExistingRepair(existingCurrentWeekRepair)">Przejdź do naprawy</AppButton>
          </div>
        <div v-else-if="!quickReport && existingOpenRepair" class="repair-warning mt-3">
            <TriangleAlert class="h-5 w-5 shrink-0" />
            <p class="min-w-0 flex-1 text-sm font-semibold">Dla tego pojazdu istnieje już niezamknięta naprawa.</p>
            <AppButton type="button" size="sm" variant="secondary" @click="openExistingRepair(existingOpenRepair)">Przejdź do naprawy</AppButton>
          </div>

      </section>

      <section class="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden">
        <div v-if="!quickReport" class="flex shrink-0 items-center justify-between gap-3"><h3 class="ui-section-title">Usterki</h3><AppBadge>{{ faults.length }}</AppBadge></div>
        <div class="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
          <article v-for="(fault, index) in faults" :key="fault.id" :class="quickReport ? '' : 'rounded-[6px] border border-ui-border bg-ui-muted p-3'">
            <div v-if="!quickReport" class="mb-2 flex items-center justify-between gap-3">
              <span class="inline-flex h-9 w-9 items-center justify-center rounded-[6px] border border-ui-border bg-ui-surface text-sm font-semibold text-ui-text">{{ index + 1 }}</span>
              <AppIconButton label="Usuń usterkę" size="sm" variant="ghost" :disabled="isMutating" @click="removeFault(fault.id)"><Trash2 class="h-4 w-4" /></AppIconButton>
            </div>
            <AppTextarea v-model="fault.description" label="Usterka" placeholder="Opisz, co wymaga naprawy..." :rows="3" :disabled="!canCreateFaults || isMutating" :error="faultsError && !fault.description.trim() ? 'Wpisz opis usterki.' : undefined" />
            <AppSwitch v-if="quickReport" v-model="form.urgent" class="mt-3" label="Pilne" />
            <AppSearchSelect v-model="fault.placeId" class="mt-3" label="Planowane miejsce" placeholder="Do ustalenia" :options="placeOptions" :disabled="!canCreateFaults || isMutating" />
            <section class="mt-3 rounded-[6px] border border-ui-divider bg-ui-surface p-3">
              <div class="mb-2 flex items-center justify-between gap-2"><span class="flex items-center gap-2 ui-label text-ui-text"><ImagePlus class="h-4 w-4 text-ui-icon" />Zdjęcia</span><AppBadge>{{ fault.photos.length }}</AppBadge></div>
              <button type="button" class="flex min-h-16 w-full flex-col items-center justify-center gap-1.5 rounded-[6px] border border-dashed border-ui-border bg-ui-input p-3 text-sm font-medium text-ui-text-secondary transition hover:border-ui-border-strong hover:bg-ui-hover disabled:cursor-not-allowed disabled:bg-ui-disabled" :disabled="isMutating || !canAddFaultPhotos" @click="openPhotoPicker(fault.id)"><ImagePlus class="h-4 w-4" />Dodaj zdjęcia</button>
              <p v-if="fault.photoError" class="mt-2 ui-error">{{ fault.photoError }}</p>
              <div v-if="fault.photos.length" class="mt-2 grid max-h-28 grid-cols-[repeat(auto-fill,minmax(3.75rem,1fr))] gap-2 overflow-y-auto">
                <article v-for="photo in fault.photos" :key="photo.id" class="group relative aspect-square overflow-hidden rounded-[6px] border border-ui-border bg-ui-muted">
                  <img :src="photo.objectUrl" :alt="photo.file.name" class="h-full w-full object-cover" />
                  <button type="button" class="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ui-overlay/75 text-white" aria-label="Usuń zdjęcie" @click="removePhoto(fault.id, photo.id)"><X class="h-3 w-3" /></button>
                </article>
              </div>
            </section>
          </article>
          <AppButton v-if="!quickReport" type="button" class="w-full" variant="secondary" :disabled="!canCreateFaults || isMutating" @click="addFault"><Plus class="h-4 w-4" />Dodaj kolejną usterkę</AppButton>
        </div>
      </section>
    </form>

    <section v-else class="mx-auto flex min-h-0 max-w-xl flex-1 flex-col items-center justify-center px-4 py-8 text-center">
      <div class="grid h-16 w-16 place-items-center rounded-full" :class="result === 'success' ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400' : 'bg-danger-50 text-danger-600 dark:bg-danger-500/10 dark:text-danger-400'">
        <CircleCheck v-if="result === 'success'" class="h-9 w-9" /><CircleX v-else class="h-9 w-9" />
      </div>
      <h3 class="mt-4 text-xl font-semibold text-ui-text">{{ result === 'success' ? 'Naprawa dodana!' : 'Napotkano problem' }}</h3>
      <p class="mt-2 max-w-md ui-body-sm text-ui-mutedText">{{ resultMessage }}</p>
    </section>

    <template #footer>
      <template v-if="result === 'success'">
        <AppButton type="button" variant="secondary" @click="closeModal">Zamknij</AppButton>
        <AppButton type="button" @click="openCreatedRepair">Przejdź do naprawy</AppButton>
      </template>
      <template v-else-if="result === 'error'">
        <AppButton type="button" variant="secondary" @click="returnToForm">Wróć do formularza</AppButton>
        <AppButton type="button" :loading="isMutating" :disabled="!canSubmit" @click="submitRepair">Spróbuj ponownie</AppButton>
      </template>
      <template v-else>
        <AppButton type="button" variant="secondary" :disabled="isMutating" @click="closeModal">Anuluj</AppButton>
        <AppButton form="shared-create-repair-form" type="submit" :size="quickReport ? 'lg' : 'md'" :class="quickReport ? 'flex-1' : ''" :loading="isMutating" :disabled="!canSubmit"><Plus class="h-4 w-4" />Dodaj</AppButton>
      </template>
    </template>
  </AppModal>

  <input ref="galleryInput" type="file" class="fixed left-[-9999px] top-0 h-px w-px opacity-0" accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp" multiple @change="handlePhotoSelection" />
  <input ref="cameraInput" type="file" class="fixed left-[-9999px] top-0 h-px w-px opacity-0" accept="image/*" capture="environment" @change="handlePhotoSelection" />

  <PhotoSourceMenu :open="Boolean(photoPickerFaultId)" @close="photoPickerFaultId = null" @choose="choosePhotoSource" />
</template>

<script setup lang="ts">
import { useWorkspaceDirty } from '@/composables/useWorkspace'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  IconCalendarTime as CalendarClock,
  IconCircleCheck as CircleCheck,
  IconCircleX as CircleX,
  IconPhotoPlus as ImagePlus,
  IconPlus as Plus,
  IconTrash as Trash2,
  IconAlertTriangle as TriangleAlert,
  IconX as X,
} from '@tabler/icons-vue'
import PhotoSourceMenu from '@/components/ui/PhotoSourceMenu.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppDateTimePicker from '@/components/ui/AppDateTimePicker.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSearchSelect, { type AppSearchSelectOption } from '@/components/ui/AppSearchSelect.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import { getApiErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { useFleetStore } from '@/stores/fleetStore'
import { useRepairStore } from '@/stores/repairStore'
import { useUiStore } from '@/stores/uiStore'
import type { Repair, RepairStatus } from '@/types/repair'
import { normalizeRepairStatus, repairStatusOptions } from '@/utils/repairPresentation'

interface DraftPhoto { id: string; file: File; objectUrl: string }
interface DraftFault { id: string; description: string; placeId: string; photos: DraftPhoto[]; photoError: string }

const props = withDefaults(defineProps<{ open: boolean; initialVehicleId?: number | string | null; lockVehicle?: boolean; existingRepairs?: Repair[]; quickReport?: boolean }>(), { initialVehicleId: null, lockVehicle: false, existingRepairs: () => [], quickReport: false })
const emit = defineEmits<{ close: []; created: [repair: Repair]; 'fault-reported': []; 'open-repair': [repair: Repair] }>()
const authStore = useAuthStore()
const fleetStore = useFleetStore()
const repairStore = useRepairStore()
const uiStore = useUiStore()
const { places, isMutating } = storeToRefs(repairStore)
const faultsError = ref(false)
const detailsError = ref(false)
const result = ref<'success' | 'error' | null>(null)
const resultMessage = ref('')
const createdRepair = ref<Repair | null>(null)
const faults = ref<DraftFault[]>([])
const galleryInput = ref<HTMLInputElement | null>(null)
const cameraInput = ref<HTMLInputElement | null>(null)
const selectedPhotoFaultId = ref<string | null>(null)
const photoPickerFaultId = ref<string | null>(null)
const form = reactive({ vehicleId: '', urgent: false, status: 'new' as RepairStatus, arrivalAt: '', departureAt: '' })
const vehicleOptions = computed<AppSearchSelectOption[]>(() => fleetStore.apiVehicles.map((vehicle) => ({ value: String(vehicle.id), label: vehicle.licensePlate, searchText: vehicle.licensePlate })))
const placeOptions = computed<AppSearchSelectOption[]>(() => [{ value: '', label: 'Do ustalenia' }, ...places.value.map(place => ({ value: String(place.id), label: place.name }))])
const canCreateFaults = computed(() => authStore.canManageCompany || authStore.hasActiveCompanyPermission('faults.create'))
const canAddFaultPhotos = computed(() => authStore.canManageCompany || authStore.hasActiveCompanyPermission('fault_photos.add'))
const canCreateRepairs = computed(() => authStore.canManageCompany || authStore.hasActiveCompanyPermission('repairs.create'))
const canSubmit = computed(() => canCreateRepairs.value && (!props.quickReport || canCreateFaults.value))
const matchingRepairs = computed(() => props.existingRepairs.filter((repair) => String(repair.vehicle?.id ?? repair.vehicleId) === form.vehicleId))
const existingCurrentWeekRepair = computed(() => matchingRepairs.value.find((repair) => isCurrentWeek(repair.plannedArrivalAt)) || null)
const existingOpenRepair = computed(() => matchingRepairs.value.find((repair) => normalizeRepairStatus(repair.status) !== 'done') || null)

function newFault(): DraftFault { return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, description: '', placeId: '', photos: [], photoError: '' } }
function resetForm() {
  revokePhotos(); Object.assign(form, { vehicleId: props.initialVehicleId == null ? '' : String(props.initialVehicleId), urgent: false, status: 'new', arrivalAt: '', departureAt: '' })
  faults.value = [newFault()]; detailsError.value = false; faultsError.value = false; result.value = null; resultMessage.value = ''; createdRepair.value = null
}
function isCurrentWeek(value: string | null) {
  if (!value) return false
  const reference = !props.quickReport && form.arrivalAt ? new Date(form.arrivalAt) : new Date(); const start = new Date(reference); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() || 7) - 1)); const end = new Date(start); end.setDate(end.getDate() + 7)
  const date = new Date(value); return date >= start && date < end
}
function validateDetails() { const valid = Boolean(form.vehicleId); detailsError.value = !valid; return valid }
function returnToForm() { result.value = null; resultMessage.value = '' }
function addFault() { if (canCreateFaults.value) faults.value = [...faults.value, newFault()] }
function removeFault(id: string) { const fault = faults.value.find((item) => item.id === id); if (fault) revokePhotos([fault]); faults.value = faults.value.filter((item) => item.id !== id); if (!faults.value.length) faults.value = [newFault()] }
function revokePhotos(items = faults.value) { items.forEach((fault) => fault.photos.forEach((photo) => URL.revokeObjectURL(photo.objectUrl))) }
function validatePhoto(file: File) { if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) return 'Dozwolone formaty: JPG, PNG, GIF i WEBP.'; if (file.size > 20 * 1024 * 1024) return 'Zdjęcie może mieć maksymalnie 20 MB.'; return '' }
function openPhotoPicker(faultId: string) { if (window.matchMedia('(max-width: 767px)').matches) photoPickerFaultId.value = faultId; else openInput(galleryInput.value, faultId) }
function choosePhotoSource(source: 'gallery' | 'camera') { const id = photoPickerFaultId.value; photoPickerFaultId.value = null; if (id) openInput(source === 'camera' ? cameraInput.value : galleryInput.value, id) }
function openInput(input: HTMLInputElement | null, faultId: string) { if (!input) return; selectedPhotoFaultId.value = faultId; input.value = ''; input.click(); requestAnimationFrame(() => { if (document.activeElement === input) input.blur() }) }
function handlePhotoSelection(event: Event) {
  const input = event.target as HTMLInputElement; const fault = faults.value.find((item) => item.id === selectedPhotoFaultId.value); selectedPhotoFaultId.value = null
  if (!fault) { input.value = ''; return }
  fault.photoError = ''
  Array.from(input.files || []).forEach((file) => { const error = validatePhoto(file); if (error) fault.photoError = error; else fault.photos.push({ id: `${file.name}-${file.lastModified}-${Math.random()}`, file, objectUrl: URL.createObjectURL(file) }) })
  input.value = ''
}
function removePhoto(faultId: string, photoId: string) { const fault = faults.value.find((item) => item.id === faultId); const photo = fault?.photos.find((item) => item.id === photoId); if (photo) URL.revokeObjectURL(photo.objectUrl); if (fault) fault.photos = fault.photos.filter((item) => item.id !== photoId) }
function toIso(value: string) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString() }
function openExistingRepair(repair: Repair) { emit('open-repair', repair) }
function openCreatedRepair() { if (createdRepair.value) emit('open-repair', createdRepair.value) }
function closeModal() { if (!isMutating.value) { revokePhotos(); photoPickerFaultId.value = null; emit('close') } }
async function submitRepair() {
  if (isMutating.value || !canSubmit.value || !validateDetails()) return
  faultsError.value = canCreateFaults.value && !faults.value.some((fault) => fault.description.trim())
  if (faultsError.value) return
  result.value = null; resultMessage.value = ''
  try {
    const vehicleId = Number(form.vehicleId)
    const faultPayloads = canCreateFaults.value ? faults.value.map((fault) => ({
      description: fault.description,
      placeId: fault.placeId ? Number(fault.placeId) : null,
      assignedMechanicId: null,
      photos: canAddFaultPhotos.value ? fault.photos.map((photo) => photo.file) : [],
    })) : []

    if (props.quickReport) {
      const fault = faultPayloads.find(item => item.description.trim())
      if (!fault) return
      const photoUploadFailures = await repairStore.reportVehicleFault(vehicleId, fault, form.urgent)
      uiStore.addToast({
        type: photoUploadFailures ? 'warning' : 'success',
        title: photoUploadFailures ? 'Usterka dodana, ale nie wysłano wszystkich zdjęć' : 'Usterka dodana',
        message: photoUploadFailures ? `Nie udało się wysłać zdjęć: ${photoUploadFailures}.` : 'Usterka została poprawnie zapisana.',
      })
      emit('fault-reported')
      closeModal()
      return
    }

    const response = await repairStore.createRepairWithFaults({
      vehicleId,
      urgent: form.urgent,
      plannedArrivalAt: toIso(form.arrivalAt),
      plannedDepartureAt: toIso(form.departureAt),
      status: form.status,
      description: null,
    }, faultPayloads, { silent: true })
    createdRepair.value = response.repair
    result.value = 'success'; resultMessage.value = response.photoUploadFailures ? `Naprawa została utworzona, ale nie wysłano części zdjęć (${response.photoUploadFailures}).` : 'Naprawa została poprawnie zapisana.'; emit('created', response.repair); revokePhotos()
  } catch (error) {
    const message = getApiErrorMessage(error)
    if (props.quickReport) {
      uiStore.addToast({ type: 'error', title: 'Nie udało się dodać usterki', message })
      return
    }
    result.value = 'error'; resultMessage.value = message
  }
}

watch(() => props.open, async (value) => {
  if (!value) return
  resetForm()
  await repairStore.loadDictionaries()
})
onBeforeUnmount(() => revokePhotos())
useWorkspaceDirty(computed(() => props.open && !createdRepair.value && Boolean(form.vehicleId || form.urgent || form.arrivalAt || form.departureAt || faults.value.some(fault => fault.description.trim() || fault.placeId || fault.photos.length))))
</script>

<style scoped>
.repair-warning { @apply flex flex-wrap items-center gap-2 rounded-[6px] border border-warning-100 bg-warning-50 px-3 py-2 text-warning-600 dark:border-warning-400/40 dark:bg-warning-400/10 dark:text-warning-400; }
</style>
