<template>
  <div class="space-y-4">
    <header>
      <h1 class="ui-page-title">Ustawienia</h1>
    </header>

    <AppTabs
      v-if="settingsTabs.length"
      class="sticky top-0 z-20 w-fit"
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

    <AppCard v-if="activeTab === 'fleet'" title="Floty">
      <template #actions>
        <AppButton size="sm" @click="isCreateGroupModalOpen = true">
          <Plus class="h-4 w-4" />
          Dodaj flotę
        </AppButton>
      </template>

      <div class="space-y-2">
        <section
          v-for="group in fleetStore.vehicleGroups"
          :key="group.id"
          class="rounded-[var(--rw-radius-panel)] border border-ui-border p-2 transition"
          :class="isEditingGroup(group.id) ? 'bg-ui-muted' : 'bg-ui-surface'"
        >
          <div class="grid gap-2 lg:grid-cols-[18rem_minmax(0,1fr)_auto] lg:items-center">
            <AppInput
              :model-value="groupNameForms[group.id] || group.name || ''"
              placeholder="Nazwa floty"
              size="sm"
              :disabled="!isEditingGroup(group.id) || isGroupMutating"
              @update:model-value="groupNameForms[group.id] = $event"
              @keydown.enter.prevent="renameGroup(group.id)"
              @blur="isEditingGroup(group.id) && renameGroup(group.id)"
            />

            <VehicleTagInput
              :model-value="groupVehicleIds(group.id)"
              :vehicles="fleetStore.apiVehicles"
              floating
              compact
              :disabled="!isEditingGroup(group.id) || isGroupMutating"
              placeholder="Dodaj pojazd"
              @add="addVehicleToGroup(group.id, $event)"
              @remove="removeVehicleFromGroup(group.id, $event)"
            />

            <div class="flex flex-wrap gap-2 lg:justify-end">
              <AppButton size="sm" variant="secondary" :disabled="isGroupMutating" @click="toggleGroupEdit(group.id)">
                <component :is="isEditingGroup(group.id) ? Check : SquarePen" class="h-4 w-4" />
                {{ isEditingGroup(group.id) ? 'Gotowe' : 'Edytuj' }}
              </AppButton>
              <AppButton size="sm" variant="danger" @click="groupToDelete = group">
                <Trash2 class="h-4 w-4" />
                Usuń
              </AppButton>
            </div>
          </div>
        </section>

        <div v-if="!fleetStore.vehicleGroups.length" class="rounded-[var(--rw-radius-panel)] border border-dashed border-ui-border p-5 ui-body-sm text-ui-mutedText">
          Brak utworzonych flot.
        </div>
      </div>
    </AppCard>

    <CompanyManagementPanel v-else-if="activeTab === 'company' && authStore.canManageCompany" />
    <MailSettingsPanel v-else-if="activeTab === 'mail'" />
    <CountryNotificationsPanel v-else-if="activeTab === 'countries'" />

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
import { computed, onMounted, reactive, ref, watch, type Component } from 'vue'
import { BellRing, Check, Mail, Plus, ShieldCheck, SquarePen, Trash2, Truck } from 'lucide-vue-next'
import CompanyManagementPanel from '@/components/settings/CompanyManagementPanel.vue'
import CountryNotificationsPanel from '@/components/settings/CountryNotificationsPanel.vue'
import MailSettingsPanel from '@/components/settings/MailSettingsPanel.vue'
import VehicleTagInput from '@/components/selects/VehicleTagInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import { useAuthStore } from '@/stores/authStore'
import { useFleetStore } from '@/stores/fleetStore'
import { useUiStore } from '@/stores/uiStore'
import type { VehicleGroup } from '@/types/fleet'

type SettingsTabKey = 'fleet' | 'mail' | 'countries' | 'company'

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
  return value === 'fleet' || value === 'mail' || value === 'countries' || value === 'company'
}

function readStoredSettingsTab() {
  const storedValue = localStorage.getItem(SETTINGS_TAB_KEY)
  return isSettingsTabKey(storedValue) ? storedValue : 'fleet'
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
const settingsTabs = computed<Array<{ value: SettingsTabKey; label: string; icon: Component }>>(() => [
  ...(hasPermissionPrefix('vehicle_groups.')
    ? [{ value: 'fleet' as const, label: 'Floty', icon: Truck }]
    : []),
  ...(hasAnyPermission(['settings.read', 'settings.manage'])
    ? [{ value: 'mail' as const, label: 'Email / SMTP', icon: Mail }]
    : []),
  ...(hasPermissionPrefix('notifications.') || hasPermissionPrefix('vignettes.')
    ? [{ value: 'countries' as const, label: 'Powiadomienia krajowe', icon: BellRing }]
    : []),
  ...(authStore.canManageCompany
    ? [{ value: 'company' as const, label: 'Zarządzanie firmą', icon: ShieldCheck }]
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

async function toggleGroupEdit(groupId: string) {
  if (isEditingGroup(groupId)) {
    await renameGroup(groupId)
    editingGroupId.value = null
    return
  }

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
    return
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
    return
  }

  if (currentGroup?.name === name) {
    return
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
  } catch {
    if (currentGroup) {
      groupNameForms[groupId] = currentGroup.name
    }

    uiStore.addToast({
      type: 'error',
      title: 'Nie udało się zapisać floty',
      message: 'Spróbuj ponownie za chwilę.',
    })
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
    activeTab.value = tabs[0]?.value || 'fleet'
  }

  void ensureGroupsLoaded()
}, { immediate: true })

onMounted(async () => {
  await authStore.restoreBackendSession()
  await ensureGroupsLoaded()
})
</script>
