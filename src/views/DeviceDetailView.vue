<template>
  <div class="space-y-3">
    <header class="flex items-center gap-3">
      <div class="flex items-center gap-3">
        <AppIconLink
          :to="{ name: 'devices' }"
          label="Wróć do urządzeń"
        >
          <ArrowLeft class="h-4 w-4" />
        </AppIconLink>
        <div class="min-w-0">
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Urządzenie #{{ deviceId }}</p>
          <h1 class="mt-1 truncate ui-page-title">
            {{ device?.deviceName || 'Szczegóły urządzenia' }}
          </h1>
        </div>
      </div>

    </header>

    <div v-if="deviceStore.isDetailLoading" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-400">
      Pobieranie szczegółów urządzenia...
    </div>

    <div v-else-if="!device" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-400">
      Nie znaleziono urządzenia.
    </div>

    <div v-else class="grid min-w-0 gap-3 xl:grid-cols-[22rem_minmax(0,1fr)] xl:items-start">
      <AppCard class="min-w-0 xl:sticky xl:top-0" title="Informacje" :icon="Info" compact content-class="!p-0">
        <template #actions>
          <AppButton
            v-if="!editMode"
            size="sm"
            variant="secondary"
            :disabled="!canUpdateDevices"
            :title="!canUpdateDevices ? 'Brak uprawnienia: devices.update' : undefined"
            @click="openEdit"
          >
            <SquarePen class="h-4 w-4" />
            Edytuj
          </AppButton>
          <div v-else class="flex flex-wrap justify-end gap-2">
            <AppButton size="sm" variant="ghost" :disabled="deviceStore.isMutating" @click="cancelEdit">
              <X class="h-4 w-4" />
              Anuluj
            </AppButton>
            <AppButton
              size="sm"
              variant="secondary"
              :loading="deviceStore.isMutating"
              :disabled="!canUpdateDevices"
              :title="!canUpdateDevices ? 'Brak uprawnienia: devices.update' : undefined"
              @click="saveDevice"
            >
              <Check class="h-4 w-4" />
              Zapisz
            </AppButton>
          </div>
        </template>

        <div class="border-b border-ui-divider bg-ui-muted px-4 py-3">
          <div class="flex min-w-0 items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-2.5">
              <span class="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--rw-radius-control)] border border-ui-border bg-ui-surface text-ui-mutedText">
                <Cpu class="h-4 w-4" />
              </span>
              <div class="min-w-0">
                <p class="ui-caption">Urządzenie</p>
                <p class="truncate text-sm font-semibold text-ui-text">{{ device.deviceName || `#${device.id}` }}</p>
              </div>
            </div>
            <AppBadge :variant="device.status === 'ACTIVE' ? 'success' : 'neutral'">{{ deviceStatusLabel(device.status) }}</AppBadge>
          </div>
        </div>

        <div v-if="!editMode" class="divide-y divide-ui-divider px-4">
          <InfoLine label="Nazwa" :value="device.deviceName || '-'" />
          <InfoLine label="Typ" :value="deviceTypeLabel(device.type)" />
          <InfoLine label="Status" :value="deviceStatusLabel(device.status)" />
        </div>

        <div v-else class="space-y-3 px-4 py-3">
          <AppInput v-model="editForm.deviceName" label="Nazwa" />
          <AppSelect v-model="editForm.type" label="Typ" :options="typeOptions" />
          <AppSelect v-model="editForm.status" label="Status" :options="statusOptions" />
        </div>

        <div class="border-t border-ui-divider p-3">
          <AppButton
            class="w-full"
            size="sm"
            variant="danger"
            :disabled="!canDeleteDevices"
            :title="!canDeleteDevices ? 'Brak uprawnienia: devices.delete' : undefined"
            @click="openDeleteConfirmation"
          >
            <Trash2 class="h-4 w-4" />
            Usuń urządzenie
          </AppButton>
        </div>
      </AppCard>

      <AppCard class="min-w-0" title="Dane techniczne" :icon="Cpu" compact content-class="!p-0">
        <div class="divide-y divide-ui-divider px-4 sm:grid sm:grid-cols-2 sm:divide-y-0">
          <InfoLine label="Numer seryjny" :value="device.serialNumber" mono />
          <InfoLine label="Dostawca" :value="providerLabel(device.provider)" />
          <InfoLine label="Przypisanie" :value="device.assignedToVehicle ? 'Przypisane do pojazdu' : 'Nieprzypisane'" />
          <InfoLine label="Ostatnia pozycja" :value="formatDateTime(device.lastPositionAt)" :danger="isPositionOffline(device.lastPositionAt)" />
          <InfoLine label="Utworzono" :value="formatDateTime(device.createdAt)" />
          <InfoLine label="Wewnętrzne ID" :value="String(device.id)" mono />
        </div>
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
import { computed, defineComponent, h, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Check, Cpu, Info, SquarePen, Trash2, X } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppConfirmModal from '@/components/ui/AppConfirmModal.vue'
import AppIconLink from '@/components/ui/AppIconLink.vue'
import AppInput from '@/components/ui/AppInput.vue'
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
const { currentDevice: device } = storeToRefs(deviceStore)
const editMode = ref(false)
const showDeleteConfirmation = ref(false)
const deviceId = computed(() => String(route.params.id || ''))
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
  },
  setup(props) {
    return () => h('div', { class: 'grid min-w-0 grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-center gap-3 py-3 sm:px-2' }, [
      h('p', { class: 'ui-caption' }, props.label),
      h('p', { class: ['min-w-0 break-words text-right text-[13px] font-semibold', props.danger ? 'text-danger-600 dark:text-danger-400' : 'text-ui-text', props.mono ? 'font-mono' : ''] }, props.value),
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
  resetEditForm(device.value)
  editMode.value = true
}

function openDeleteConfirmation() {
  if (!canDeleteDevices.value) return
  showDeleteConfirmation.value = true
}

function cancelEdit() {
  if (!device.value || deviceStore.isMutating) return
  resetEditForm(device.value)
  editMode.value = false
}

async function loadDevice() {
  if (!deviceId.value) return

  try {
    const result = await deviceStore.loadDevice(deviceId.value)
    resetEditForm(result)
  } catch {
    // The global API interceptor displays the error.
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
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' })
}

function isPositionOffline(value: string | null) {
  if (!value) return true
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) || Date.now() - timestamp >= 24 * 60 * 60 * 1000
}

watch(deviceId, () => void loadDevice())
onMounted(() => void loadDevice())
onBeforeUnmount(() => deviceStore.clearCurrentDevice())
</script>
