<template>
  <section class="min-w-0 space-y-2">
    <AppSearchSelect :model-value="modelValue" :label="label" :options="options" :disabled="disabled" size="sm" @update:model-value="select" />
    <div class="min-h-10 ui-caption">
      <template v-if="selectedDriver">
        <p class="font-medium text-ui-text-secondary">{{ selectedDriver.name || selectedDriver.externalId || 'Nierozpoznany kierowca' }}</p>
        <p>{{ selectedDriver.source === 'MANUAL' ? 'Wybór ręczny' : `Ostatni odczyt · slot ${(selectedDriver.slot ?? 0) + 1}` }}<template v-if="selectedDriver.observedAt"> · {{ formatStatisticsDate(selectedDriver.observedAt, timezone) }}</template></p>
      </template>
      <p v-else-if="modelValue.startsWith('CURRENT')">Brak potwierdzonej karty.</p>
      <p v-else-if="modelValue === 'NONE' || modelValue === 'KEEP'">Brak kierowcy.</p>
    </div>
    <AppConfirmModal :open="pending !== null" title="Zastąpić ręcznie wybranego kierowcę?" description="Kierowca zostanie pobrany z ostatniego lokalnego odczytu. Brak potwierdzonej karty wyczyści wybór." @close="pending = null" @confirm="confirmSelection" />
  </section>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import AppSearchSelect from '@/components/ui/AppSearchSelect.vue'
import AppConfirmModal from '@/components/ui/AppConfirmModal.vue'
import type { DriverSelectItem } from '@/types/driver'
import type { ReturnDriver } from '@/types/vehicleReturn'
import { formatStatisticsDate } from '@/utils/dailyStatistics'

const props = defineProps<{ modelValue: string; label: string; drivers: DriverSelectItem[]; currentDrivers: ReturnDriver[]; snapshot: ReturnDriver | null; editing: boolean; disabled: boolean; timezone: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const pending = ref<string | null>(null)
const options = computed(() => [
  ...(props.editing ? [{value: 'KEEP', label: `Zachowaj: ${props.snapshot?.name || props.snapshot?.externalId || 'brak kierowcy'}`}] : []),
  { value: 'CURRENT', label: 'Pobierz z ostatniego odczytu' },
  { value: 'CURRENT_0', label: 'Ostatni odczyt · slot 1' },
  { value: 'CURRENT_1', label: 'Ostatni odczyt · slot 2' },
  { value: 'NONE', label: 'Brak kierowcy' },
  ...props.drivers.map((driver) => ({value: `MANUAL_${driver.id}`, label: driver.label || `Kierowca #${driver.id}`})),
])
const selectedDriver = computed<ReturnDriver | null>(() => {
  if (props.modelValue === 'KEEP') return props.snapshot
  if (props.modelValue === 'CURRENT') return props.currentDrivers.find((driver) => driver.slot === 0) || props.currentDrivers.find((driver) => driver.slot === 1) || null
  if (props.modelValue.startsWith('CURRENT_')) return props.currentDrivers.find((driver) => driver.slot === Number(props.modelValue.slice(8))) || null
  if (props.modelValue.startsWith('MANUAL_')) {
    const id = Number(props.modelValue.slice(7)), driver = props.drivers.find((item) => item.id === id)
    return { driverId: id, externalId: null, name: driver?.label || `Kierowca #${id}`, source: 'MANUAL', slot: null, observedAt: null }
  }
  return null
})
function select(value: string) {
  if (value.startsWith('CURRENT') && (props.modelValue.startsWith('MANUAL_') || (props.modelValue === 'KEEP' && props.snapshot?.source === 'MANUAL'))) pending.value = value
  else emit('update:modelValue', value)
}
function confirmSelection() {
  if (pending.value) emit('update:modelValue', pending.value)
  pending.value = null
}
</script>
