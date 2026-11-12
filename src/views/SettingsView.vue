<template>
  <div class="space-y-4 md:flex md:h-full md:min-h-0 md:flex-col md:gap-4 md:space-y-0 md:overflow-hidden">
    <header class="shrink-0">
      <h1 class="ui-page-title">Ustawienia</h1>
    </header>

    <AppTabs
      v-if="settingsTabs.length"
      class="sticky top-0 z-20 w-full max-w-full shrink-0"
      variant="underline"
      size="sm"
      :model-value="activeTab"
      :items="settingsTabs"
      aria-label="Sekcje ustawień"
      @update:model-value="setActiveSettingsTab"
    />

    <AppCard v-if="!settingsTabs.length" compact>
      <p class="ui-body-sm text-ui-mutedText">
        Brak dostępnych sekcji ustawień dla aktualnych uprawnień.
      </p>
    </AppCard>

    <div class="settings-content min-w-0 space-y-3 md:min-h-0 md:flex-1 md:overflow-y-auto">
    <AccountSecurityPanel v-if="activeTab === 'account'" />
    <CompanyManagementPanel v-if="activeTab === 'company' && authStore.canManageCompany" />
    <div v-if="activeTab === 'fleet' && canManageFleets" class="space-y-3">
      <div class="flex items-center justify-between gap-3">
        <span class="ui-caption">Floty: {{ fleetStore.vehicleGroups.length }}</span>
        <AppButton size="sm" @click="isCreateGroupModalOpen = true"><Plus class="h-4 w-4" />Dodaj flotę</AppButton>
      </div>
      <p v-if="fleetStore.isVehicleGroupsLoading" class="py-8 text-center ui-caption" role="status">Pobieranie flot…</p>
      <div v-else-if="fleetStore.vehicleGroups.length" class="grid min-w-0 items-stretch gap-3 xl:grid-cols-2">
        <AppCard v-for="group in fleetStore.vehicleGroups" :key="group.id" :title="group.name" :icon="Truck" compact content-class="!p-0 min-w-0">
          <template #actions>
            <div class="flex items-center gap-1">
              <AppBadge class="mr-1">{{ groupVehicleIds(group.id).length }} poj.</AppBadge>
              <AppIconButton :label="isEditingGroup(group.id) ? 'Zakończ edycję floty ' + group.name : 'Edytuj flotę ' + group.name" size="sm" variant="ghost" :disabled="isGroupMutating" @click="toggleGroupEdit(group.id)"><component :is="isEditingGroup(group.id) ? Check : SquarePen" class="h-4 w-4" /></AppIconButton>
              <AppIconButton :label="'Usuń flotę ' + group.name" size="sm" variant="danger" :disabled="isGroupMutating" @click="groupToDelete = group"><Trash2 class="h-4 w-4" /></AppIconButton>
            </div>
          </template>
          <div v-if="isEditingGroup(group.id)" class="space-y-3 p-4">
            <AppInput :model-value="groupNameForms[group.id] ?? group.name" label="Nazwa floty" size="sm" :disabled="isGroupMutating" @update:model-value="groupNameForms[group.id] = $event" @keydown.enter.prevent="renameGroup(group.id)" />
            <VehicleTagInput :model-value="groupVehicleIds(group.id)" :vehicles="fleetStore.apiVehicles" label="Pojazdy" floating compact :disabled="isGroupMutating" placeholder="Dodaj pojazd do floty" @add="addVehicleToGroup(group.id, $event)" @remove="removeVehicleFromGroup(group.id, $event)" />
            <div class="flex justify-end"><AppButton size="sm" :loading="isGroupMutating" @click="toggleGroupEdit(group.id)"><Check class="h-4 w-4" />Gotowe</AppButton></div>
          </div>
          <div v-else class="p-4">
            <div v-if="groupVehicleIds(group.id).length" class="flex flex-wrap gap-2">
              <span v-for="item in groupVehicles(group.id)" :key="item.id" class="inline-flex items-center gap-2 rounded-[var(--rw-radius-control)] border border-ui-border bg-ui-muted px-3 py-2 text-xs font-medium text-ui-text"><Truck class="h-3.5 w-3.5 text-ui-icon" />{{ item.label }}</span>
            </div>
            <p v-else class="py-3 text-center ui-caption">Brak pojazdów. Edytuj flotę, aby je przypisać.</p>
          </div>
        </AppCard>
      </div>
      <AppCard v-else title="Twoje floty" :icon="Truck" compact>
        <div class="flex flex-col items-center gap-3 py-8 text-center"><Truck class="h-8 w-8 text-ui-icon" /><p class="text-sm text-ui-mutedText">Dodaj pierwszą flotę i pogrupuj pojazdy.</p><AppButton size="sm" @click="isCreateGroupModalOpen = true"><Plus class="h-4 w-4" />Dodaj flotę</AppButton></div>
      </AppCard>
    </div>
    <template v-if="activeTab === 'notifications'">
      <CountryNotificationsPanel v-if="canManageCountryNotifications" />
      <MailSettingsPanel v-if="canManageMail" />
    </template>
    </div>

    <AppModal
      :open="isCreateGroupModalOpen"
      title="Dodaj flotę"
      size="sm"
      :busy="isGroupMutating"
      @close="closeCreateGroupModal"
    >
      <form id="create-fleet-form" @submit.prevent="createGroup">
        <AppInput v-model="newGroupName" label="Nazwa floty" placeholder="Nazwa floty" required />
      </form>
      <template #footer>
        <AppButton variant="secondary" type="button" @click="closeCreateGroupModal">Anuluj</AppButton>
        <AppButton form="create-fleet-form" type="submit" :loading="isGroupMutating">
          <Plus class="h-4 w-4" />
          Dodaj
        </AppButton>
      </template>
    </AppModal>

    <AppModal
      :open="Boolean(groupToDelete)"
      title="Usunąć flotę?"
      :description="groupToDelete ? `Czy na pewno chcesz usunąć flotę ${groupToDelete.name}?` : undefined"
      size="sm"
      :busy="isGroupMutating"
      @close="groupToDelete = null"
    >
      <p class="ui-body-sm text-ui-mutedText">Tej operacji nie można cofnąć.</p>
      <template #footer>
        <AppButton variant="secondary" @click="groupToDelete = null">Anuluj</AppButton>
        <AppButton variant="danger" :loading="isGroupMutating" @click="deleteGroup">Usuń</AppButton>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { useWorkspaceViewState, useWorkspaceDirty } from '@/composables/useWorkspace'
