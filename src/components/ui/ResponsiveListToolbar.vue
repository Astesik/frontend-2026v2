<template>
  <header class="flex min-w-0 shrink-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-end">
    <div class="w-full lg:w-72"><slot name="search" /></div>

    <div class="grid grid-cols-2 gap-2 lg:hidden">
      <AppButton
        variant="secondary"
        :aria-expanded="panel === 'filters'"
        :aria-controls="filtersId"
        @click="togglePanel('filters')"
      >
        <FilterIcon class="h-4 w-4" />
        Filtry
      </AppButton>
      <AppButton
        variant="secondary"
        :aria-expanded="panel === 'sort'"
        :aria-controls="sortId"
        @click="togglePanel('sort')"
      >
        <SortIcon class="h-4 w-4" />
        Sortuj
      </AppButton>
    </div>

    <div
      :id="filtersId"
      class="grid-cols-2 gap-2 lg:flex lg:flex-wrap lg:items-end"
      :class="panel === 'filters' ? 'grid' : 'hidden'"
    >
      <slot name="filters" />
    </div>

    <div :id="sortId" class="grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2 lg:hidden" :class="panel === 'sort' ? 'grid' : 'hidden'">
      <AppSelect
        :model-value="sortKey"
        :options="sortOptions"
        label="Sortuj według"
        size="sm"
        @update:model-value="selectSortKey"
      />
      <AppSelect
        :model-value="sortDirection"
        :options="directionOptions"
        label="Kierunek"
        size="sm"
        @update:model-value="selectSortDirection"
      />
    </div>

    <slot name="actions" />
  </header>
</template>

<script setup lang="ts" generic="SortKey extends string">
import { computed, ref, useId } from 'vue'
import { IconFilter as FilterIcon, IconArrowsSort as SortIcon } from '@tabler/icons-vue'
import AppButton from './AppButton.vue'
import AppSelect from './AppSelect.vue'

const props = defineProps<{ columns: readonly { key: SortKey; label: string }[] }>()
const sortKey = defineModel<SortKey>('sortKey', { required: true })
const sortDirection = defineModel<'asc' | 'desc'>('sortDirection', { required: true })
const panel = ref<'filters' | 'sort' | null>(null)
const filtersId = useId()
const sortId = useId()
const sortOptions = computed(() => props.columns.map(({ key, label }) => ({ value: key, label })))
const directionOptions = [
  { value: 'asc', label: 'Rosnąco' },
  { value: 'desc', label: 'Malejąco' },
]

function togglePanel(value: 'filters' | 'sort') {
  panel.value = panel.value === value ? null : value
}

function selectSortKey(value: string) {
  const option = props.columns.find(column => column.key === value)
  if (option) sortKey.value = option.key
}

function selectSortDirection(value: string) {
  if (value === 'asc' || value === 'desc') sortDirection.value = value
}
</script>
