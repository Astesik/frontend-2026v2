<template>
  <AppModal
    :open="open"
    title="Dodaj nową naprawę"
    :size="quickReport ? 'sm' : 'xl'"
    :busy="isMutating"
    :close-on-backdrop="false"
    :close-on-escape="false"
    :panel-class="quickReport ? 'h-[calc(100dvh-1.5rem)] sm:h-[32rem]' : 'h-[calc(100dvh-1.5rem)] sm:h-[38rem]'"
    body-class="!min-h-0 !flex-1 !overflow-hidden !bg-ui-surface !p-3 sm:!p-4"
    @close="closeModal"
  >
    <form v-if="!result" id="shared-create-repair-form" class="grid h-full min-h-0 min-w-0 gap-3 sm:gap-4" :class="quickReport ? ((!dictionariesLoading && !basePlace) ? 'grid-rows-[auto_minmax(0,1fr)]' : 'grid-rows-[minmax(0,1fr)]') : 'grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[19rem_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]'" @submit.prevent="submitRepair">
      <section v-if="!quickReport || (!dictionariesLoading && !basePlace)" class="min-w-0" :class="quickReport ? '' : 'space-y-3'">
        <div v-if="!quickReport" class="grid grid-cols-2 gap-2 md:grid-cols-1 md:gap-3">
          <AppSearchSelect
            v-model="form.vehicleId"
            label="Pojazd"
            placeholder="Wybierz pojazd"
            :options="vehicleOptions"
            :disabled="lockVehicle"
            :error="detailsError && !form.vehicleId ? 'Wybierz pojazd.' : undefined"
          />
          <AppSearchSelect v-model="form.placeId" label="Miejsce" placeholder="Wybierz miejsce naprawy" :options="placeOptions" :error="detailsError && !form.placeId ? 'Wybierz miejsce naprawy.' : undefined" />

          <AppSelect v-model="form.status" label="Status" :options="statusOptions" />
          <AppDateTimePicker v-model="form.arrivalAt" label="Planowany przyjazd" default-time="08:00" />
          <AppDateTimePicker v-model="form.departureAt" label="Planowany odjazd" default-time="16:00" />
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

        <p v-if="quickReport && !dictionariesLoading && !basePlace" class="mt-3 ui-error">Nie znaleziono miejsca „Baza”. Dodaj je w strefach lub sprawdź dostęp do miejsc.</p>
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

  <Teleport to="body">
    <div v-if="photoPickerFaultId" class="fixed inset-0 z-[360] flex items-end justify-center bg-transparent p-3 md:hidden" @click.self="photoPickerFaultId = null">
      <section class="w-full max-w-sm overflow-hidden rounded-[var(--rw-radius-panel)] border border-ui-border bg-ui-surface shadow-modal">
        <header class="flex items-center justify-between border-b border-ui-divider px-4 py-3"><p class="ui-card-title">Dodaj zdjęcie</p><AppIconButton label="Zamknij" size="sm" variant="ghost" @click="photoPickerFaultId = null"><X class="h-4 w-4" /></AppIconButton></header>
        <div class="grid gap-2 p-3">
          <AppButton variant="secondary" full-width @click="choosePhotoSource('gallery')"><ImagePlus class="h-4 w-4" />Wybierz z galerii</AppButton>
          <AppButton variant="secondary" full-width @click="choosePhotoSource('camera')"><Camera class="h-4 w-4" />Zrób zdjęcie</AppButton>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { CalendarClock, Camera, CircleCheck, CircleX, ImagePlus, Plus, Trash2, TriangleAlert, X } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppDateTimePicker from '@/components/ui/AppDateTimePicker.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSearchSelect, { type AppSearchSelectOption } from '@/components/ui/AppSearchSelect.vue'
import AppSelect, { type AppSelectOption } from '@/components/ui/AppSelect.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import { getApiErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { useFleetStore } from '@/stores/fleetStore'
import { useRepairStore } from '@/stores/repairStore'
import { useUiStore } from '@/stores/uiStore'
import type { Repair, RepairStatus } from '@/types/repair'

interface DraftPhoto { id: string; file: File; objectUrl: string }
interface DraftFault { id: string; description: string; photos: DraftPhoto[]; photoError: string }