import { computed, onMounted, reactive, ref, watch, type Component } from 'vue'
import {
  IconBellRinging as BellRing,
  IconBuildings as Building2,
  IconCheck as Check,
  IconPlus as Plus,
  IconEdit as SquarePen,
  IconTrash as Trash2,
  IconTruck as Truck,
  IconUser as UserRound,
} from '@tabler/icons-vue'
import CompanyManagementPanel from '@/components/settings/CompanyManagementPanel.vue'
import CountryNotificationsPanel from '@/components/settings/CountryNotificationsPanel.vue'
import MailSettingsPanel from '@/components/settings/MailSettingsPanel.vue'
import AccountSecurityPanel from '@/components/settings/AccountSecurityPanel.vue'
import VehicleTagInput from '@/components/selects/VehicleTagInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import { useAuthStore } from '@/stores/authStore'
import { useFleetStore } from '@/stores/fleetStore'
import { useUiStore } from '@/stores/uiStore'
import type { VehicleGroup } from '@/types/fleet'

type SettingsTabKey = 'account' | 'company' | 'fleet' | 'notifications'

const SETTINGS_TAB_KEY = 'routewise.settings.activeTab'
const uiStore = useUiStore()
const fleetStore = useFleetStore()
const authStore = useAuthStore()
const newGroupName = ref('')
const groupToDelete = ref<VehicleGroup | null>(null)
const isGroupMutating = ref(false)
const isCreateGroupModalOpen = ref(false)
const hasLoadedGroups = ref(false)
const editingGroupId = ref<string | null>(null)
const groupNameForms = reactive<Record<string, string>>({})

function isSettingsTabKey(value: string | null): value is SettingsTabKey {
  return value === 'account' || value === 'company' || value === 'fleet' || value === 'notifications'
}

function normalizeSettingsTab(value: string | null): SettingsTabKey {
  if (value === 'mail' || value === 'countries') return 'notifications'
  return isSettingsTabKey(value) ? value : 'account'
}

function readStoredSettingsTab() {
  return normalizeSettingsTab(localStorage.getItem(SETTINGS_TAB_KEY))
}

