<template>
  <AppModal :open="open" title="Import cen stacji" size="lg" :busy="store.isImporting" @close="$emit('close')">
    <div class="space-y-4">
      <AppSelect v-model="provider" label="Dostawca" :options="store.providers.map(p => ({ value: p.code, label: p.code }))" :disabled="store.isImporting" class="max-w-xs" />
      <p v-if="!supported" class="ui-caption">Import dla tego dostawcy nie jest jeszcze dostępny.</p>
      <label class="flex min-h-28 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-ui-border-strong bg-ui-muted p-5 text-center" :class="supported && !store.isImporting ? 'cursor-pointer hover:bg-ui-input-hover' : 'opacity-60'" @dragover.prevent @drop.prevent="onDrop">
        <FileSpreadsheet class="h-7 w-7 text-ui-icon" />
        <span class="ui-body-sm font-medium">{{ file?.name || 'Wybierz lub przeciągnij plik XLSX' }}</span>
        <span class="ui-caption">Jeden plik · maksymalnie 5 MB</span>
        <input class="sr-only" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" :disabled="!supported || store.isImporting" @change="onFile" />
      </label>
      <p v-if="validation" class="ui-error" role="alert">{{ validation }}</p>
      <div v-if="store.isImporting" class="flex items-center gap-2 ui-body-sm" role="status"><LoaderCircle class="h-4 w-4 animate-spin" />Importowanie cen…</div>
      <template v-if="store.importResult">
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div v-for="item in summary" :key="item.label" class="rounded-md border border-ui-border bg-ui-muted p-3"><p class="ui-caption">{{ item.label }}</p><p class="text-lg font-semibold tabular-nums">{{ item.value }}</p></div>
        </div>
        <div v-if="issues.length" class="max-h-60 overflow-auto rounded-md border border-ui-border">
          <table class="ui-table w-full text-left text-xs"><thead class="ui-table-head sticky top-0"><tr><th class="ui-table-cell">Wiersz</th><th class="ui-table-cell">Kod stacji</th><th class="ui-table-cell">Typ</th><th class="ui-table-cell">Informacja</th></tr></thead><tbody><tr v-for="(issue, index) in issues" :key="index" class="ui-table-row"><td class="ui-table-cell">{{ issue.row }}</td><td class="ui-table-cell">{{ issue.outletCode || '—' }}</td><td class="ui-table-cell">{{ issue.kind }}</td><td class="ui-table-cell whitespace-normal">{{ issue.message }}</td></tr></tbody></table>
        </div>
        <p v-else class="ui-caption">Import zakończony bez ostrzeżeń.</p>
      </template>
    </div>
    <template #footer><AppButton variant="secondary" :disabled="store.isImporting" @click="$emit('close')">Zamknij</AppButton><AppButton :disabled="!supported || !file || Boolean(validation) || store.isImporting" @click="submit"><Upload class="h-4 w-4" />Importuj ceny</AppButton></template>
  </AppModal>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FileSpreadsheet, LoaderCircle, Upload } from 'lucide-vue-next'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import { useFuelStationStore } from '@/stores/fuelStationStore'
import { validateStationImport } from '@/utils/fuelStation'
const props = defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()
const store = useFuelStationStore(), provider = ref('IDS'), file = ref<File | null>(null), validation = ref('')
const supported = computed(() => store.providers.some(p => p.code === provider.value && p.importSupported))
const issues = computed(() => [...(store.importResult?.errors || []).map(i => ({ ...i, kind: 'Błąd' })), ...(store.importResult?.warnings || []).map(i => ({ ...i, kind: 'Ostrzeżenie' }))])
const summary = computed(() => { const r = store.importResult!; return [{ label: 'Zaakceptowane', value: `${r.acceptedRows} / ${r.totalRows}` }, { label: 'Nowe stacje', value: r.createdStations }, { label: 'Nowe ceny', value: r.insertedPrices }, { label: 'Poprawione ceny', value: r.updatedPrices }, { label: 'Bez zmian', value: r.unchangedPrices }, { label: 'Duplikaty', value: r.duplicateRows }, { label: 'Pominięte', value: r.skippedInvalidRows }] })
function selectFile(value?: File) { if (!supported.value || store.isImporting) return; file.value = value || null; validation.value = value ? validateStationImport(value) || '' : '' }
function onFile(event: Event) { selectFile((event.target as HTMLInputElement).files?.[0]); (event.target as HTMLInputElement).value = '' }
function onDrop(event: DragEvent) { if (!supported.value || store.isImporting) return; if ((event.dataTransfer?.files.length || 0) !== 1) { validation.value = 'Wybierz jeden plik XLSX.'; file.value = null; return }; selectFile(event.dataTransfer?.files[0]) }
async function submit() { if (file.value && !validation.value) { const done = await store.importFile(provider.value, file.value); if (done) file.value = null } }
watch(() => props.open, open => { if (open) { file.value = null; validation.value = ''; store.importResult = null } })
watch(provider, () => { file.value = null; validation.value = '' })
</script>
