<template>
  <div ref="rootElement" class="relative">
    <label v-if="label" :for="inputId" class="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
      {{ label }}
    </label>

    <button
      :id="inputId"
      ref="buttonElement"
      type="button"
      :disabled="disabled"
      class="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white text-left text-slate-950 shadow-sm outline-none transition hover:bg-slate-50 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 dark:border-app-border dark:bg-app-panel dark:text-slate-50 dark:hover:bg-app-elevated dark:focus:border-app-muted dark:focus:ring-app-elevated"
      :class="size === 'sm' ? 'h-9 px-3 text-xs' : 'h-11 px-4 text-sm'"
      @click="toggleOpen"
      @keydown.escape.prevent="isOpen = false"
    >
      <span class="flex min-w-0 items-center gap-2">
        <CalendarDays class="h-4 w-4 shrink-0 text-slate-400" />
        <span class="truncate" :class="modelValue ? '' : 'text-slate-400 dark:text-app-muted'">
          {{ displayValue }}
        </span>
      </span>
      <X
        v-if="modelValue && !disabled"
        class="h-4 w-4 shrink-0 text-slate-400 transition hover:text-slate-950 dark:hover:text-slate-50"
        @click.stop="clearDate"
      />
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="popoverElement"
        class="fixed z-[200] w-72 rounded-2xl border border-slate-200 bg-white p-3 text-sm shadow-sm dark:border-app-border dark:bg-app-panel"
        :style="popoverStyle"
      >
        <div class="mb-3 flex items-center justify-between gap-2">
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-slate-50"
            aria-label="Poprzedni rok"
            @click="changeMonth(-12)"
          >
            <ChevronsLeft class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-slate-50"
            aria-label="Poprzedni miesiąc"
            @click="changeMonth(-1)"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <p class="min-w-0 flex-1 truncate text-center font-semibold capitalize text-slate-950 dark:text-slate-50">{{ monthLabel }}</p>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-slate-50"
            aria-label="Następny miesiąc"
            @click="changeMonth(1)"
          >
            <ChevronRight class="h-4 w-4" />
          </button>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-slate-50"
            aria-label="Następny rok"
            @click="changeMonth(12)"
          >
            <ChevronsRight class="h-4 w-4" />
          </button>
        </div>

        <div class="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase text-slate-400 dark:text-app-muted">
          <span v-for="day in weekDays" :key="day" class="py-1">{{ day }}</span>
        </div>

        <div class="mt-1 grid grid-cols-7 gap-1">
          <button
            v-for="day in calendarDays"
            :key="day.key"
            type="button"
            class="h-8 rounded-xl text-xs font-medium transition"
            :class="dayClasses(day)"
            @click="selectDate(day.date)"
          >
            {{ day.date.getDate() }}
          </button>
        </div>

        <div class="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-app-border">
          <button
            type="button"
            class="rounded-xl px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-slate-50"
            @click="selectDate(new Date())"
          >
            Dzisiaj
          </button>
          <button
            type="button"
            class="rounded-xl px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-950 dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-slate-50"
            @click="clearDate"
          >
            Wyczyść
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { CalendarDays, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from 'lucide-vue-next'

interface CalendarDay {
  date: Date
  key: string
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
}

const props = withDefaults(defineProps<{
  modelValue: string
  label?: string
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}>(), {
  label: undefined,
  placeholder: 'Wybierz datę',
  disabled: false,
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const rootElement = ref<HTMLElement | null>(null)
const buttonElement = ref<HTMLElement | null>(null)
const popoverElement = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const visibleMonth = ref(monthFromValue(props.modelValue))
const popoverStyle = ref<Record<string, string>>({})
const inputId = `date-picker-${Math.random().toString(16).slice(2)}`
const weekDays = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']

const displayValue = computed(() => props.modelValue ? formatDisplayDate(props.modelValue) : props.placeholder)

const monthLabel = computed(() => visibleMonth.value.toLocaleDateString('pl-PL', {
  month: 'long',
  year: 'numeric',
}))

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

function parseDateValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) {
    return null
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

function toDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatDisplayDate(value: string) {
  const date = parseDateValue(value)
  return date ? date.toLocaleDateString('pl-PL') : value
}

function toggleOpen() {
  if (!props.disabled) {
    isOpen.value = !isOpen.value

    if (isOpen.value) {
      void nextTick(updatePopoverPosition)
    }
  }
}

function changeMonth(offset: number) {
  visibleMonth.value = new Date(visibleMonth.value.getFullYear(), visibleMonth.value.getMonth() + offset, 1)
}

function selectDate(date: Date) {
  emit('update:modelValue', toDateValue(date))
  visibleMonth.value = new Date(date.getFullYear(), date.getMonth(), 1)
  isOpen.value = false
}

function clearDate() {
  emit('update:modelValue', '')
  isOpen.value = false
}

function updatePopoverPosition() {
  const rect = buttonElement.value?.getBoundingClientRect()

  if (!rect) {
    return
  }

  const popoverWidth = 288
  const popoverHeight = 356
  const left = Math.min(Math.max(rect.left, 8), window.innerWidth - popoverWidth - 8)
  const hasSpaceBelow = rect.bottom + popoverHeight + 8 <= window.innerHeight
  const top = hasSpaceBelow
    ? rect.bottom + 8
    : Math.max(8, rect.top - popoverHeight - 8)

  popoverStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
  }
}

function dayClasses(day: CalendarDay) {
  if (day.isSelected) {
    return 'bg-slate-950 text-white dark:bg-slate-100 dark:text-app-dark'
  }

  if (!day.isCurrentMonth) {
    return 'text-slate-300 hover:bg-slate-50 dark:text-app-border dark:hover:bg-app-elevated'
  }

  if (day.isToday) {
    return 'border border-slate-300 text-slate-950 hover:bg-slate-50 dark:border-app-muted dark:text-slate-50 dark:hover:bg-app-elevated'
  }

  return 'text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-app-elevated dark:hover:text-slate-50'
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target as Node

  if (!rootElement.value?.contains(target) && !popoverElement.value?.contains(target)) {
    isOpen.value = false
  }
}

watch(() => props.modelValue, (value) => {
  if (value) {
    visibleMonth.value = monthFromValue(value)
  }
})

onMounted(() => document.addEventListener('click', onDocumentClick))
onMounted(() => window.addEventListener('resize', updatePopoverPosition))
onMounted(() => window.addEventListener('scroll', updatePopoverPosition, true))
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  window.removeEventListener('resize', updatePopoverPosition)
  window.removeEventListener('scroll', updatePopoverPosition, true)
})
</script>
