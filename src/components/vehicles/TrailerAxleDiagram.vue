<template>
  <div class="trailer-monitor">
    <div class="diagram-layout">
      <div class="diagram-visual min-w-0">
        <div class="mb-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-ui-mutedText">
          <span v-for="status in statuses" :key="status" class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-sm" :class="legendClasses[status]" />{{ liningStatusLabels[status] }}</span>
        </div>
        <svg viewBox="0 0 380 390" class="diagram-svg mx-auto block w-full max-w-[380px]" role="group" :aria-labelledby="`${diagramId}-title`">
          <title :id="`${diagramId}-title`">Naczepa trzyosiowa — stan okładzin i ciśnienie opon</title>
          <text x="190" y="14" text-anchor="middle" class="diagram-caption">PRZÓD</text>
          <path d="M190 20v9m-4-5 4-4 4 4" class="diagram-outline" fill="none" />
          <rect x="138" y="34" width="104" height="330" rx="8" class="trailer-body" />
          <rect x="146" y="43" width="88" height="311" rx="4" class="diagram-outline" fill="none" />
          <path d="M153 56h74M153 342h74M190 77v98" class="diagram-outline" fill="none" stroke-dasharray="4 5" />
          <rect x="180" y="52" width="20" height="12" rx="3" class="trailer-coupling" />
          <text x="190" y="135" text-anchor="middle" class="diagram-caption">NACZEPA</text>
          <text x="190" y="151" text-anchor="middle" class="diagram-small">3 osie</text>
          <text x="79" y="182" text-anchor="middle" class="diagram-small">Stan / bar</text>
          <text x="301" y="182" text-anchor="middle" class="diagram-small">Stan / bar</text>
          <g v-for="axle in [1, 2, 3]" :key="`axle-${axle}`" :data-axle="axle">
            <path :d="`M132 ${axleY(axle)}H248`" class="axle-beam" />
            <circle cx="190" :cy="axleY(axle)" r="8" class="axle-hub" />
            <text x="190" :y="axleY(axle) + 3.5" text-anchor="middle" class="diagram-small">{{ axle }}</text>
          </g>
          <g v-for="(wheel, index) in normalizedWheels" :key="wheel.id" :data-wheel-id="wheel.id" role="button" tabindex="0" class="wheel-hit cursor-pointer" :class="[`wheel-${liningStatus(wheel.liningRemainingPct)}`, selectedWheelId === wheel.id ? 'wheel-selected' : '']" :aria-pressed="selectedWheelId === wheel.id" :aria-label="wheelTooltip(wheel)" @click="emit('select-wheel', wheel.id)" @keydown="handleWheelKey($event, index)">
            <title>{{ wheelTooltip(wheel) }}</title>
            <rect :x="wheel.side === 'left' ? 48 : 270" :y="axleY(wheel.axle) - 28" width="62" height="56" rx="5" class="wheel-focus-outline" fill="none" />
            <rect :x="wheel.side === 'left' ? 54 : 276" :y="axleY(wheel.axle) - 25" width="50" height="50" rx="4" class="wheel-indicator" />
            <text :x="wheel.side === 'left' ? 79 : 301" :y="axleY(wheel.axle) - 3" text-anchor="middle" class="wheel-percent">{{ liningPercentLabel(wheel.liningRemainingPct) }}</text>
            <text :x="wheel.side === 'left' ? 79 : 301" :y="axleY(wheel.axle) + 14" text-anchor="middle" class="wheel-pressure">{{ pressureLabel(wheel.pressureBar) }}</text>
            <path :d="wheel.side === 'left' ? `M111 ${axleY(wheel.axle)}h10` : `M259 ${axleY(wheel.axle)}h10`" class="diagram-outline" />
            <rect :x="wheel.side === 'left' ? 122 : 242" :y="axleY(wheel.axle) - 17" width="16" height="34" rx="4" class="wheel-tyre" />
            <path v-for="line in [-9, -3, 3, 9]" :key="line" :d="`M${wheel.side === 'left' ? 126 : 246} ${axleY(wheel.axle) + line}h8`" class="wheel-tread" />
          </g>
        </svg>
      </div>
      <aside class="wheel-details min-w-0" aria-live="polite" :aria-label="wheelLabel(selected.axle, selected.side)">
        <div class="flex flex-wrap items-center justify-between gap-2"><h3 class="ui-card-title">{{ wheelLabel(selected.axle, selected.side) }}</h3><AppBadge :variant="badgeVariant">{{ liningStatusLabels[selectedStatus] }}</AppBadge></div>
        <div class="my-3"><p class="ui-caption">Stan okładzin</p><p class="wheel-state-value mt-1 text-3xl font-semibold tabular-nums text-ui-text">{{ liningPercentLabel(selected.liningRemainingPct) }}</p><div class="mt-3 h-1.5 overflow-hidden rounded-full bg-ui-muted" role="meter" aria-label="Stan okładzin" :aria-valuenow="selected.liningRemainingPct ?? undefined" :aria-valuetext="selected.liningRemainingPct === null ? 'Brak danych' : undefined" aria-valuemin="0" aria-valuemax="100"><div v-if="selected.liningRemainingPct !== null" class="h-full rounded-full transition-[width]" :class="legendClasses[selectedStatus]" :style="{width: `${selected.liningRemainingPct}%`}" /></div></div>
        <dl class="divide-y divide-ui-divider text-sm">
          <div class="flex justify-between gap-3 py-2"><dt class="text-ui-mutedText">Ciśnienie opony</dt><dd class="font-semibold tabular-nums text-ui-text">{{ pressureLabel(selected.pressureBar) }}</dd></div>
          <div class="space-y-1 py-2"><dt class="text-ui-mutedText">Ostatni odczyt</dt><dd class="font-medium tabular-nums text-ui-text">{{ wheelReadingTime(selected.lastReadAt) }}</dd></div>
        </dl>
      </aside>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, useId } from 'vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import { liningStatus, liningStatusLabels, liningPercentLabel, normalizeWheelReadings, pressureLabel, wheelLabel, wheelReadingTime } from '@/utils/vehicleMaintenance'
