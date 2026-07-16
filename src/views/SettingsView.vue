<template>
  <div class="space-y-6">
    <header>
      <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Konfiguracja</p>
      <h1 class="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">Ustawienia</h1>
    </header>

    <div class="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-app-border dark:bg-app-panel">
      <button v-for="tab in settingsTabs" :key="tab.value" type="button" class="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition" :class="activeTab === tab.value ? 'bg-slate-950 text-white dark:bg-slate-100 dark:text-app-dark' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-app-elevated'" @click="activeTab = tab.value">
        <component :is="tab.icon" class="h-4 w-4" />{{ tab.label }}
      </button>
    </div>

    <AppCard v-if="activeTab === 'fleet'" title="Floty" description="Zarządzanie grupami pojazdów używanymi na mapie i listach.">
      <form class="mb-5 grid gap-3 rounded-2xl border border-slate-100 p-3 dark:border-app-border sm:grid-cols-[1fr_auto]" @submit.prevent="createGroup">
        <AppInput v-model="newGroupName" label="Nowa flota" placeholder="Nazwa floty" />
        <AppButton class="self-end" type="submit" :loading="isGroupMutating">
          <Plus class="h-4 w-4" />
          Dodaj flotę
        </AppButton>
      </form>

      <div class="space-y-3">
        <section
          v-for="group in fleetStore.vehicleGroups"
          :key="group.id"
          class="rounded-2xl border border-slate-100 p-3 dark:border-app-border"
        >
          <div class="grid gap-3 lg:grid-cols-[18rem_minmax(0,1fr)_auto] lg:items-end">
            <AppInput
              v-model="groupNameForms[group.id]"
              label="Nazwa floty"
              placeholder="Nazwa floty"
              size="sm"
              @blur="renameGroup(group.id)"
              @keydown.enter.prevent="renameGroup(group.id)"
            />

            <VehicleTagInput
              :model-value="groupVehicleIds(group.id)"
              :vehicles="fleetStore.apiVehicles"
              label="Pojazdy"
              @add="addVehicleToGroup(group.id, $event)"
              @remove="removeVehicleFromGroup(group.id, $event)"
            />

            <div class="flex flex-wrap gap-2 lg:justify-end">
              <AppButton size="sm" variant="danger" @click="groupToDelete = group">
                <Trash2 class="h-4 w-4" />
                Usuń
              </AppButton>
            </div>
          </div>
        </section>

        <div v-if="!fleetStore.vehicleGroups.length" class="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 dark:border-app-border dark:text-slate-400">
          Brak utworzonych flot.
        </div>
      </div>
    </AppCard>

    <MailSettingsPanel v-else-if="activeTab === 'mail'" />
    <CountryNotificationsPanel v-else />

    <Teleport to="body">
      <div
        v-if="groupToDelete"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
        @click.self="groupToDelete = null"
      >
        <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
          <header class="border-b border-slate-100 px-5 py-4 dark:border-app-border">
            <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Usunąć flotę?</h2>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Czy na pewno chcesz usunąć flotę {{ groupToDelete.name }}?
            </p>
          </header>
          <footer class="flex justify-end gap-2 px-5 py-4">
            <AppButton variant="secondary" @click="groupToDelete = null">Anuluj</AppButton>
            <AppButton variant="danger" :loading="isGroupMutating" @click="deleteGroup">Usuń</AppButton>
          </footer>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch, type Component } from 'vue'
import { BellRing, Mail, Plus, Trash2, Truck } from 'lucide-vue-next'
import CountryNotificationsPanel from '@/components/settings/CountryNotificationsPanel.vue'
import MailSettingsPanel from '@/components/settings/MailSettingsPanel.vue'
import VehicleTagInput from '@/components/selects/VehicleTagInput.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { useFleetStore } from '@/stores/fleetStore'
import { useUiStore } from '@/stores/uiStore'
import type { VehicleGroup } from '@/types/fleet'

const uiStore = useUiStore()
const fleetStore = useFleetStore()
const newGroupName = ref('')
const groupToDelete = ref<VehicleGroup | null>(null)
const isGroupMutating = ref(false)
const groupNameForms = reactive<Record<string, string>>({})
const activeTab = ref<'fleet' | 'mail' | 'countries'>('fleet')
const settingsTabs: Array<{ value: 'fleet' | 'mail' | 'countries'; label: string; icon: Component }> = [
  { value: 'fleet', label: 'Floty', icon: Truck },
  { value: 'mail', label: 'Email / SMTP', icon: Mail },
  { value: 'countries', label: 'Powiadomienia krajowe', icon: BellRing },
]

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

async function loadGroups() {
  await Promise.allSettled([
    fleetStore.fetchVehicles({ silent: true }),
    fleetStore.fetchVehicleGroups({ silent: true }),
  ])
  syncGroupForms()
  await Promise.allSettled(fleetStore.vehicleGroups.map((group) => fleetStore.fetchVehicleGroup(group.id, { silent: true })))
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

onMounted(() => {
  void loadGroups()
})
</script>
