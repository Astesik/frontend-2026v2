<template>
  <AppModal
    :open="open"
    title="Dodaj nową naprawę"
    size="xl"
    :busy="isMutating"
    :close-on-backdrop="false"
    :close-on-escape="false"
    panel-class="h-[calc(100dvh-1.5rem)] sm:h-[calc(100dvh-3rem)] sm:max-h-[46rem]"
    body-class="!flex !min-h-0 !flex-1 !flex-col !overflow-hidden !bg-ui-surface !p-4 sm:!p-5"
    @close="closeModal"
  >
    <div v-if="!result" class="flex shrink-0 justify-center border-b border-ui-divider pb-4">
      <AppStepIndicator :steps="steps" :current-step="step" :max-reachable-step="maxReachableStep" @select="selectStep" />
    </div>

    <form v-if="!result" id="shared-create-repair-form" class="min-h-0 flex-1 overflow-hidden pt-4" @submit.prevent="step === 0 ? goToFaults() : submitRepair()">
      <section v-if="step === 0" class="mx-auto h-full max-w-4xl overflow-y-auto px-1 pb-1">
        <div class="grid gap-4 sm:grid-cols-2">
          <AppSearchSelect
            v-model="form.vehicleId"
            label="Pojazd"
            placeholder="Wybierz pojazd"
            :options="vehicleOptions"
            :disabled="lockVehicle"
            :error="detailsError && !form.vehicleId ? 'Wybierz pojazd.' : undefined"
          />
          <AppSearchSelect v-model="form.placeId" label="Miejsce" placeholder="Wybierz miejsce naprawy" :options="placeOptions" :error="detailsError && !form.placeId ? 'Wybierz miejsce naprawy.' : undefined" />

          <div v-if="existingCurrentWeekRepair" class="repair-warning sm:col-span-2">
            <CalendarClock class="h-5 w-5 shrink-0" />
            <p class="min-w-0 flex-1 text-sm font-semibold">Dla tego pojazdu istnieje już naprawa w tym tygodniu.</p>
            <AppButton type="button" size="sm" variant="secondary" @click="openExistingRepair(existingCurrentWeekRepair)">Przejdź do naprawy</AppButton>
          </div>
          <div v-else-if="existingOpenRepair" class="repair-warning sm:col-span-2">
            <TriangleAlert class="h-5 w-5 shrink-0" />
            <p class="min-w-0 flex-1 text-sm font-semibold">Dla tego pojazdu istnieje już niezamknięta naprawa.</p>
            <AppButton type="button" size="sm" variant="secondary" @click="openExistingRepair(existingOpenRepair)">Przejdź do naprawy</AppButton>
          </div>

          <AppSelect v-model="form.status" label="Status" :options="statusOptions" />
          <AppDateTimePicker v-model="form.arrivalAt" label="Planowany przyjazd" default-time="08:00" />
          <AppDateTimePicker v-model="form.departureAt" label="Planowany wyjazd" default-time="16:00" />
          <AppTextarea v-model="form.description" class="sm:col-span-2" label="Uwagi" placeholder="Uwagi do naprawy" :rows="4" />
        </div>
      </section>

      <section v-else class="flex h-full min-h-0 flex-col">
        <div class="mb-4 flex shrink-0 items-center justify-between gap-3"><h3 class="ui-section-title">Usterki</h3><AppBadge>{{ faults.length }}</AppBadge></div>
        <div class="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <article v-for="(fault, index) in faults" :key="fault.id" class="rounded-[var(--rw-radius-panel)] border border-ui-border bg-ui-muted p-3.5">
            <div class="mb-2 flex items-center justify-between gap-3">
              <span class="inline-flex h-9 w-9 items-center justify-center rounded-[6px] border border-ui-border bg-ui-surface text-sm font-semibold text-ui-text">{{ index + 1 }}</span>
              <AppIconButton label="Usuń usterkę" size="sm" variant="ghost" @click="removeFault(fault.id)"><Trash2 class="h-4 w-4" /></AppIconButton>
            </div>
            <AppInput v-model="fault.description" label="Opis usterki" placeholder="Np. wymiana klocków, światła, plandeka..." :disabled="!canCreateFaults" />
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
          <button type="button" class="flex min-h-20 w-full flex-col items-center justify-center gap-2 rounded-[var(--rw-radius-panel)] border border-dashed border-ui-border bg-ui-surface p-4 text-sm font-medium text-ui-text-secondary transition hover:bg-ui-hover disabled:cursor-not-allowed disabled:bg-ui-disabled" :disabled="!canCreateFaults" @click="addFault"><Plus class="h-4 w-4" />Dodaj kolejną usterkę</button>
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
        <AppButton type="button" variant="secondary" @click="returnToFaults">Wróć do usterek</AppButton>
        <AppButton type="button" :loading="isMutating" @click="submitRepair">Spróbuj ponownie</AppButton>
      </template>
      <template v-else-if="step === 0">
        <AppButton type="button" variant="secondary" @click="closeModal">Anuluj</AppButton><AppButton form="shared-create-repair-form" type="submit">Dalej</AppButton>
      </template>
      <template v-else>
        <AppButton type="button" variant="secondary" @click="selectStep(0)">Wstecz</AppButton><AppButton form="shared-create-repair-form" type="submit" :loading="isMutating">Zapisz naprawę</AppButton>
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
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSearchSelect, { type AppSearchSelectOption } from '@/components/ui/AppSearchSelect.vue'
import AppSelect, { type AppSelectOption } from '@/components/ui/AppSelect.vue'
import AppStepIndicator from '@/components/ui/AppStepIndicator.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import { getApiErrorMessage } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { useFleetStore } from '@/stores/fleetStore'
import { useRepairStore } from '@/stores/repairStore'
import type { Repair, RepairStatus } from '@/types/repair'

