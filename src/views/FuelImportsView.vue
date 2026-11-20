<template>
  <main class="flex min-h-0 min-w-0 flex-col gap-3 md:h-full">
    <header class="shrink-0 space-y-3">
      <h1 class="ui-page-title">Paliwo</h1>
      <AppTabs v-if="tabs.length" v-model="tab" :items="tabs" variant="underline" aria-label="Paliwo" />
    </header>

    <FuelDashboard v-if="tab === 'dashboard'" :key="auth.activeCompanyId || 'dashboard'" />

    <FuelStationsView v-else-if="tab === 'stations'" class="md:!h-auto md:flex-1" />

    <FuelTransactionImportPanel v-else-if="tab === 'import'" :can-read-gps="canReadGps" :key="auth.activeCompanyId || 'import'" />

    <template v-else-if="tab === 'history'">
      <RouterLink v-if="historyImportId" :to="{ name: 'fuel', query: { tab: 'history' } }" class="ui-body-sm text-ui-text underline">
        Pokaż transakcje ze wszystkich importów
      </RouterLink>
      <FuelTransactionHistory :key="auth.activeCompanyId || 'history'" :import-id="historyImportId" />
    </template>
    <p v-else class="ui-surface p-6 text-ui-mutedText">Brak dostępu do danych paliwowych w aktywnej firmie.</p>
  </main>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconFileUpload as FileUpload, IconGasStation, IconHistory, IconLayoutDashboard } from '@tabler/icons-vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import FuelDashboard from '@/components/fuel/FuelDashboard.vue'
import FuelTransactionHistory from '@/components/fuel/FuelTransactionHistory.vue'
import FuelTransactionImportPanel from '@/components/fuel/FuelTransactionImportPanel.vue'
import { useAuthStore } from '@/stores/authStore'
import { useFuelStationPermissions } from '@/composables/useFuelStationPermissions'

const auth = useAuthStore()
const route = useRoute(), router = useRouter()
const FuelStationsView = defineAsyncComponent(() => import('@/views/FuelStationsView.vue'))
const { canRead: canReadStations } = useFuelStationPermissions()
const has = (permission: string) => Boolean(auth.activeCompanyId && (
  auth.user?.sysAdmin || auth.user?.globalRoles?.includes('GLOBAL_ADMIN')
  || auth.hasActiveCompanyRole('COMPANY_ADMIN') || auth.hasActiveCompanyPermission(permission)
))
const canReadTransactions = computed(() => has('fuel_imports.read'))
const canImport = computed(() => canReadTransactions.value && has('fuel_imports.manage'))
const canReadGps = computed(() => canReadTransactions.value && has('positions.read'))
const historyImportId = computed(() => {
  const value = Number(route.query.importId)
  return Number.isSafeInteger(value) && value > 0 ? value : undefined
})
const tabs = computed(() => [
  ...(canReadTransactions.value ? [
    { value: 'dashboard', label: 'Przegląd', icon: IconLayoutDashboard },
    { value: 'history', label: 'Transakcje', icon: IconHistory },
  ] : []),
  ...(canReadStations.value ? [{ value: 'stations', label: 'Stacje paliw', icon: IconGasStation }] : []),
  ...(canImport.value ? [{ value: 'import', label: 'Importy transakcji', icon: FileUpload }] : []),
])
const tab = computed({
  get: () => tabs.value.find(item => item.value === route.query.tab)?.value ?? tabs.value[0]?.value ?? '',
  set: value => {
    if (value !== tab.value && tabs.value.some(item => item.value === value)) {
      const query = { ...route.query }
      if (value !== 'history') delete query.importId
      void router.push({ name: 'fuel', query: { ...query, tab: value } })
    }
  },
})
</script>
