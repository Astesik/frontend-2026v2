<template>
  <section class="min-w-0 space-y-3 md:min-h-0 md:overflow-y-auto">
    <div class="grid gap-3 sm:grid-cols-2">
      <AppCard v-for="tile in tiles" :key="tile.label" compact>
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border" :class="tile.tone">
            <component :is="tile.icon" class="h-5 w-5" aria-hidden="true" />
          </div>
          <div class="min-w-0">
            <h2 class="ui-body-sm text-ui-mutedText">{{ tile.label }}</h2>
            <p class="text-2xl font-semibold tabular-nums text-ui-text">{{ tile.value == null ? '—' : number.format(tile.value) }}</p>
          </div>
        </div>
      </AppCard>
    </div>

    <AppCard title="Dzienna ilość tankowanego paliwa" :icon="IconChartBar" compact>
      <p v-if="error" class="ui-error" role="alert">{{ error }}</p>
      <p v-else-if="loading" class="ui-caption" role="status">Pobieranie podsumowania…</p>
      <p v-else-if="!dailyWithVolume" class="ui-empty-state">Brak zatankowanych litrów oleju napędowego lub AdBlue w ostatnich 14 dniach.</p>
      <FuelVolumeChart v-else :daily="dailyWithVolume" />
    </AppCard>
  </section>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watchEffect } from 'vue'
import { IconAlertTriangle, IconChartBar, IconReceipt } from '@tabler/icons-vue'
import AppCard from '@/components/ui/AppCard.vue'
import { getApiErrorMessage } from '@/services/api'
import { fuelImportService, type FuelDashboard } from '@/services/fuelImportService'

const FuelVolumeChart = defineAsyncComponent(() => import('./FuelVolumeChart.vue'))

const summary = ref<FuelDashboard | null>(null)
const loading = ref(false)
const error = ref('')
const number = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 })

const tiles = computed(() => [
  {
    label: 'Liczba transakcji', value: summary.value?.transactions, icon: IconReceipt,
    tone: 'border-info-100 bg-info-50 text-info-600 dark:border-info-400/30 dark:bg-info-400/15 dark:text-info-400',
  },
  {
    label: 'Transakcje do weryfikacji', value: summary.value?.toVerify, icon: IconAlertTriangle,
    tone: 'border-warning-100 bg-warning-50 text-warning-600 dark:border-warning-400/30 dark:bg-warning-400/15 dark:text-warning-400',
  },
])
const dailyWithVolume = computed(() => {
  const daily = summary.value?.daily
  return daily?.some(day => day.dieselLiters !== 0 || day.adBlueLiters !== 0) ? daily : undefined
})

watchEffect(async (onCleanup) => {
  let active = true
  onCleanup(() => { active = false })
  loading.value = true
  error.value = ''
  summary.value = null
  try {
    const result = await fuelImportService.dashboard(14)
    if (active) summary.value = result
  } catch (cause) {
    if (active) error.value = getApiErrorMessage(cause)
  } finally {
    if (active) loading.value = false
  }
})
</script>
