<template>
  <AppCard title="Historia tankowań" compact content-class="!p-0">
    <div class="grid grid-cols-2 items-start gap-3 border-b border-ui-divider p-3 lg:grid-cols-4 xl:grid-cols-[minmax(14rem,2fr)_repeat(4,minmax(0,1fr))]">
      <AppInput
        v-model="search" label="Szukaj" placeholder="Stacja, kod stacji lub rejestracja"
        size="sm" class="col-span-2 min-w-0 lg:col-span-4 xl:col-span-1" clearable :maxlength="120"
      />
      <AppDatePicker v-model="from" size="sm" label="Od" editable class="min-w-0" />
      <AppDatePicker v-model="to" size="sm" label="Do" editable class="min-w-0" :error="dateError || undefined" />
      <AppSelect v-model="fuelType" size="sm" label="Rodzaj paliwa" :options="fuelOptions" class="min-w-0" />
      <AppSelect v-if="canViewVerification" v-model="gpsFilter" size="sm" label="Wynik GPS" :options="gpsOptions" class="min-w-0" />
    </div>
    <p v-if="loading && !rows.length" class="p-4 ui-caption" role="status">Pobieranie tankowań…</p>
    <p v-else-if="!rows.length && !error && !dateError" class="p-4 ui-caption">
      {{ filtered ? 'Brak tankowań pasujących do filtrów.' : 'Brak zapisanych tankowań.' }}
    </p>
    <FuelTransactionTable
      v-if="rows.length" :rows="rows" :can-view-verification="canViewVerification" @verify="selected = $event"
    />
    <FuelTransactionVerificationDialog
      :transaction="canViewVerification ? selected : null" :can-verify="canVerify" @close="selected = null"
    />
    <p v-if="error" class="p-4 ui-error" role="alert">{{ error }}</p>
    <div v-if="hasMore" class="border-t border-ui-divider p-3">
      <AppButton size="sm" variant="secondary" :loading="loading" @click="load('more')">Pokaż kolejne</AppButton>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import FuelTransactionTable from '@/components/fuel/FuelTransactionTable.vue'
import FuelTransactionVerificationDialog from '@/components/fuel/FuelTransactionVerificationDialog.vue'
import { useWorkspacePolling } from '@/composables/useWorkspace'
import { getApiErrorMessage } from '@/services/api'
import { fuelImportService, type FuelHistoryFilters, type FuelTransactionRow } from '@/services/fuelImportService'
import { fuelGpsLabels } from '@/services/fuelVerificationService'
import { useAuthStore } from '@/stores/authStore'

const props = defineProps<{ vehicleId?: number; importId?: number }>()
const auth = useAuthStore()
const hasPermission = (permission: string) => Boolean(auth.activeCompanyId && (
  auth.user?.sysAdmin || auth.user?.globalRoles?.includes('GLOBAL_ADMIN')
  || auth.hasActiveCompanyRole('COMPANY_ADMIN') || auth.hasActiveCompanyPermission(permission)
))
const canViewVerification = computed(() => hasPermission('positions.read'))
const canVerify = computed(() => hasPermission('fuel_imports.manage'))
const selected = ref<FuelTransactionRow | null>(null)
const rows = ref<FuelTransactionRow[]>([])
const nextPage = ref(0)
const loading = ref(false)
const hasMore = ref(false)
const error = ref('')
const search = ref('')
const query = ref('')
const from = ref('')
const to = ref('')
const fuelType = ref('')
const gpsFilter = ref('')
const dateError = computed(() => from.value && to.value && from.value > to.value ? 'Podaj datę równą lub późniejszą od daty „Od”.' : '')
const filtered = computed(() => Boolean(query.value || from.value || to.value || fuelType.value || gpsFilter.value))
const filters = computed<FuelHistoryFilters>(() => ({
  vehicleId: props.vehicleId,
  importId: props.importId,
  gpsStatus: canViewVerification.value ? gpsFilter.value || undefined : undefined,
  q: query.value || undefined,
  from: from.value || undefined,
  to: to.value || undefined,
  fuelType: fuelType.value || undefined,
}))
const fuelOptions = [
  { value: '', label: 'Wszystkie produkty' },
  { value: 'DIESEL', label: 'Olej napędowy' },
  { value: 'ADBLUE', label: 'AdBlue' },
  { value: 'OTHER', label: 'Inne' },
]
const gpsOptions = [
  { value: '', label: 'Wszystkie wyniki' },
  ...Object.entries(fuelGpsLabels).map(([value, label]) => ({ value, label })),
]
let revision = 0

watch(search, (value, _previous, onCleanup) => {
  const timer = window.setTimeout(() => { query.value = value.trim() }, 250)
  onCleanup(() => window.clearTimeout(timer))
})

async function load(mode: 'reset' | 'more' | 'poll') {
  if (mode !== 'reset' && loading.value) return
  const request = ++revision
  const currentFilters = filters.value
  const silent = mode === 'poll'
  if (mode === 'reset') {
    rows.value = []
    hasMore.value = false
    nextPage.value = 0
    loading.value = false
    error.value = ''
  }
  if (dateError.value) return

  if (!silent) {
    loading.value = true
    error.value = ''
  }
  let page = mode === 'more' ? nextPage.value : 0
  const end = silent ? Math.max(1, nextPage.value) : page + 1
  const items = new Map((mode === 'more' ? rows.value : []).map(row => [row.row, row]))
  try {
    let more = true
    while (page < end && more) {
      const result = await fuelImportService.history(page, currentFilters)
      if (request !== revision) return
      for (const row of result.rows) items.set(row.row, row)
      more = result.hasMore
      page++
    }
    rows.value = [...items.values()]
    nextPage.value = page
    hasMore.value = more
    error.value = ''
  } catch (cause) {
    if (request === revision && (!silent || nextPage.value === 0)) error.value = getApiErrorMessage(cause)
  } finally {
    if (request === revision && !silent) loading.value = false
  }
}

watch(filters, () => load('reset'), { immediate: true })
useWorkspacePolling(() => load('poll'), 10_000)
</script>
