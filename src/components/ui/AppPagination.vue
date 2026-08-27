<template>
  <div class="flex shrink-0 flex-col gap-3 border-t border-ui-divider pt-4 sm:flex-row sm:items-center sm:justify-between">
    <p class="ui-caption tabular-nums">
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
          :class="pageNumber === page ? '!border-ui-text !bg-ui-text !text-ui-surface' : ''"
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

      <AppSelect
        v-model="pageSizeValue"
        class="page-size-select w-20 shrink-0"
        :options="pageSizeOptions"
        size="sm"
        title="Liczba wyników na stronę"
      />
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
  label: String(size),
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
  border: 1px solid rgb(var(--rw-border));
  border-radius: var(--rw-radius-control);
  background: rgb(var(--rw-surface));
  color: rgb(var(--rw-text-muted));
  box-shadow: var(--rw-shadow-sm);
  transition: border-color 150ms ease, background-color 150ms ease, color 150ms ease;
}

.pagination-button:hover:not(:disabled) {
  border-color: rgb(var(--rw-border-strong));
  background: rgb(var(--rw-surface-hover));
  color: rgb(var(--rw-text-primary));
}

.pagination-button:disabled {
  cursor: not-allowed;
  background: rgb(var(--rw-disabled-background));
  color: rgb(var(--rw-disabled-text));
}

.page-size-select :deep(.ui-field-control) {
  gap: 0.25rem;
  padding-left: 0.625rem;
  padding-right: 0.5rem;
}
</style>