import type { LiningStatus, TrailerWheelReading, WheelId } from '@/types/vehicleMaintenance'
const props = defineProps<{ wheels: readonly TrailerWheelReading[]; selectedWheelId: WheelId }>()
const emit = defineEmits<{ 'select-wheel': [id: WheelId] }>()
const diagramId = useId()
const statuses: LiningStatus[] = ['ok', 'warning', 'alarm', 'unknown']
const legendClasses: Record<LiningStatus, string> = { ok: 'bg-success-500', warning: 'bg-warning-400', alarm: 'bg-danger-500', unknown: 'bg-ui-icon' }
const normalizedWheels = computed(() => normalizeWheelReadings(props.wheels))
const selected = computed(() => normalizedWheels.value.find(wheel => wheel.id === props.selectedWheelId) || normalizedWheels.value[0])
const selectedStatus = computed(() => liningStatus(selected.value.liningRemainingPct))
const badgeVariant = computed(() => ({ ok: 'success', warning: 'warning', alarm: 'error', unknown: 'neutral' } as const)[selectedStatus.value])
function axleY(axle: number) { return 212 + (axle - 1) * 58 }
function wheelTooltip(wheel: TrailerWheelReading) {
  return `${wheelLabel(wheel.axle, wheel.side)}. ${liningStatusLabels[liningStatus(wheel.liningRemainingPct)]}. Stan okładzin: ${liningPercentLabel(wheel.liningRemainingPct)}. Ciśnienie: ${pressureLabel(wheel.pressureBar)}. Odczyt: ${wheelReadingTime(wheel.lastReadAt)}.`
}
function handleWheelKey(event: KeyboardEvent, index: number) {
  const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -2, ArrowDown: 2 }
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? 5 : event.key in offsets ? Math.max(0, Math.min(5, index + offsets[event.key])) : index
  if (!['Enter', ' ', 'Home', 'End', ...Object.keys(offsets)].includes(event.key)) return
  event.preventDefault(); emit('select-wheel', normalizedWheels.value[next].id)
  const svg = (event.currentTarget as SVGGElement).ownerSVGElement
  svg?.querySelectorAll<SVGGElement>('[data-wheel-id]')[next]?.focus()
}
</script>
<style scoped>
.trailer-monitor { container-type: inline-size; }
.diagram-layout { display: grid; gap: 1rem; }
.wheel-details { border-top: 1px solid rgb(var(--rw-divider)); padding-top: 1rem; }
@container (min-width: 32rem) { .diagram-layout { grid-template-columns: minmax(0, 1.35fr) minmax(10rem, 1fr); align-items: center; } .wheel-details { border-top: 0; border-left: 1px solid rgb(var(--rw-divider)); padding-top: 0; padding-left: 1rem; } }
@media (min-width: 1024px) {
  .trailer-monitor, .diagram-layout { height: 100%; min-height: 0; }
  .diagram-layout { overflow-y: auto; }
  .diagram-visual { display: flex; flex-direction: column; min-height: 0; height: 100%; }
  .diagram-visual > div { flex-shrink: 0; }
  .diagram-svg { min-height: 0; flex: 1; height: 100%; }
  .wheel-details { max-height: 100%; overflow-y: auto; }
}
.trailer-body { fill: rgb(var(--rw-surface-muted)); stroke: rgb(var(--rw-border-strong)); stroke-width: 1.5; }
.diagram-outline { stroke: rgb(var(--rw-border-strong)); stroke-width: 1.5; }
.trailer-coupling, .axle-hub { fill: rgb(var(--rw-surface)); stroke: rgb(var(--rw-border-strong)); }
.diagram-caption { fill: rgb(var(--rw-text-muted)); font-size: 10px; font-weight: 600; }
.diagram-small { fill: rgb(var(--rw-text-muted)); font-size: 10px; }
.axle-beam { stroke: rgb(var(--rw-icon)); stroke-width: 4; stroke-linecap: round; }
.wheel-tyre { fill: rgb(var(--rw-text-secondary)); stroke: rgb(var(--rw-text-primary)); stroke-width: 1; }
.wheel-tread { stroke: rgb(var(--rw-surface)); stroke-width: 1; opacity: .55; }
.wheel-indicator { fill: rgb(var(--wheel-color) / .13); stroke: rgb(var(--wheel-color)); stroke-width: 1.5; }
.wheel-percent { fill: rgb(var(--wheel-color)); font-size: 17px; font-weight: 700; }
.wheel-pressure { fill: rgb(var(--rw-text-primary)); font-size: 11px; font-weight: 500; }
.wheel-ok { --wheel-color: var(--rw-success-600); }
.wheel-warning { --wheel-color: var(--rw-warning-600); }
.wheel-alarm { --wheel-color: var(--rw-danger-600); }
.wheel-unknown { --wheel-color: var(--rw-icon); }
:global(.dark .wheel-ok) { --wheel-color: var(--rw-success-400); }
:global(.dark .wheel-warning) { --wheel-color: var(--rw-warning-400); }
:global(.dark .wheel-alarm) { --wheel-color: var(--rw-danger-400); }
.wheel-focus-outline { stroke: transparent; stroke-width: 1.5; }
.wheel-hit:hover .wheel-focus-outline, .wheel-selected .wheel-focus-outline { stroke: rgb(var(--rw-icon)); }
.wheel-hit:focus { outline: none; }
.wheel-hit:focus-visible .wheel-focus-outline { stroke: rgb(var(--rw-text-primary)); stroke-width: 2.5; }
</style>
