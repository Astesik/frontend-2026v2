<template>
  <div class="min-w-0 space-y-5 lg:flex lg:h-[calc(100dvh-3rem)] lg:min-h-0 lg:flex-col lg:gap-5 lg:space-y-0">
    <header>
      <h1 class="ui-page-title">Strona główna</h1>
    </header>

    <section class="grid gap-3 sm:grid-cols-3">
      <AppCard v-for="metric in metrics" :key="metric.label" compact>
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="ui-label text-ui-text-secondary">{{ metric.label }}</p>
            <p class="mt-2 text-xl font-semibold tabular-nums text-ui-text">{{ metric.value }}</p>
          </div>
          <component :is="metric.icon" class="h-5 w-5 shrink-0 text-ui-icon" />
        </div>
      </AppCard>
    </section>

    <AppCard :title="`Statystyki dzienne - ${statistics.vehicles.length} pojazdów`" :icon="ChartNoAxesCombined" compact class="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden" content-class="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      <template #actions>
        <AppIconButton label="Odśwież statystyki" :loading="statistics.isLoading" :disabled="!canReadStatistics" @click="refresh">
          <RefreshCw class="h-4 w-4" />
        </AppIconButton>
      </template>
      <p v-if="!canReadStatistics" class="py-8 text-center ui-body-sm text-ui-mutedText">Statystyki dzienne nie są dostępne dla tej sesji.</p>
      <div v-else-if="statistics.isLoading && !statistics.data" class="flex items-center justify-center gap-2 py-12 ui-body-sm text-ui-mutedText" role="status"><LoaderCircle class="h-4 w-4 animate-spin" />Pobieranie statystyk...</div>
      <div v-else-if="statistics.error && !statistics.data" class="py-8 text-center">
        <p class="ui-body-sm text-danger-600 dark:text-danger-400" role="alert">{{ statistics.error }}</p>
        <AppButton class="mt-3" size="sm" variant="secondary" @click="refresh"><RefreshCw class="h-3.5 w-3.5" />Spróbuj ponownie</AppButton>
      </div>
      <template v-else-if="statistics.data">
        <p v-if="statistics.error" class="mb-3 ui-body-sm text-warning-600 dark:text-warning-400" role="alert">Nie udało się odświeżyć danych. Wyświetlane są ostatnio pobrane wyniki.</p>
        <DailyVehicleStatisticsTable :key="statistics.companyId || ''" class="lg:min-h-0 lg:flex-1" :vehicles="statistics.vehicles" :timezone="statistics.data.timezone" :can-read-vehicles="canReadVehicles" />
      </template>
    </AppCard>

  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { ChartNoAxesCombined, Fuel, Gauge, LoaderCircle, RefreshCw, Route } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import DailyVehicleStatisticsTable from '@/components/statistics/DailyVehicleStatisticsTable.vue'
import { useAuthStore } from '@/stores/authStore'
import { useDailyStatisticsStore } from '@/stores/dailyStatisticsStore'
import { formatStatisticsMetric } from '@/utils/dailyStatistics'

const authStore = useAuthStore()
const statistics = useDailyStatisticsStore()
const canReadStatistics = computed(() => Boolean(authStore.isAuthenticated && authStore.activeCompanyId && (authStore.canManageCompany || authStore.hasActiveCompanyPermission('positions.read'))))
const canReadVehicles = computed(() => authStore.canManageCompany || authStore.hasActiveCompanyPermission('vehicles.read'))
const metrics = computed(() => {
  const rows = statistics.vehicles
  const distances = rows.filter((row) => row.distanceKm != null)
  const fuels = rows.filter((row) => row.fuelUsedLiters != null)
  const paired = rows.filter((row) => row.distanceKm != null && row.distanceKm > 0 && row.fuelUsedLiters != null && row.averageFuelConsumptionLPer100Km != null)
  const pairedDistance = paired.reduce((sum, row) => sum + row.distanceKm!, 0)
  const pairedFuel = paired.reduce((sum, row) => sum + row.fuelUsedLiters!, 0)
  return [
    { label: 'Przejechane kilometry', value: formatStatisticsMetric(distances.length ? distances.reduce((sum, row) => sum + row.distanceKm!, 0) : null, 'km', 2), icon: Route },
    { label: 'Zużyte paliwo', value: formatStatisticsMetric(fuels.length ? fuels.reduce((sum, row) => sum + row.fuelUsedLiters!, 0) : null, 'l'), icon: Fuel },
    { label: 'Średnie spalanie floty', value: formatStatisticsMetric(pairedDistance > 0 ? pairedFuel / pairedDistance * 100 : null, 'l/100 km', 2), icon: Gauge },
  ]
})

let timer: ReturnType<typeof setTimeout> | null = null
let mounted = false
let viewGeneration = 0

function stopTimer() {
  if (timer != null) clearTimeout(timer)
  timer = null
}

async function refresh() {
  stopTimer()
  if (!canReadStatistics.value || !authStore.activeCompanyId || document.hidden) return
  const currentGeneration = viewGeneration
  await statistics.load(authStore.activeCompanyId)
  if (mounted && currentGeneration === viewGeneration && canReadStatistics.value && !document.hidden) {
    stopTimer()
    timer = setTimeout(() => { void refresh() }, 30_000)
  }
}

function visibilityChanged() {
  stopTimer()
  if (!document.hidden) void refresh()
}

watch([() => authStore.activeCompanyId, canReadStatistics], () => {
  viewGeneration += 1
  stopTimer()
  statistics.resetApiState()
  if (mounted) void refresh()
})

onMounted(() => {
  mounted = true
  document.addEventListener('visibilitychange', visibilityChanged)
  void refresh()
})
onBeforeUnmount(() => {
  mounted = false
  viewGeneration += 1
  stopTimer()
  document.removeEventListener('visibilitychange', visibilityChanged)
})
</script>
