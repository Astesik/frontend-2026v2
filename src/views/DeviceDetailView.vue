<template>
  <div class="space-y-3 md:flex md:h-full md:min-h-0 md:flex-col md:gap-3 md:space-y-0 md:overflow-hidden">
    <header class="flex shrink-0 flex-col items-start gap-3">
      <div class="flex min-w-0 items-center gap-3">
        <AppIconLink class="md:hidden" :to="{ name: 'devices' }" label="Wróć do listy urządzeń" size="sm"><ArrowLeft class="h-4 w-4" /></AppIconLink>
        <div class="min-w-0">
        <p class="text-sm font-medium text-ui-mutedText">Urządzenie #{{ deviceId }}</p>
        <h1 class="mt-1 break-words ui-page-title">{{ device?.deviceName || 'Szczegóły urządzenia' }}</h1>
        </div>
      </div>
    </header>

    <div v-if="isDetailLoading" class="ui-surface p-6 ui-body-sm text-ui-mutedText">Pobieranie szczegółów urządzenia...</div>
    <div v-else-if="!device" class="ui-surface p-6 ui-body-sm text-ui-mutedText">Nie znaleziono urządzenia.</div>

    <div v-else class="grid min-w-0 gap-3 md:min-h-0 md:flex-1 md:overflow-y-auto">
      <AppCard class="flex min-h-0 min-w-0 flex-col" title="Informacje" :icon="Info" compact content-class="!p-0 min-h-0 flex-1 overflow-y-auto">
        <template #actions>
          <div class="flex h-8 w-[4.5rem] items-center justify-end gap-2">
            <template v-if="editMode">
              <AppIconButton label="Anuluj edycję urządzenia" size="sm" variant="ghost" :disabled="deviceStore.isMutating" @click="cancelEdit"><X class="h-4 w-4" /></AppIconButton>
              <AppIconButton label="Zapisz urządzenie" size="sm" type="submit" :form="'device-inline-edit-' + deviceId" :loading="deviceStore.isMutating" :disabled="!canUpdateDevices"><Check class="h-4 w-4" /></AppIconButton>
            </template>
            <span v-else ref="informationMenuAnchor" class="inline-flex">
              <AppIconButton label="Opcje urządzenia" size="sm" variant="ghost" aria-haspopup="menu" :aria-expanded="isInformationMenuOpen" @click="isInformationMenuOpen = !isInformationMenuOpen"><Ellipsis class="h-4 w-4" /></AppIconButton>
            </span>
          </div>
          <AppDropdown :open="isInformationMenuOpen" :anchor="informationMenuAnchor" role="menu" :match-width="false" content-class="min-w-40 p-1" @close="isInformationMenuOpen = false">
            <AppDropdownItem role="menuitem" :disabled="!canUpdateDevices" @click="openEdit"><SquarePen class="h-4 w-4" />Edytuj</AppDropdownItem>
            <AppDropdownItem role="menuitem" class="text-danger-600 dark:text-danger-400" :disabled="!canDeleteDevices" @click="openDeleteConfirmation"><Trash2 class="h-4 w-4" />Usuń urządzenie</AppDropdownItem>
          </AppDropdown>
        </template>
        <form :id="'device-inline-edit-' + deviceId" @submit.prevent="saveDevice">
          <table class="w-full table-fixed border-collapse" aria-label="Informacje o urządzeniu">
            <tbody>
              <InfoLine label="Nazwa" :value="device.deviceName || '-'" :editing="editMode">
                <template #editor><input v-model="editForm.deviceName" class="device-inline-control" aria-label="Nazwa urządzenia" :disabled="deviceStore.isMutating" /></template>
              </InfoLine>
              <InfoLine label="Typ" :value="deviceTypeLabel(device.type)" :editing="editMode">
                <template #editor><AppSelect v-model="editForm.type" inline aria-label="Typ urządzenia" :options="typeOptions" :disabled="deviceStore.isMutating" /></template>
              </InfoLine>
              <InfoLine label="Status" :value="deviceStatusLabel(device.status)" :editing="editMode">
                <template #editor><AppSelect v-model="editForm.status" inline aria-label="Status urządzenia" :options="statusOptions" :disabled="deviceStore.isMutating" /></template>
              </InfoLine>
              <InfoLine label="Numer seryjny" :value="device.serialNumber" mono />
              <InfoLine label="Dostawca" :value="providerLabel(device.provider)" />
              <InfoLine label="Przypisanie" :value="device.assignedVehicleLicensePlate || (device.assignedVehicleId ? 'Pojazd #' + device.assignedVehicleId : 'Nieprzypisane')">
                <RouterLink v-if="device.assignedVehicleId" class="break-words underline-offset-4 hover:underline focus-visible:underline" :to="{ name: 'vehicle-detail', params: { id: device.assignedVehicleId } }">{{ device.assignedVehicleLicensePlate || 'Pojazd #' + device.assignedVehicleId }}</RouterLink>
                <span v-else>Nieprzypisane</span>
              </InfoLine>
              <InfoLine label="Ostatnia pozycja" :value="formatDateTime(device.lastPositionAt)" :danger="isPositionOffline(device.lastPositionAt)" />
              <InfoLine label="Utworzono" :value="formatDateTime(device.createdAt)" />
            </tbody>
          </table>
        </form>
      </AppCard>
    </div>

    <AppConfirmModal
      :open="Boolean(showDeleteConfirmation && device)"
      title="Usunąć urządzenie?"
      :description="device ? `Czy na pewno chcesz usunąć urządzenie ${device.deviceName || `#${device.id}`}?` : undefined"
      confirm-label="Usuń"
      confirm-variant="danger"
      :busy="deviceStore.isMutating"
      @close="showDeleteConfirmation = false"
      @confirm="confirmDelete"
    >
      <p v-if="device?.assignedToVehicle" class="ui-error">
        Urządzenie jest obecnie przypisane do pojazdu.
      </p>
    </AppConfirmModal>
  </div>
