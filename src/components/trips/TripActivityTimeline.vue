<template>
  <div class="min-w-[720px]">
    <div class="grid grid-cols-[7rem_minmax(0,1fr)] items-end gap-3 border-b border-ui-divider pb-2">
      <span class="ui-caption">Dzień</span>
      <div class="grid grid-cols-9 text-[10px] text-ui-mutedText">
        <span v-for="hour in hourLabels" :key="hour" :class="hour === 24 ? 'text-right' : ''">{{ padHour(hour) }}</span>
      </div>
    </div>

    <div class="divide-y divide-ui-divider">
      <div v-for="day in normalizedDays" :key="day.date" class="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 py-2.5">
        <div>
          <p class="text-xs font-semibold text-ui-text">{{ formatDay(day.date) }}</p>
          <p class="ui-caption">{{ formatDate(day.date) }}</p>
        </div>
        <div class="relative h-8 overflow-hidden rounded-[6px] border border-ui-border bg-ui-muted">
          <span v-for="line in 7" :key="line" class="absolute inset-y-0 w-px bg-ui-divider" :style="{ left: `${line * 12.5}%` }"></span>
          <div
            v-for="(activity, index) in day.activities"
            :key="`${day.date}-${index}`"
            class="absolute inset-y-1 flex min-w-[3px] items-center justify-center overflow-hidden rounded-[3px] text-white shadow-soft"
            :class="activityClass(activity.type)"
            :style="activityStyle(activity.startHour, activity.endHour)"
            :title="activityTitle(activity)"
          >
            <component :is="activityIcon(activity.type)" v-if="activity.endHour - activity.startHour >= 0.8" class="h-3 w-3 shrink-0" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CarFront, Hammer, Pause } from 'lucide-vue-next'
import type { TripActivityDay, TripActivityType } from '@/stores/tripStore'

const props = defineProps<{ days: TripActivityDay[] }>()
const hourLabels = [0, 3, 6, 9, 12, 15, 18, 21, 24]

const fallbackDays: TripActivityDay[] = Array.from({ length: 5 }, (_, index) => ({
  date: new Date(2026, 7, 25 + index).toISOString().slice(0, 10),
  activities: [
    { type: 'rest', startHour: 0, endHour: 6 + index * 0.2 },
    { type: 'work', startHour: 6 + index * 0.2, endHour: 7 + index * 0.2 },
    { type: 'drive', startHour: 7 + index * 0.2, endHour: 11.3 + index * 0.2 },
    { type: 'rest', startHour: 11.3 + index * 0.2, endHour: 12.05 + index * 0.2 },
    { type: 'drive', startHour: 12.05 + index * 0.2, endHour: 16.1 + index * 0.2 },
    { type: 'rest', startHour: 16.1 + index * 0.2, endHour: 24 },
  ],
}))

const normalizedDays = computed(() => props.days.length ? props.days : fallbackDays)

function padHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`
}

function formatDay(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('pl-PL', { weekday: 'short' })
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })
}

function activityClass(type: TripActivityType) {
  if (type === 'drive') return 'bg-danger-500'
  if (type === 'work') return 'bg-[#93633f]'
  return 'bg-info-600'
}

function activityIcon(type: TripActivityType) {
  if (type === 'drive') return CarFront
  if (type === 'work') return Hammer
  return Pause
}

function activityLabel(type: TripActivityType) {
  if (type === 'drive') return 'Jazda'
  if (type === 'work') return 'Inna praca'
  return 'Pauza'
}

function activityStyle(startHour: number, endHour: number) {
  return {
    left: `${(startHour / 24) * 100}%`,
    width: `${((endHour - startHour) / 24) * 100}%`,
  }
}

function activityTitle(activity: { type: TripActivityType; startHour: number; endHour: number }) {
  const format = (value: number) => `${String(Math.floor(value)).padStart(2, '0')}:${String(Math.round((value % 1) * 60)).padStart(2, '0')}`
  return `${activityLabel(activity.type)} · ${format(activity.startHour)}–${format(activity.endHour)}`
}
</script>
