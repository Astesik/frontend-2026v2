<template>
  <div class="flex shrink-0 flex-col gap-3 border-t border-slate-100 pt-4 dark:border-app-border sm:flex-row sm:items-center sm:justify-between">
    <p class="text-xs text-slate-500 dark:text-slate-400">
      {{ rangeStart }}–{{ rangeEnd }} z {{ total }}
    </p>

    <div class="flex flex-wrap items-center gap-2">
      <div class="flex items-center gap-1">
        <button type="button" :disabled="page <= 1" class="pagination-button" aria-label="Pierwsza strona" @click="goToPage(1)">
          <ChevronsLeft class="h-4 w-4" />
        </button>
        <button type="button" :disabled="page <= 1" class="pagination-button" aria-label="Poprzednia strona" @click="goToPage(page - 1)">
          <ChevronLeft class="h-4 w-4" />
        </button>
        <button
          v-for="pageNumber in visiblePages"
          :key="pageNumber"
          type="button"
          class="pagination-button text-xs font-semibold"
          :class="pageNumber === page ? 'bg-slate-950 text-white dark:bg-slate-100 dark:text-app-dark' : ''"
          :aria-label="`Strona ${pageNumber}`"
          @click="goToPage(pageNumber)"
        >
          {{ pageNumber }}
        </button>
        <button type="button" :disabled="page >= totalPages" class="pagination-button" aria-label="Następna strona" @click="goToPage(page + 1)">
          <ChevronRight class="h-4 w-4" />
        </button>
        <button type="button" :disabled="page >= totalPages" class="pagination-button" aria-label="Ostatnia strona" @click="goToPage(totalPages)">
          <ChevronsRight class="h-4 w-4" />
        </button>
      </div>

      <AppSelect v-model="pageSizeValue" class="w-24" :options="pageSizeOptions" size="sm" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'
import AppSelect, { type AppSelectOption } from './AppSelect.vue'

const props = withDefaults(defineProps<{
  total: number
  page: number
  pageSize: number
  pageSizes?: number[]
}>(), {
  pageSizes: () => [10, 25, 50],
})

const emit = defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const rangeStart = computed(() => props.total ? (props.page - 1) * props.pageSize + 1 : 0)
const rangeEnd = computed(() => Math.min(props.page * props.pageSize, props.total))
const pageSizeOptions = computed<AppSelectOption[]>(() => props.pageSizes.map((size) => ({
  label: `${size} / str.`,
  value: String(size),
})))

const pageSizeValue = computed({
  get: () => String(props.pageSize),
  set: (value: string) => {
    emit('update:pageSize', Number(value))
    emit('update:page', 1)
  },
})

const visiblePages = computed(() => {
  const count = Math.min(5, totalPages.value)
  const start = Math.min(
    Math.max(1, props.page - Math.floor(count / 2)),
    Math.max(1, totalPages.value - count + 1),
  )
  return Array.from({ length: count }, (_, index) => start + index)
})

function goToPage(page: number) {
  emit('update:page', Math.min(Math.max(1, page), totalPages.value))
}

watch(totalPages, (pages) => {
  if (props.page > pages) emit('update:page', pages)
})
</script>

<style scoped>
.pagination-button {
  display: inline-flex;
  height: 2.25rem;
  min-width: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  color: rgb(var(--rw-slate-500));
  transition: background-color 150ms ease, color 150ms ease;
}

.pagination-button:hover:not(:disabled) {
  background: rgb(var(--rw-app-hover));
  color: rgb(var(--rw-app-text));
}

.pagination-button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}
</style>
