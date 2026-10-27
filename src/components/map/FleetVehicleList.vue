<template>
        <div class="rw-list-scroll min-h-0 flex-1 overflow-y-auto" @scroll="$emit('scroll')">
          <table class="w-full table-fixed text-left text-xs">
            <thead class="sticky top-0 z-10 border-b border-slate-200 bg-app-light text-xs uppercase text-slate-500 dark:border-app-border dark:bg-app-dark dark:text-app-muted">
              <tr>
                <th v-if="columns.order" class="w-16 px-2 py-1.5 font-medium">
                  <button type="button" class="inline-flex items-center gap-1 transition hover:text-slate-950 dark:hover:text-slate-50" @click="$emit('sort', 'order')">
                    #
                    <component :is="sortIcon('order')" class="h-3 w-3" />
                  </button>
                </th>
                <th v-if="columns.info" class="px-1.5 py-1.5 font-medium">
                  <button type="button" class="inline-flex items-center gap-1 transition hover:text-slate-950 dark:hover:text-slate-50" @click="$emit('sort', 'plate')">
                    Informacje
                    <component :is="sortIcon('plate')" class="h-3 w-3" />
                  </button>
                </th>
                <th v-if="columns.fuel" class="w-14 px-1.5 py-1.5 font-medium">
                  <button type="button" class="inline-flex items-center gap-1 transition hover:text-slate-950 dark:hover:text-slate-50" @click="$emit('sort', 'fuel')">
                    Paliwo
                    <component :is="sortIcon('fuel')" class="h-3 w-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(vehicle, index) in vehicles"
                :key="vehicle.id"
                tabindex="0"
                class="cursor-pointer border-b border-slate-200 transition hover:bg-white dark:border-app-border dark:hover:bg-app-panel"
                :class="selectedId === vehicle.id ? 'bg-white dark:bg-app-panel' : ''"
                @click="$emit('select', vehicle.id)"
                @keydown.enter.prevent="$emit('select', vehicle.id)"
                @keydown.space.prevent="$emit('select', vehicle.id)"
              >
                <td v-if="columns.order" class="px-2 py-1.5 align-middle">
                  <div class="flex items-center gap-1.5">
                    <span class="w-5 text-slate-500 dark:text-app-muted">{{ index + 1 }}.</span>
                    <slot name="alerts" :vehicle="vehicle" />
                  </div>
                </td>

                <td v-if="columns.info" class="px-1.5 py-1.5 align-middle">
                  <div class="flex min-w-0 items-center gap-1.5">
                    <VehicleTypeIcon
                      :type="vehicle.vehicleType"
                      v-if="row.vehicleIcon"
                      class="h-5 w-5 shrink-0 text-slate-600 dark:text-slate-300"
                    />
                    <img
                      v-if="row.flag"
                      class="h-5 w-5 shrink-0 rounded-full"
                      :src="`https://flagsapi.com/${vehicle.countryCode}/flat/64.png`"
                      alt=""
                      loading="lazy"
                      referrerpolicy="no-referrer"
                    />
                    <div class="vehicle-row-info flex min-w-0 flex-1 items-center gap-1.5">
                      <span class="shrink-0 whitespace-nowrap font-medium leading-none text-slate-950 dark:text-slate-50">
                        {{ vehicle.plateNumber }}
                      </span>
                      <span
                        v-if="showDescriptions && vehicle.description"
                        class="vehicle-description truncate min-w-0 max-w-[5.5rem] flex-1 text-[9px] leading-none text-slate-500 dark:text-app-muted sm:max-w-[8rem]"
                        :title="vehicle.description"
                      >
                        {{ vehicle.description }}
                      </span>
                      <span v-if="row.driver && vehicle.vehicleType !== 'trailer'" class="min-w-0 max-w-[6.5rem] truncate text-[9px] leading-none text-slate-500 dark:text-app-muted">
                        <slot name="driver" :vehicle="vehicle">[{{ vehicle.driverName || '' }}]</slot>
                      </span>
                    </div>
                  </div>
                </td>

                <td v-if="columns.fuel" class="px-1.5 py-1.5 align-middle font-medium text-slate-700 dark:text-slate-200">
                  <slot name="fuel" :vehicle="vehicle">{{ vehicle.fuelPct == null ? '—' : `${Math.round(vehicle.fuelPct)}%` }}</slot>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
</template>
<script setup lang="ts">
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-vue-next'
import VehicleTypeIcon from '@/components/vehicles/VehicleTypeIcon.vue'
import type { Vehicle } from '@/types/fleet'
const props = withDefaults(defineProps<{
  vehicles: Vehicle[]
  selectedId?: string | null
  columns?: { order: boolean; info: boolean; fuel: boolean }
  row?: { flag: boolean; driver: boolean; vehicleIcon: boolean }
  showDescriptions?: boolean
  sortKey?: 'order' | 'plate' | 'fuel'
  sortDirection?: 'asc' | 'desc'
}>(), { selectedId: null, columns: () => ({ order: true, info: true, fuel: true }), row: () => ({ flag: true, driver: true, vehicleIcon: true }), showDescriptions: false, sortKey: 'plate', sortDirection: 'asc' })
defineEmits<{ select: [id: string]; sort: [key: 'order' | 'plate' | 'fuel']; scroll: [] }>()
function sortIcon(key: string) { return props.sortKey !== key ? ArrowUpDown : props.sortDirection === 'asc' ? ArrowUp : ArrowDown }
</script>