interface DraftPhoto { id: string; file: File; objectUrl: string }
interface DraftFault { id: string; description: string; photos: DraftPhoto[]; photoError: string }

const props = withDefaults(defineProps<{ open: boolean; initialVehicleId?: number | string | null; lockVehicle?: boolean; existingRepairs?: Repair[] }>(), { initialVehicleId: null, lockVehicle: false, existingRepairs: () => [] })
const emit = defineEmits<{ close: []; created: [repair: Repair]; 'open-repair': [repair: Repair] }>()
const authStore = useAuthStore()
const fleetStore = useFleetStore()
const repairStore = useRepairStore()
const { places, isMutating } = storeToRefs(repairStore)
const step = ref(0)
const maxReachableStep = ref(0)
const detailsError = ref(false)
const result = ref<'success' | 'error' | null>(null)
const resultMessage = ref('')
const createdRepair = ref<Repair | null>(null)
const faults = ref<DraftFault[]>([])
const galleryInput = ref<HTMLInputElement | null>(null)
const cameraInput = ref<HTMLInputElement | null>(null)
const selectedPhotoFaultId = ref<string | null>(null)
const photoPickerFaultId = ref<string | null>(null)
const form = reactive({ vehicleId: '', placeId: '', status: 'planned' as RepairStatus, arrivalAt: '', departureAt: '', description: '' })
const steps = [{ label: 'Dane naprawy' }, { label: 'Usterki' }]
const statusOptions: AppSelectOption[] = [
  { label: 'Nowa', value: 'new' }, { label: 'Zaplanowana', value: 'planned' }, { label: 'Gotowa do naprawy', value: 'ready_to_be_repaired' },
  { label: 'W lokalizacji', value: 'at_location' }, { label: 'W terenie', value: 'IN_FIELD' }, { label: 'Zakończona', value: 'done' }, { label: 'Anulowana', value: 'cancelled' },
]
const vehicleOptions = computed<AppSearchSelectOption[]>(() => fleetStore.apiVehicles.map((vehicle) => ({ value: String(vehicle.id), label: vehicle.licensePlate, searchText: vehicle.licensePlate })))
const placeOptions = computed<AppSearchSelectOption[]>(() => places.value.map((place) => ({ value: String(place.id), label: place.name })))
const canCreateFaults = computed(() => authStore.canManageCompany || authStore.hasActiveCompanyPermission('faults.create'))
const canAddFaultPhotos = computed(() => authStore.canManageCompany || authStore.hasActiveCompanyPermission('fault_photos.add'))
const matchingRepairs = computed(() => props.existingRepairs.filter((repair) => String(repair.vehicle?.id ?? repair.vehicleId) === form.vehicleId))
const existingCurrentWeekRepair = computed(() => matchingRepairs.value.find((repair) => isCurrentWeek(repair.plannedArrivalAt)) || null)
const existingOpenRepair = computed(() => matchingRepairs.value.find((repair) => !['done', 'cancelled'].includes(normalizeStatus(repair.status))) || null)