const props = withDefaults(defineProps<{ open: boolean; initialVehicleId?: number | string | null; lockVehicle?: boolean; existingRepairs?: Repair[]; quickReport?: boolean }>(), { initialVehicleId: null, lockVehicle: false, existingRepairs: () => [], quickReport: false })
const emit = defineEmits<{ close: []; created: [repair: Repair]; 'open-repair': [repair: Repair] }>()
const authStore = useAuthStore()
const fleetStore = useFleetStore()
const repairStore = useRepairStore()
const uiStore = useUiStore()
const { places, isMutating } = storeToRefs(repairStore)
const dictionariesLoading = ref(false)
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
const form = reactive({ vehicleId: '', placeId: '', status: 'planned' as RepairStatus, arrivalAt: '', departureAt: '' })
const statusOptions: AppSelectOption[] = [
  { label: 'Nowa', value: 'new' }, { label: 'Zaplanowana', value: 'planned' }, { label: 'Gotowa do naprawy', value: 'ready_to_be_repaired' },
  { label: 'W lokalizacji', value: 'at_location' }, { label: 'W terenie', value: 'IN_FIELD' }, { label: 'Zakończona', value: 'done' }, { label: 'Anulowana', value: 'cancelled' },
]
const vehicleOptions = computed<AppSearchSelectOption[]>(() => fleetStore.apiVehicles.map((vehicle) => ({ value: String(vehicle.id), label: vehicle.licensePlate, searchText: vehicle.licensePlate })))
const placeOptions = computed<AppSearchSelectOption[]>(() => places.value.map((place) => ({ value: String(place.id), label: place.name })))
const canCreateFaults = computed(() => authStore.canManageCompany || authStore.hasActiveCompanyPermission('faults.create'))
const canAddFaultPhotos = computed(() => authStore.canManageCompany || authStore.hasActiveCompanyPermission('fault_photos.add'))
const canCreateRepairs = computed(() => authStore.canManageCompany || authStore.hasActiveCompanyPermission('repairs.create'))
const basePlace = computed(() => places.value.find((place) => place.name.trim().toLocaleLowerCase('pl-PL') === 'baza'))
const canSubmit = computed(() => canCreateRepairs.value && (!props.quickReport || (canCreateFaults.value && !dictionariesLoading.value && Boolean(basePlace.value))))
const matchingRepairs = computed(() => props.existingRepairs.filter((repair) => String(repair.vehicle?.id ?? repair.vehicleId) === form.vehicleId))
const existingCurrentWeekRepair = computed(() => matchingRepairs.value.find((repair) => isCurrentWeek(repair.plannedArrivalAt)) || null)
const existingOpenRepair = computed(() => matchingRepairs.value.find((repair) => !['done', 'cancelled'].includes(normalizeStatus(repair.status))) || null)

function newFault(): DraftFault { return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, description: '', photos: [], photoError: '' } }
function resetForm() {
  revokePhotos(); Object.assign(form, { vehicleId: props.initialVehicleId == null ? '' : String(props.initialVehicleId), placeId: '', status: 'planned', arrivalAt: '', departureAt: '' })
  faults.value = [newFault()]; detailsError.value = false; faultsError.value = false; result.value = null; resultMessage.value = ''; createdRepair.value = null
}
function normalizeStatus(value: string) { const status = value.toLowerCase(); return status === 'in_field' || status === 'infield' ? 'IN_FIELD' : status }
function isCurrentWeek(value: string | null) {
  if (!value) return false
  const reference = !props.quickReport && form.arrivalAt ? new Date(form.arrivalAt) : new Date(); const start = new Date(reference); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() || 7) - 1)); const end = new Date(start); end.setDate(end.getDate() + 7)
  const date = new Date(value); return date >= start && date < end
}
function validateDetails() { const valid = Boolean(form.vehicleId && (props.quickReport ? basePlace.value : form.placeId)); detailsError.value = !valid; return valid }
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
    const response = await repairStore.createRepairWithFaults({ vehicleId: Number(form.vehicleId), placeId: props.quickReport ? basePlace.value!.id : Number(form.placeId), plannedArrivalAt: props.quickReport ? null : toIso(form.arrivalAt), plannedDepartureAt: props.quickReport ? null : toIso(form.departureAt), status: props.quickReport ? 'planned' : form.status, description: null }, canCreateFaults.value ? faults.value.map((fault) => ({ description: fault.description, assignedMechanicId: null, photos: canAddFaultPhotos.value ? fault.photos.map((photo) => photo.file) : [] })) : [], { silent: true })
    createdRepair.value = response.repair
    if (props.quickReport) {
      uiStore.addToast({
        type: response.photoUploadFailures ? 'warning' : 'success',
        title: response.photoUploadFailures ? 'Usterka dodana, ale nie wysłano wszystkich zdjęć' : 'Usterka dodana',
        message: response.photoUploadFailures ? `Nie udało się wysłać zdjęć: ${response.photoUploadFailures}.` : 'Usterka została poprawnie zapisana.',
      })
      emit('created', response.repair)
      closeModal()
      return
    }
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
  dictionariesLoading.value = true
  try { await repairStore.loadDictionaries() } finally { dictionariesLoading.value = false }
})
onBeforeUnmount(() => revokePhotos())
</script>

<style scoped>
.repair-warning { @apply flex flex-wrap items-center gap-2 rounded-[6px] border border-warning-100 bg-warning-50 px-3 py-2 text-warning-600 dark:border-warning-400/40 dark:bg-warning-400/10 dark:text-warning-400; }
</style>
