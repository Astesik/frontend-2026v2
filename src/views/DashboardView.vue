<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Centrum operacyjne</p>
        <h1 class="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">Dashboard floty</h1>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 lg:w-[34rem]">
        <VehicleSelect
          :model-value="fleetStore.selectedVehicleId"
          label="Pojazd"
          @update:model-value="fleetStore.setSelectedVehicle"
        />
        <DriverSelect
          :model-value="fleetStore.selectedDriverId"
          label="Kierowca"
          @update:model-value="fleetStore.setSelectedDriver"
        />
      </div>
    </header>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <AppCard v-for="stat in stats" :key="stat.label" compact>
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-sm text-slate-500 dark:text-slate-400">{{ stat.label }}</p>
            <p class="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{{ stat.value }}</p>
          </div>
          <component :is="stat.icon" class="h-5 w-5 text-slate-400" />
        </div>
      </AppCard>
    </section>

    <section class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <AppCard title="Mapa floty" description="Podglad pozycji GPS i aktywnych pojazdow.">
        <div class="relative h-[26rem] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-app-border dark:bg-app-elevated">
          <div class="absolute inset-0 opacity-70">
            <div class="absolute left-0 top-1/4 h-px w-full bg-slate-300 dark:bg-app-border"></div>
            <div class="absolute left-0 top-2/3 h-px w-full bg-slate-300 dark:bg-app-border"></div>
            <div class="absolute left-1/4 top-0 h-full w-px bg-slate-300 dark:bg-app-border"></div>
            <div class="absolute left-2/3 top-0 h-full w-px bg-slate-300 dark:bg-app-border"></div>
            <div class="absolute -left-16 top-32 h-24 w-[34rem] rotate-12 rounded-full border border-slate-300 dark:border-app-border"></div>
            <div class="absolute left-24 top-8 h-[30rem] w-20 rotate-45 rounded-full border border-slate-300 dark:border-app-border"></div>
          </div>

          <div class="absolute left-[22%] top-[35%] flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-200">
            <Truck class="h-4 w-4" />
            WA 4829P
          </div>
          <div class="absolute right-[18%] top-[50%] flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-200">
            <Truck class="h-4 w-4" />
            PO 19H8C
          </div>
          <div class="absolute bottom-[18%] left-[48%] flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-200">
            <Truck class="h-4 w-4" />
            GD 1204R
          </div>
        </div>
      </AppCard>

      <AppCard title="Ostatnie pozycje GPS" description="Najnowsze punkty telemetryczne.">
        <div class="space-y-4">
          <div v-for="position in fleetStore.positions" :key="position.id" class="border-b border-slate-100 pb-4 last:border-0 last:pb-0 dark:border-app-border">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="font-medium text-slate-950 dark:text-slate-50">{{ position.vehicleName }}</p>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ position.address }}</p>
              </div>
              <AppBadge variant="neutral">{{ position.timestamp }}</AppBadge>
            </div>
            <div class="mt-3 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{{ position.coordinates }}</span>
              <span>•</span>
              <span>{{ position.speed }} km/h</span>
            </div>
          </div>
        </div>
      </AppCard>
    </section>

    <section class="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <AppCard title="Pojazdy" description="Aktualny stan jednostek w trasie.">
        <div class="space-y-3">
          <div v-for="vehicle in visibleVehicles" :key="vehicle.id" class="flex flex-col gap-3 rounded-2xl border border-slate-100 px-4 py-3 dark:border-app-border sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <p class="font-medium text-slate-950 dark:text-slate-50">{{ vehicle.name }}</p>
                <AppBadge :variant="statusVariant(vehicle.status)">{{ statusLabel(vehicle.status) }}</AppBadge>
              </div>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ vehicle.plateNumber }} • {{ vehicle.location }}</p>
            </div>
            <div class="flex shrink-0 items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span>{{ vehicle.speed }} km/h</span>
              <span>{{ vehicle.fuelLevel }}%</span>
              <span>{{ vehicle.lastUpdate }}</span>
            </div>
          </div>
        </div>
      </AppCard>

      <AppCard title="Alerty i aktywnosc" description="Ostatnie zdarzenia operacyjne.">
        <div class="space-y-4">
          <div v-for="alert in fleetStore.alerts" :key="alert.id" class="flex gap-3 border-b border-slate-100 pb-4 last:border-0 last:pb-0 dark:border-app-border">
            <div class="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-app-elevated dark:text-slate-300">
              <Bell class="h-4 w-4" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-3">
                <p class="font-medium text-slate-950 dark:text-slate-50">{{ alert.title }}</p>
                <AppBadge :variant="alert.type">{{ alert.timestamp }}</AppBadge>
              </div>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ alert.description }}</p>
            </div>
          </div>
        </div>
      </AppCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Activity, Bell, CirclePause, Signal, TriangleAlert, Truck } from 'lucide-vue-next'
import DriverSelect from '@/components/selects/DriverSelect.vue'
import VehicleSelect from '@/components/selects/VehicleSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { useFleetStore } from '@/stores/fleetStore'
import type { VehicleStatus } from '@/types/fleet'

const fleetStore = useFleetStore()

const stats = computed(() => [
  { label: 'Pojazdy', value: fleetStore.fleetStats.total, icon: Truck },
  { label: 'W ruchu', value: fleetStore.fleetStats.moving, icon: Activity },
  { label: 'Postoj', value: fleetStore.fleetStats.idle, icon: CirclePause },
  { label: 'Offline', value: fleetStore.fleetStats.offline, icon: Signal },
  { label: 'Alerty', value: fleetStore.fleetStats.alerts, icon: TriangleAlert },
])

const visibleVehicles = computed(() => fleetStore.vehicles.filter((vehicle) => {
  const vehicleMatches = fleetStore.selectedVehicleId === 'all' || vehicle.id === fleetStore.selectedVehicleId
  const driverMatches = fleetStore.selectedDriverId === 'all' || vehicle.driverId === fleetStore.selectedDriverId
  return vehicleMatches && driverMatches
}))

function statusLabel(status: VehicleStatus) {
  const labels: Record<VehicleStatus, string> = {
    moving: 'W ruchu',
    idle: 'Postoj',
    offline: 'Offline',
    service: 'Serwis',
  }

  return labels[status]
}

function statusVariant(status: VehicleStatus) {
  const variants: Record<VehicleStatus, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
    moving: 'success',
    idle: 'info',
    offline: 'error',
    service: 'warning',
  }

  return variants[status]
}
</script>