function hasPermissionPrefix(prefix: string) {
  const normalizedPrefix = prefix.toLowerCase()
  return authStore.canManageCompany || authStore.activeCompanyPermissions.some((permission) => (
    permission.toLowerCase().startsWith(normalizedPrefix)
  ))
}

function hasAnyPermission(permissions: string[]) {
  return authStore.canManageCompany || permissions.some((permission) => authStore.hasActiveCompanyPermission(permission))
}

const activeTab = ref<SettingsTabKey>(readStoredSettingsTab())
const canManageFleets = computed(() => hasPermissionPrefix('vehicle_groups.'))
const canManageMail = computed(() => hasAnyPermission(['settings.read', 'settings.manage']))
const canManageCountryNotifications = computed(() => hasPermissionPrefix('notifications.') || hasPermissionPrefix('vignettes.'))
const settingsTabs = computed<Array<{ value: SettingsTabKey; label: string; icon: Component }>>(() => [
  { value: 'account' as const, label: 'Konto', icon: UserRound },
  ...(authStore.canManageCompany
    ? [{ value: 'company' as const, label: 'Firma', icon: Building2 }]
    : []),
  ...(canManageFleets.value
    ? [{ value: 'fleet' as const, label: 'Floty', icon: Truck }]
    : []),
  ...(canManageMail.value || canManageCountryNotifications.value
    ? [{ value: 'notifications' as const, label: 'Powiadomienia', icon: BellRing }]
    : []),
])

function setActiveSettingsTab(value: string) {
  if (isSettingsTabKey(value)) activeTab.value = value
}

function syncGroupForms() {
  fleetStore.vehicleGroups.forEach((group) => {
    if (groupNameForms[group.id] === undefined) {
      groupNameForms[group.id] = group.name
    }
  })
}

function groupVehicleIds(groupId: string) {
  return fleetStore.vehicleGroupDetails[groupId]?.vehicleIds || []
}

function isEditingGroup(groupId: string) {
  return editingGroupId.value === groupId
}

function groupVehicles(groupId: string) {
  const vehicles = new Map(fleetStore.apiVehicles.map(vehicle => [String(vehicle.id), vehicle.licensePlate]))
  return groupVehicleIds(groupId).map(id => ({ id, label: vehicles.get(String(id)) || `Pojazd #${id}` }))
}

async function toggleGroupEdit(groupId: string) {
  if (isGroupMutating.value) return
  if (isEditingGroup(groupId)) {
    if (await renameGroup(groupId)) editingGroupId.value = null
    return
  }

  if (editingGroupId.value && !await renameGroup(editingGroupId.value)) return

  editingGroupId.value = groupId
}

async function loadGroups() {
  await Promise.allSettled([
    fleetStore.fetchVehicles({ silent: true }),
    fleetStore.fetchVehicleGroups({ silent: true }),
  ])
  syncGroupForms()
  await Promise.allSettled(fleetStore.vehicleGroups.map((group) => fleetStore.fetchVehicleGroup(group.id, { silent: true })))
}

async function ensureGroupsLoaded() {
  if (hasLoadedGroups.value || !hasPermissionPrefix('vehicle_groups.')) {
    return
  }

  hasLoadedGroups.value = true
  await loadGroups()
}

function closeCreateGroupModal() {
  if (isGroupMutating.value) {
    return
  }

  isCreateGroupModalOpen.value = false
  newGroupName.value = ''
}

async function createGroup() {
  const name = newGroupName.value.trim()

  if (!name) {
    uiStore.addToast({
      type: 'warning',
      title: 'Brak nazwy',
      message: 'Podaj nazwę floty.',
    })
    return
  }

  isGroupMutating.value = true

  try {
    const group = await fleetStore.createVehicleGroup(name)
    groupNameForms[group.id] = group.name
    newGroupName.value = ''
    isCreateGroupModalOpen.value = false
    uiStore.addToast({
      type: 'success',
      title: 'Flota dodana',
      message: `Utworzono flotę ${group.name}.`,
    })
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Nie udało się dodać floty',
      message: 'Spróbuj ponownie za chwilę.',
    })
  } finally {
    isGroupMutating.value = false
  }
}

