<template>
  <AppPopover v-model:open="open" :max-height="480" content-class="p-2" :use-anchor-min-width="false">
    <template #trigger><AppButton size="sm" variant="secondary" :aria-expanded="open"><Columns3 class="h-4 w-4" />Kolumny</AppButton></template>
    <div class="w-72 max-w-[calc(100vw-3rem)]">
      <p class="px-2 py-2 ui-label text-ui-text">Widoczność i kolejność</p>
      <div v-for="(column, index) in store.columns" :key="column.key" draggable="true" class="flex items-center gap-1 rounded-[6px] px-1 py-0.5 hover:bg-ui-dropdown-hover" :class="dragged === column.key ? 'bg-ui-muted' : ''" @dragstart="startDrag(column.key, $event)" @dragover.prevent @drop.prevent="drop(column.key)" @dragend="dragged = null">
        <GripVertical class="h-3.5 w-3.5 shrink-0 cursor-grab text-ui-icon" />
        <AppCheckbox :model-value="column.visible" :label="label(column.key)" class="min-w-0 flex-1" @update:model-value="column.visible = $event" />
        <AppIconButton size="sm" label="Przesuń w górę" :disabled="index === 0" @click="move(index, index - 1)"><ChevronUp class="h-3.5 w-3.5" /></AppIconButton>
        <AppIconButton size="sm" label="Przesuń w dół" :disabled="index === store.columns.length - 1" @click="move(index, index + 1)"><ChevronDown class="h-3.5 w-3.5" /></AppIconButton>
      </div>
      <AppButton size="sm" variant="ghost" class="mt-2 w-full" @click="store.columns = normalizeReturnColumns(null)">Przywróć domyślne</AppButton>
    </div>
  </AppPopover>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { ChevronDown, ChevronUp, Columns3, GripVertical } from 'lucide-vue-next'
import AppPopover from '@/components/ui/AppPopover.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import { useVehicleReturnStore } from '@/stores/vehicleReturnStore'
import { normalizeReturnColumns, returnColumnDefinitions, type ReturnColumnKey } from '@/utils/vehicleReturnColumns'
const store = useVehicleReturnStore()
const open = ref(false), dragged = ref<ReturnColumnKey | null>(null)
function label(key: ReturnColumnKey) { return returnColumnDefinitions.find((item) => item.key === key)?.label || key }
function move(from: number, to: number) {
  if (to < 0 || to >= store.columns.length) return
  const items = [...store.columns], [item] = items.splice(from, 1)
  items.splice(to, 0, item!)
  store.columns = items
}
function startDrag(key: ReturnColumnKey, event: DragEvent) {
  dragged.value = key
  event.dataTransfer?.setData('text/plain', key)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}
function drop(key: ReturnColumnKey) {
  if (dragged.value) move(store.columns.findIndex((item) => item.key === dragged.value), store.columns.findIndex((item) => item.key === key))
  dragged.value = null
}
</script>
