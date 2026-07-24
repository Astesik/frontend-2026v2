<template>
  <div class="space-y-5">
    <header class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex items-center gap-3">
        <RouterLink
          class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:bg-app-panel dark:text-slate-200 dark:hover:bg-app-elevated"
          :to="{ name: 'devices' }"
          aria-label="Wróć do urządzeń"
        >
          <ArrowLeft class="h-4 w-4" />
        </RouterLink>
        <div class="min-w-0">
          <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Urządzenie #{{ deviceId }}</p>
          <h1 class="mt-1 truncate text-2xl font-semibold text-slate-950 dark:text-slate-50">
            {{ device?.deviceName || 'Szczegóły urządzenia' }}
          </h1>
        </div>
      </div>

      <AppButton
        v-if="device"
        class="w-full sm:w-auto"
        size="sm"
        variant="danger"
        :disabled="!canDeleteDevices"
        :title="!canDeleteDevices ? 'Brak uprawnienia: devices.delete' : undefined"
        @click="openDeleteConfirmation"
      >
        <Trash2 class="h-4 w-4" />
        Usuń urządzenie
      </AppButton>
    </header>

    <div v-if="deviceStore.isDetailLoading" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-400">
      Pobieranie szczegółów urządzenia...
    </div>

    <div v-else-if="!device" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-400">
      Nie znaleziono urządzenia.
    </div>

    <div v-else>
      <AppCard title="Dane urządzenia" compact>
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

        <div v-if="!editMode" class="grid gap-3 sm:grid-cols-2">
          <InfoLine label="Nazwa" :value="device.deviceName || '-'" />
          <InfoLine label="Typ" :value="deviceTypeLabel(device.type)" />
          <InfoLine label="Status" :value="deviceStatusLabel(device.status)" />
          <InfoLine label="Numer seryjny" :value="device.serialNumber" mono />
          <InfoLine label="Dostawca" :value="providerLabel(device.provider)" />
          <InfoLine label="Przypisanie" :value="device.assignedToVehicle ? 'Przypisane do pojazdu' : 'Nieprzypisane'" />
          <InfoLine label="Ostatnia pozycja" :value="formatDateTime(device.lastPositionAt)" :danger="isPositionOffline(device.lastPositionAt)" />
          <InfoLine label="Utworzono" :value="formatDateTime(device.createdAt)" />
          <InfoLine label="Wewnętrzne ID" :value="String(device.id)" mono />
        </div>

        <div v-else class="grid gap-3 sm:grid-cols-2">
          <AppInput v-model="editForm.deviceName" label="Nazwa" />
          <AppSelect v-model="editForm.type" label="Typ" :options="typeOptions" />
          <AppSelect v-model="editForm.status" label="Status" :options="statusOptions" />
        </div>
      </AppCard>
    </div>

    <Teleport to="body">
      <div
        v-if="showDeleteConfirmation && device"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        @click.self="showDeleteConfirmation = false"
      >
        <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <header class="border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Usunąć urządzenie?</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Czy na pewno chcesz usunąć urządzenie {{ device.deviceName || `#${device.id}` }}?
            </p>
            <p v-if="device.assignedToVehicle" class="mt-2 text-sm font-medium text-danger-600 dark:text-danger-400">
              Urządzenie jest obecnie przypisane do pojazdu.
            </p>
          </header>
          <footer class="flex justify-end gap-2 px-5 py-4">
            <AppButton variant="secondary" :disabled="deviceStore.isMutating" @click="showDeleteConfirmation = false">Anuluj</AppButton>
            <AppButton
              variant="danger"
              :loading="deviceStore.isMutating"
              :disabled="!canDeleteDevices"
              :title="!canDeleteDevices ? 'Brak uprawnienia: devices.delete' : undefined"
              @click="confirmDelete"
            >
              Usuń
            </AppButton>
          </footer>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Check, SquarePen, Trash2, X } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
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
    return () => h('div', { class: 'rounded-2xl border border-slate-100 p-3 dark:border-app-border' }, [
      h('p', { class: 'text-xs font-medium uppercase text-slate-500 dark:text-slate-400' }, props.label),
      h('p', { class: ['mt-1 break-words text-sm font-semibold', props.danger ? 'text-danger-600 dark:text-danger-400' : 'text-slate-950 dark:text-slate-50', props.mono ? 'font-mono' : ''] }, props.value),
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