</template>

<script setup lang="ts">
import { useWorkspaceDirty, useWorkspaceTitle } from '@/composables/useWorkspace'
import { computed, defineComponent, h, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Check, Ellipsis, Info, SquarePen, Trash2, X } from 'lucide-vue-next'
import AppCard from '@/components/ui/AppCard.vue'
import AppIconLink from '@/components/ui/AppIconLink.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppDropdown from '@/components/ui/AppDropdown.vue'
import AppDropdownItem from '@/components/ui/AppDropdownItem.vue'
import AppConfirmModal from '@/components/ui/AppConfirmModal.vue'
import AppSelect, { type AppSelectOption } from '@/components/ui/AppSelect.vue'
import { useAuthStore } from '@/stores/authStore'
import { useDeviceStore } from '@/stores/deviceStore'
import { useUiStore } from '@/stores/uiStore'
import type { DeviceDetails, DeviceProvider, DeviceStatus, DeviceType } from '@/types/device'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUiStore()
const deviceStore = useDeviceStore()
const device = computed(() => deviceStore.detailsById[deviceId.value] || null)
const editMode = ref(false)
const isInformationMenuOpen = ref(false)
const informationMenuAnchor = ref<HTMLElement | null>(null)
const isDetailLoading = ref(false)
const showDeleteConfirmation = ref(false)
const deviceId = computed(() => String(route.params.id || ''))
useWorkspaceTitle(computed(() => device.value ? `Urządzenie - ${device.value.deviceName?.trim() || 'bez nazwy'}` : null))
const canUpdateDevices = computed(() => hasPermission('devices.update'))
const canDeleteDevices = computed(() => hasPermission('devices.delete'))
const editForm = reactive({
  deviceName: '',
  type: 'NEW' as DeviceType,
  status: 'ACTIVE' as DeviceStatus,
})

const typeOptions: AppSelectOption[] = [
  { label: 'Nowe', value: 'NEW' },
  { label: 'Ciągnik', value: 'TRUCK' },
  { label: 'Naczepa', value: 'TRAILER' },
  { label: 'Samochód', value: 'CAR' },
]

const statusOptions: AppSelectOption[] = [
  { label: 'Aktywne', value: 'ACTIVE' },
  { label: 'Nieaktywne', value: 'INACTIVE' },
]

