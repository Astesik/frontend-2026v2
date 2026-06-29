<template>
  <div class="space-y-6">
    <header>
      <p class="text-sm font-medium text-slate-500 dark:text-slate-400">Analityka</p>
      <h1 class="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">Raporty</h1>
    </header>

    <AppCard title="Filtry raportu" description="Szkielet pod raporty tras, postojow i aktywnosci.">
      <div class="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
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
        <AppButton class="lg:min-w-40" disabled>
          <ChartColumn class="h-4 w-4" />
          Generuj
        </AppButton>
      </div>
    </AppCard>

    <section class="grid gap-4 lg:grid-cols-3">
      <AppCard v-for="report in reports" :key="report.title" compact>
        <p class="text-sm text-slate-500 dark:text-slate-400">{{ report.title }}</p>
        <p class="mt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">{{ report.value }}</p>
        <p class="mt-3 text-sm text-slate-500 dark:text-slate-400">{{ report.caption }}</p>
      </AppCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ChartColumn } from 'lucide-vue-next'
import DriverSelect from '@/components/selects/DriverSelect.vue'
import VehicleSelect from '@/components/selects/VehicleSelect.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { useFleetStore } from '@/stores/fleetStore'

const fleetStore = useFleetStore()

const reports = [
  { title: 'Przebieg dzienny', value: '1 284 km', caption: 'Suma dla aktywnych pojazdow.' },
  { title: 'Czas postoju', value: '6 h 45 min', caption: 'Postoje dluzsze niz 10 minut.' },
  { title: 'Srednie spalanie', value: '24.6 l/100 km', caption: 'Wartosc mockowana dla floty.' },
]

</script>
