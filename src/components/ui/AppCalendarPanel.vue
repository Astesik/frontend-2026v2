<template>
  <div class="w-72 max-w-full text-sm text-ui-text">
    <div class="mb-3 grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-1.5">
      <AppIconButton label="Poprzedni rok" size="sm" @click="changeMonth(-12)"><ChevronsLeft class="h-4 w-4" /></AppIconButton>
      <AppIconButton label="Poprzedni miesiąc" size="sm" @click="changeMonth(-1)"><ChevronLeft class="h-4 w-4" /></AppIconButton>
      <p class="min-w-0 truncate text-center text-xs font-semibold capitalize text-ui-text">{{ monthLabel }}</p>
      <AppIconButton label="Następny miesiąc" size="sm" @click="changeMonth(1)"><ChevronRight class="h-4 w-4" /></AppIconButton>
      <AppIconButton label="Następny rok" size="sm" @click="changeMonth(12)"><ChevronsRight class="h-4 w-4" /></AppIconButton>
    </div>

    <div class="grid grid-cols-7 gap-1 text-center ui-caption" aria-hidden="true">
      <span v-for="day in weekDays" :key="day" class="py-1">{{ day }}</span>
    </div>

    <div class="mt-1 grid grid-cols-7 gap-1" role="grid" :aria-label="monthLabel">
      <button
        v-for="(day, index) in calendarDays"
        :key="day.key"
        type="button"
        role="gridcell"
        class="h-8 rounded-[var(--rw-radius-item)] text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-ui-focus"
        :class="dayClasses(day)"
        :aria-label="day.date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })"
        :aria-selected="day.isSelected"
        @click="selectDate(day.date)"
        @keydown="handleDayKeydown($event, index)"
      >
        {{ day.date.getDate() }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'
import AppIconButton from './AppIconButton.vue'
import { parseDateValue, toDateValue } from '@/utils/date'

interface CalendarDay {
  date: Date
  key: string
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
}

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ select: [value: string] }>()
const weekDays = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']
const visibleMonth = ref(monthFromValue(props.modelValue))
const monthLabel = computed(() => visibleMonth.value.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }))

const calendarDays = computed<CalendarDay[]>(() => {
  const year = visibleMonth.value.getFullYear()
  const month = visibleMonth.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const offset = (firstDay.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)
  const todayKey = toDateValue(new Date())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const key = toDateValue(date)
    return {
      date,
      key,
      isCurrentMonth: date.getMonth() === month,
      isToday: key === todayKey,
      isSelected: key === props.modelValue,
    }
  })
})

function monthFromValue(value: string) {
  const date = parseDateValue(value) || new Date()
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function changeMonth(offset: number) {
  visibleMonth.value = new Date(visibleMonth.value.getFullYear(), visibleMonth.value.getMonth() + offset, 1)
}

function selectDate(date: Date) {
  emit('select', toDateValue(date))
}

function dayClasses(day: CalendarDay) {
  if (day.isSelected) return 'bg-ui-text text-ui-surface'
  if (!day.isCurrentMonth) return 'text-ui-disabled-text hover:bg-ui-dropdown-hover'
  if (day.isToday) return 'border border-ui-border-strong text-ui-text hover:bg-ui-dropdown-hover'
  return 'text-ui-text-secondary hover:bg-ui-dropdown-hover hover:text-ui-text'
}

function handleDayKeydown(event: KeyboardEvent, index: number) {
  const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
  const offset = offsets[event.key]
  if (!offset) return
  event.preventDefault()
  const buttons = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('[role="gridcell"]')
  buttons?.[Math.min(Math.max(0, index + offset), calendarDays.value.length - 1)]?.focus()
}

watch(() => props.modelValue, (value) => {
  if (value) visibleMonth.value = monthFromValue(value)
})
</script>
