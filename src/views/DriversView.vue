<template>
  <div class="space-y-6">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Zespol</p>
        <h1 class="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">Kierowcy</h1>
      </div>
      <div class="flex flex-col gap-3 sm:flex-row">
        <DriverSelect
          class="min-w-72"
          :model-value="fleetStore.selectedDriverId"
          @update:model-value="fleetStore.setSelectedDriver"
        />
        <AppButton variant="secondary" disabled>
          <Plus class="h-4 w-4" />
          Dodaj kierowce
        </AppButton>
      </div>
    </header>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AppCard v-for="driver in drivers" :key="driver.id" compact>
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="font-medium text-slate-950 dark:text-slate-50">{{ driver.name }}</p>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ driver.phone }}</p>
          </div>
          <AppBadge :variant="driverVariant(driver.status)">{{ driverLabel(driver.status) }}</AppBadge>
        </div>
        <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Pojazd: {{ assignedVehicle(driver.assignedVehicleId) }}
        </p>
      </AppCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Plus } from 'lucide-vue-next'
import DriverSelect from '@/components/selects/DriverSelect.vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { useFleetStore } from '@/stores/fleetStore'
import type { Driver } from '@/types/fleet'

const fleetStore = useFleetStore()

const drivers = computed(() => fleetStore.selectedDriverId === 'all'
  ? fleetStore.drivers
  : fleetStore.drivers.filter((driver) => driver.id === fleetStore.selectedDriverId))

function assignedVehicle(vehicleId?: string) {
  return fleetStore.vehicles.find((vehicle) => vehicle.id === vehicleId)?.plateNumber || 'Brak'
}

function driverLabel(status: Driver['status']) {
  return {
    available: 'Dostepny',
    route: 'W trasie',
    break: 'Przerwa',
    offline: 'Offline',
  }[status]
}

function driverVariant(status: Driver['status']) {
  return {
    available: 'success',
    route: 'info',
    break: 'warning',
    offline: 'error',
  }[status] as 'neutral' | 'success' | 'warning' | 'error' | 'info'
}
</script>
