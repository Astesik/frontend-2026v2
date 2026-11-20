<template>
  <div class="tank-diagram" role="group" aria-label="Poziomy paliwa w zbiornikach">
    <div v-if="connected" class="tank-connection" aria-hidden="true"></div>

    <div
      v-for="{ slot, label, tank } in tankPanels" :key="slot" class="fuel-tank"
      :class="[`fuel-tank-${slot.toLowerCase()}`, { 'fuel-tank-empty': !tank }]" :aria-label="label"
    >
      <div
        v-if="tank?.percent != null" class="tank-fill" aria-hidden="true"
        :style="{ height: `${tank.percent}%` }"
      ></div>
      <div class="tank-content">
        <p class="tank-label">{{ label }}</p>
        <template v-if="tank">
          <p v-if="tank.estimatedLiters != null" class="tank-liters">{{ liters.format(tank.estimatedLiters) }} <span>L</span></p>
          <p v-else class="tank-unavailable">Brak odczytu</p>
          <p class="tank-capacity" title="Pojemność nominalna" :aria-label="`Pojemność ${capacity.format(tank.nominalCapacityLiters)} L`">
            {{ capacity.format(tank.nominalCapacityLiters) }} L
          </p>
        </template>
        <p v-else class="tank-unavailable">Brak danych</p>
      </div>
    </div>

    <div class="fuel-total" :title="connected ? 'Szacunek zakłada wyrównany poziom paliwa w połączonych zbiornikach.' : 'Szacowana ilość oleju napędowego.'">
      <p class="text-[9px] font-semibold uppercase leading-tight tracking-wide text-ui-mutedText">Suma ON</p>
      <p v-if="levels.totalLiters != null" class="total-liters">{{ liters.format(levels.totalLiters) }} <span>L</span></p>
      <p v-else class="mt-1 text-[10px] text-ui-mutedText">Brak odczytu</p>
      <p v-if="levels.totalLiters != null && observation?.percent != null" class="text-[10px] leading-tight tabular-nums text-ui-mutedText">{{ capacity.format(observation.percent) }}%</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FuelTankObservation, FuelTankProfile, FuelTankSlot } from '@/services/fuelTankService'
import { estimateFuelTankLevels } from '@/utils/fuelTanks'

const props = defineProps<{ profile: FuelTankProfile | null; observation: FuelTankObservation | null }>()
const slots: FuelTankSlot[] = ['LEFT', 'RIGHT', 'ADBLUE']
const labels = { LEFT: 'Lewy zbiornik', RIGHT: 'Prawy zbiornik', ADBLUE: 'AdBlue' }
const liters = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 })
const capacity = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 })
const levels = computed(() => estimateFuelTankLevels(props.profile, props.observation))
const tankPanels = computed(() => slots.map(slot => ({
  slot,
  label: labels[slot],
  tank: levels.value.tanks.find(tank => tank.slot === slot),
})))
const connected = computed(() => props.profile != null && props.profile.connection !== 'SEPARATE')
</script>

<style scoped>
.tank-diagram {
  position: relative;
  isolation: isolate;
  width: 100%;
  min-height: 0;
  flex: 1;
}
.tank-connection {
  position: absolute;
  top: 47%;
  left: 28%;
  right: 28%;
  height: 3px;
  background: rgb(var(--rw-border-strong));
}
.fuel-tank {
  position: absolute;
  top: 3%;
  width: 29%;
  height: 94%;
  overflow: hidden;
  border: 1px solid rgb(var(--rw-border-strong));
  border-radius: 8px;
  background: rgb(var(--rw-surface-muted));
}
.fuel-tank-left { left: 1%; }
.fuel-tank-right { right: 1%; }
.fuel-tank-adblue { top: 55%; left: 32%; width: 36%; height: 43%; border-color: #0ea5e9; background: rgb(14 165 233 / 0.07); }
.fuel-tank-empty { border-style: dashed; }
.tank-fill {
  position: absolute;
  inset: auto 0 0;
  border-top: 1px solid rgb(16 185 129 / 0.6);
  background: rgb(16 185 129 / 0.18);
  transition: height 500ms ease;
}
.tank-content {
  position: relative;
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 4px;
  text-align: center;
}
.tank-label { @apply text-[9px] font-semibold uppercase leading-tight tracking-wide text-ui-text; }
.tank-liters { @apply whitespace-nowrap text-lg font-semibold leading-tight tabular-nums text-ui-text; }
.tank-liters span { @apply text-xs font-medium; }
.tank-capacity, .tank-unavailable { @apply text-[10px] leading-tight text-ui-mutedText; }
.tank-capacity { @apply whitespace-nowrap tabular-nums; }
.fuel-total {
  position: absolute;
  top: 5%;
  left: 32%;
  right: 32%;
  padding: 2px;
  border-radius: 8px;
  background: rgb(var(--rw-surface));
  text-align: center;
}
.total-liters { @apply whitespace-nowrap text-2xl font-semibold leading-tight tracking-tight tabular-nums text-ui-text; }
.total-liters span { @apply text-xs font-medium; }
@media (prefers-reduced-motion: reduce) {
  .tank-fill { transition: none; }
}
</style>