const InfoLine = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
    mono: { type: Boolean, default: false },
    danger: { type: Boolean, default: false },
    editing: Boolean,
  },
  setup(props, { slots }) {
    return () => h('tr', { class: 'border-b border-ui-border last:border-b-0' }, [
      h('td', { class: 'w-[44%] border-r border-ui-border px-3 py-1 align-top ui-caption' }, [h('div', { class: 'py-2 leading-5' }, props.label)]),
      h('td', { class: ['px-2 py-1 align-top text-left text-[13px] font-semibold leading-5', props.danger ? 'text-danger-600 dark:text-danger-400' : 'text-ui-text', props.mono ? 'font-mono' : ''] }, [
        h('div', { class: 'relative min-w-0' }, [
          h('div', { class: ['min-h-9 whitespace-pre-wrap break-words border border-transparent px-2 py-[7px]', props.editing ? 'invisible' : ''], 'aria-hidden': props.editing || undefined }, slots.default?.() || props.value),
          props.editing ? h('div', { class: 'absolute inset-0' }, slots.editor?.()) : null,
        ]),
      ]),
    ])
  },
})

function resetEditForm(value: DeviceDetails) {
  Object.assign(editForm, {
    deviceName: value.deviceName || '',
    type: value.type,
    status: value.status,
  })
}

function hasPermission(permission: string) {
  return authStore.canManageCompany || authStore.hasActiveCompanyPermission(permission)
}

function openEdit() {
  if (!device.value || !canUpdateDevices.value) return
  isInformationMenuOpen.value = false
  resetEditForm(device.value)
  editMode.value = true
}

function openDeleteConfirmation() {
  if (!canDeleteDevices.value) return
  isInformationMenuOpen.value = false
  showDeleteConfirmation.value = true
}

function cancelEdit() {
  if (!device.value || deviceStore.isMutating) return
  resetEditForm(device.value)
  editMode.value = false
}

async function loadDevice() {
  if (!deviceId.value) return
  isDetailLoading.value = true

  try {
    const result = await deviceStore.loadDevice(deviceId.value)
    resetEditForm(result)
  } catch {
    // The global API interceptor displays the error.
  } finally {
    isDetailLoading.value = false
  }
}

async function saveDevice() {
  if (!device.value || !canUpdateDevices.value) return

  try {
    await deviceStore.updateDevice(device.value.id, {
      deviceName: editForm.deviceName.trim(),
      type: editForm.type,
      status: editForm.status,
    })
    editMode.value = false
    uiStore.addToast({ type: 'success', title: 'Urządzenie zaktualizowane', message: 'Zapisano zmiany urządzenia.' })
  } catch {
    // The global API interceptor displays the error.
  }
}

async function confirmDelete() {
  if (!device.value || !canDeleteDevices.value) return

  try {
    await deviceStore.deleteDevice(device.value.id)
    showDeleteConfirmation.value = false
    uiStore.addToast({ type: 'success', title: 'Urządzenie usunięte', message: 'Usunięto urządzenie z systemu.' })
    await router.push({ name: 'devices' })
  } catch {
    // Keep the confirmation open when the API rejects the deletion.
  }
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
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function isPositionOffline(value: string | null) {
  if (!value) return true
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) || Date.now() - timestamp >= 24 * 60 * 60 * 1000
}

watch(deviceId, () => void loadDevice())
onMounted(() => void loadDevice())
onBeforeUnmount(() => deviceStore.clearCurrentDevice())
useWorkspaceDirty(computed(() => editMode.value))
</script>

<style scoped>
:deep(.ui-card-header) { min-height: calc(3.5rem + 1px); align-items: center; }
:deep(.device-inline-control) {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  margin: 0;
  border: 1px solid rgb(var(--rw-border));
  border-radius: var(--rw-radius-control);
  background: rgb(var(--rw-surface));
  padding: 7px 8px;
  color: inherit;
  font: inherit;
  line-height: 20px;
  text-align: left;
  outline: none;
}
:deep(.device-inline-control:focus) { border-color: rgb(var(--rw-focus-ring)); box-shadow: inset 0 0 0 1px rgb(var(--rw-focus-ring)); }
:deep(.device-inline-control:disabled) { opacity: .6; }
</style>