function newFault(): DraftFault { return { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, description: '', photos: [], photoError: '' } }
function localDateTime(value: Date) { const offset = value.getTimezoneOffset() * 60000; return new Date(value.getTime() - offset).toISOString().slice(0, 16) }
function resetForm() {
  revokePhotos(); Object.assign(form, { vehicleId: props.initialVehicleId == null ? '' : String(props.initialVehicleId), placeId: '', status: 'planned', arrivalAt: localDateTime(new Date()), departureAt: '', description: '' })
  faults.value = [newFault()]; step.value = 0; maxReachableStep.value = 0; detailsError.value = false; result.value = null; resultMessage.value = ''; createdRepair.value = null
}
function normalizeStatus(value: string) { const status = value.toLowerCase(); return status === 'in_field' || status === 'infield' ? 'IN_FIELD' : status }
function isCurrentWeek(value: string | null) {
  if (!value) return false
  const now = new Date(); const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() || 7) - 1)); const end = new Date(start); end.setDate(end.getDate() + 7)
  const date = new Date(value); return date >= start && date < end
}
function validateDetails() { const valid = Boolean(form.vehicleId && form.placeId); detailsError.value = !valid; return valid }
function goToFaults() { if (!validateDetails()) return; step.value = 1; maxReachableStep.value = 1 }
function selectStep(value: number) { if (result.value || value < 0 || value > maxReachableStep.value) return; if (value === 1 && !validateDetails()) return; step.value = value }
function returnToFaults() { result.value = null; resultMessage.value = ''; step.value = 1; maxReachableStep.value = 1 }
function addFault() { if (canCreateFaults.value) faults.value = [...faults.value, newFault()] }
function removeFault(id: string) { const fault = faults.value.find((item) => item.id === id); if (fault) revokePhotos([fault]); faults.value = faults.value.filter((item) => item.id !== id); if (!faults.value.length) faults.value = [newFault()] }
function revokePhotos(items = faults.value) { items.forEach((fault) => fault.photos.forEach((photo) => URL.revokeObjectURL(photo.objectUrl))) }
function validatePhoto(file: File) { if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) return 'Dozwolone formaty: JPG, PNG, GIF i WEBP.'; if (file.size > 20 * 1024 * 1024) return 'Zdjęcie może mieć maksymalnie 20 MB.'; return '' }
function openPhotoPicker(faultId: string) { if (window.matchMedia('(max-width: 767px)').matches) photoPickerFaultId.value = faultId; else openInput(galleryInput.value, faultId) }
function choosePhotoSource(source: 'gallery' | 'camera') { const id = photoPickerFaultId.value; photoPickerFaultId.value = null; if (id) openInput(source === 'camera' ? cameraInput.value : galleryInput.value, id) }
function openInput(input: HTMLInputElement | null, faultId: string) { if (!input) return; selectedPhotoFaultId.value = faultId; input.value = ''; input.click() }
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
  if (!validateDetails()) { step.value = 0; return }
  result.value = null; resultMessage.value = ''
  try {
    const response = await repairStore.createRepairWithFaults({ vehicleId: Number(form.vehicleId), placeId: Number(form.placeId), plannedArrivalAt: toIso(form.arrivalAt), plannedDepartureAt: toIso(form.departureAt), status: form.status, description: form.description.trim() || null }, canCreateFaults.value ? faults.value.map((fault) => ({ description: fault.description, assignedMechanicId: null, photos: canAddFaultPhotos.value ? fault.photos.map((photo) => photo.file) : [] })) : [], { silent: true })
    createdRepair.value = response.repair; result.value = 'success'; resultMessage.value = response.photoUploadFailures ? `Naprawa została utworzona, ale nie wysłano części zdjęć (${response.photoUploadFailures}).` : 'Naprawa została poprawnie zapisana.'; emit('created', response.repair); revokePhotos()
  } catch (error) { result.value = 'error'; resultMessage.value = getApiErrorMessage(error) }
}

watch(() => props.open, (value) => { if (value) { resetForm(); void repairStore.loadDictionaries() } })
onBeforeUnmount(() => revokePhotos())
</script>

<style scoped>
.repair-warning { @apply flex flex-col gap-3 rounded-[6px] border border-warning-100 bg-warning-50 px-4 py-3 text-warning-600 sm:flex-row sm:items-center dark:border-warning-400/40 dark:bg-warning-400/10 dark:text-warning-400; }
</style>