async function renameGroup(groupId: string) {
  if (!isEditingGroup(groupId)) {
    return false
  }

  const name = groupNameForms[groupId]?.trim()
  const currentGroup = fleetStore.vehicleGroups.find((group) => group.id === groupId)

  if (!name) {
    if (currentGroup) {
      groupNameForms[groupId] = currentGroup.name
    }

    uiStore.addToast({
      type: 'warning',
      title: 'Brak nazwy',
      message: 'Nazwa floty nie może być pusta.',
    })
    return false
  }

  if (currentGroup?.name === name) {
    return true
  }

  isGroupMutating.value = true

  try {
    const group = await fleetStore.updateVehicleGroupName(groupId, name)
    groupNameForms[group.id] = group.name
    uiStore.addToast({
      type: 'success',
      title: 'Flota zaktualizowana',
      message: 'Zapisano nazwę floty.',
    })
    return true
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Nie udało się zapisać floty',
      message: 'Spróbuj ponownie za chwilę.',
    })
    return false
  } finally {
    isGroupMutating.value = false
  }
}

async function deleteGroup() {
  if (!groupToDelete.value) {
    return
  }

  isGroupMutating.value = true

  try {
    await fleetStore.deleteVehicleGroup(groupToDelete.value.id)
    delete groupNameForms[groupToDelete.value.id]
    groupToDelete.value = null
    uiStore.addToast({
      type: 'success',
      title: 'Flota usunięta',
      message: 'Usunięto flotę.',
    })
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Nie udało się usunąć floty',
      message: 'Spróbuj ponownie za chwilę.',
    })
  } finally {
    isGroupMutating.value = false
  }
}

async function addVehicleToGroup(groupId: string, vehicleId: string) {
  if (!isEditingGroup(groupId)) {
    return
  }

  isGroupMutating.value = true

  try {
    await fleetStore.addVehicleToVehicleGroup(groupId, vehicleId)
    uiStore.addToast({
      type: 'success',
      title: 'Pojazd dodany',
      message: 'Dodano pojazd do floty.',
    })
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Nie udało się dodać pojazdu',
      message: 'Spróbuj ponownie za chwilę.',
    })
  } finally {
    isGroupMutating.value = false
  }
}

async function removeVehicleFromGroup(groupId: string, vehicleId: string) {
  if (!isEditingGroup(groupId)) {
    return
  }

  isGroupMutating.value = true

  try {
    await fleetStore.removeVehicleFromVehicleGroup(groupId, vehicleId)
    uiStore.addToast({
      type: 'success',
      title: 'Pojazd usunięty',
      message: 'Usunięto pojazd z floty.',
    })
  } catch {
    uiStore.addToast({
      type: 'error',
      title: 'Nie udało się usunąć pojazdu',
      message: 'Spróbuj ponownie za chwilę.',
    })
  } finally {
    isGroupMutating.value = false
  }
}

watch(() => fleetStore.vehicleGroups, syncGroupForms, { deep: true })

watch(activeTab, (tab) => {
  localStorage.setItem(SETTINGS_TAB_KEY, tab)
})

watch(settingsTabs, (tabs) => {
  if (!tabs.some((tab) => tab.value === activeTab.value)) {
    activeTab.value = tabs[0]?.value || 'account'
  }

  void ensureGroupsLoaded()
}, { immediate: true })

onMounted(async () => {
  await authStore.restoreBackendSession()
  await ensureGroupsLoaded()
})
useWorkspaceViewState({ activeTab }, { activeTab: readStoredSettingsTab() })
activeTab.value = normalizeSettingsTab(activeTab.value)
if (!settingsTabs.value.some(tab => tab.value === activeTab.value)) activeTab.value = 'account'
useWorkspaceDirty(computed(() => editingGroupId.value !== null || isCreateGroupModalOpen.value))
</script>

<style scoped>
.settings-content { padding: 1px .75rem .75rem 1px; scrollbar-gutter: stable; overscroll-behavior: contain; }
.settings-content :deep(.ui-card-header > div:first-child) { min-width: 0; overflow-wrap: anywhere; }
.settings-content :deep(table) { border-collapse: collapse; }
.settings-content :deep(th:not(:last-child)),
.settings-content :deep(td:not(:last-child)) { border-right: 1px solid rgb(var(--rw-border)); }
.settings-content :deep(th), .settings-content :deep(td) { padding: .625rem .75rem; vertical-align: middle; }
</style>
