<template>
  <main class="flex min-h-0 min-w-0 flex-col gap-3 md:h-full">
    <header class="shrink-0 space-y-3">
      <h1 class="ui-page-title">Paliwo</h1>
      <AppTabs v-if="tabs.length" v-model="tab" :items="tabs" variant="underline" aria-label="Paliwo" />
    </header>

    <FuelStationsView v-if="tab === 'stations'" class="md:!h-auto md:flex-1" />

    <template v-else-if="tab === 'import'">
      <AppCard title="Import transakcji IDS" :icon="FileUpload" compact>
        <div class="flex flex-wrap items-center gap-3">
          <label class="min-w-0 space-y-1">
            <span class="block text-sm font-medium text-ui-text">Plik CSV z IDS</span>
            <input type="file" accept=".csv,text/csv" class="block max-w-full text-sm text-ui-text" :disabled="!!busy" @change="selectFile" />
          </label>
          <AppButton class="self-end" :disabled="!file || !!busy" :loading="busy === 'preview'" @click="showPreview">
            Sprawdź plik
          </AppButton>
        </div>
        <p v-if="error" class="mt-3 ui-error" role="alert">{{ error }}</p>
        <p v-if="result" class="mt-3 ui-body-sm text-ui-text" role="status">
          Zapisano {{ result.saved }} · Powtórzone wersje {{ result.duplicates }} · Odrzucono {{ result.rejected }}
        </p>
      </AppCard>

      <AppCard v-if="preview" title="Podgląd transakcji" compact content-class="!p-0">
        <template #actions>
          <AppButton size="sm" :disabled="!saveable || !!busy" :loading="busy === 'save'" @click="confirm">
            Zatwierdź import
          </AppButton>
        </template>
        <p class="px-3 py-2 ui-caption" role="status">
          {{ saveable }} do zapisania · {{ preview.rows.length - saveable }} powtórzonych wersji · {{ preview.errors.length }} błędów
        </p>
        <FuelTransactionRows :rows="preview.rows" />
        <details v-if="preview.errors.length" class="space-y-2 border-t border-ui-divider px-3 py-2" open>
          <summary class="cursor-pointer text-sm font-medium text-ui-text">Wiersze pomijane przy zapisie</summary>
          <ul class="space-y-1 text-sm text-ui-text">
            <li v-for="(item, index) in preview.errors" :key="index">
              Wiersz {{ item.line }} · {{ item.column ? item.column + ' · ' : '' }}{{ item.reason }}
            </li>
          </ul>
        </details>
      </AppCard>
    </template>

    <FuelTransactionHistory v-else-if="tab === 'history'" :key="auth.activeCompanyId || 'history'" />
    <p v-else class="ui-surface p-6 text-ui-mutedText">Brak dostępu do danych paliwowych w aktywnej firmie.</p>
  </main>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IconFileUpload as FileUpload, IconGasStation, IconHistory } from '@tabler/icons-vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import FuelTransactionHistory from '@/components/fuel/FuelTransactionHistory.vue'
import FuelTransactionRows from '@/components/fuel/FuelTransactionRows.vue'
import { getApiErrorMessage } from '@/services/api'
import { fuelImportService, type FuelImportPreview, type FuelImportResult } from '@/services/fuelImportService'
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
const tabs = computed(() => [
  ...(canImport.value ? [{ value: 'import', label: 'Importy transakcji', icon: FileUpload }] : []),
  ...(canReadTransactions.value ? [{ value: 'history', label: 'Historia transakcji', icon: IconHistory }] : []),
  ...(canReadStations.value ? [{ value: 'stations', label: 'Stacje paliw', icon: IconGasStation }] : []),
])
const tab = computed({
  get: () => tabs.value.find(item => item.value === route.query.tab)?.value ?? tabs.value[0]?.value ?? '',
  set: value => {
    if (value !== tab.value && tabs.value.some(item => item.value === value)) {
      void router.push({ name: 'fuel', query: { ...route.query, tab: value } })
    }
  },
})
const file = shallowRef<File | null>(null)
const preview = ref<FuelImportPreview | null>(null)
const result = ref<FuelImportResult | null>(null)
const busy = ref<'preview' | 'save' | null>(null)
const error = ref('')
const saveable = computed(() => preview.value?.rows.filter(row => row.status !== 'DUPLICATE').length ?? 0)

watch(() => auth.activeCompanyId, () => {
  file.value = null
  preview.value = null
  result.value = null
  error.value = ''
  busy.value = null
})

function selectFile(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null
  preview.value = null
  result.value = null
  error.value = ''
}

async function showPreview() {
  const selected = file.value
  if (!selected || busy.value) return
  busy.value = 'preview'
  error.value = ''
  preview.value = null
  result.value = null
  try {
    const response = await fuelImportService.preview(selected)
    if (file.value === selected) preview.value = response
  } catch (cause) {
    if (file.value === selected) error.value = getApiErrorMessage(cause)
  } finally {
    if (file.value === selected) busy.value = null
  }
}

async function confirm() {
  const selected = file.value
  if (!selected || !preview.value || !saveable.value || busy.value) return
  busy.value = 'save'
  error.value = ''
  try {
    const response = await fuelImportService.confirm(selected)
    if (file.value === selected) {
      result.value = response
      preview.value = null
    }
  } catch (cause) {
    if (file.value === selected) error.value = getApiErrorMessage(cause)
  } finally {
    if (file.value === selected) busy.value = null
  }
}
</script>
