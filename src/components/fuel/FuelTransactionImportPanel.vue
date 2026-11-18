<template>
  <div class="grid min-w-0 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
    <AppCard title="Importuj" :icon="IconUpload" compact>
      <input ref="fileInput" hidden type="file" accept=".csv,text/csv" @change="onFile" />
      <button
        type="button"
        class="flex w-full flex-col items-center gap-2 rounded-[var(--rw-radius-control)] border border-dashed border-ui-border-strong px-4 py-8 text-center transition hover:bg-ui-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"
        :class="dragging ? 'bg-ui-hover' : 'bg-ui-muted'"
        @click="fileInput?.click()"
        @dragenter.prevent="dragging = true"
        @dragover.prevent
        @dragleave="dragging = false"
        @drop.prevent="onDrop"
      >
        <IconFileUpload class="pointer-events-none h-7 w-7 text-ui-icon" />
        <span class="pointer-events-none text-sm font-semibold text-ui-text">Wybierz lub przeciągnij plik</span>
      </button>
      <p v-if="selectionError" role="alert" class="mt-3 ui-error">{{ selectionError }}</p>
    </AppCard>

    <FuelVerificationBatches :can-read-gps="canReadGps" :refresh-key="lastImportId" />

    <AppModal
      :open="Boolean(file)"
      :title="result ? 'Import zapisany' : 'Potwierdź import'"
      size="md"
      center-in-viewport
      :busy="busy === 'save'"
      @close="close"
    >
      <div class="space-y-4">
        <p class="break-all text-sm font-medium text-ui-text">{{ file?.name }}</p>
        <p v-if="busy === 'preview'" class="flex items-center gap-2 ui-body-sm text-ui-mutedText" role="status">
          <IconLoader2 class="h-4 w-4 animate-spin" />Sprawdzanie pliku…
        </p>
        <p v-if="error" class="ui-error" role="alert">{{ error }}</p>
        <div v-if="summary.length" class="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Podsumowanie importu">
          <div v-for="item in summary" :key="item.label" class="rounded-md border border-ui-border bg-ui-muted p-3">
            <p class="ui-caption">{{ item.label }}</p>
            <p class="text-lg font-semibold tabular-nums text-ui-text">{{ item.value }}</p>
          </div>
        </div>
        <details v-if="preview?.errors.length && !result" class="rounded-md border border-ui-divider p-3">
          <summary class="cursor-pointer text-sm font-medium text-ui-text">Powody odrzucenia ({{ preview.errors.length }})</summary>
          <ul class="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-ui-mutedText">
            <li v-for="(item, index) in preview.errors" :key="index">
              Wiersz {{ item.line }} · {{ item.column ? item.column + ' · ' : '' }}{{ item.reason }}
            </li>
          </ul>
        </details>
        <p v-if="result" class="ui-body-sm text-ui-mutedText" role="status">
          {{ result.queued ? 'Przekazano zapisane transakcje do weryfikacji lokalizacji.' : 'Brak nowych, aktualnych transakcji do sprawdzenia.' }}
        </p>
        <p v-else-if="preview?.rows.length && !saveable" class="ui-body-sm text-ui-mutedText">
          Plik zawiera wyłącznie duplikaty. Po zatwierdzeniu pojawi się w historii bez uruchamiania weryfikacji.
        </p>
      </div>
      <template #footer>
        <AppButton variant="secondary" :disabled="busy === 'save'" @click="close">{{ result ? 'Zamknij' : 'Anuluj' }}</AppButton>
        <AppButton v-if="!result" :disabled="!preview?.rows.length || !!busy" :loading="busy === 'save'" @click="confirm">
          Potwierdź import
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { IconFileUpload, IconLoader2, IconUpload } from '@tabler/icons-vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppModal from '@/components/ui/AppModal.vue'
import FuelVerificationBatches from './FuelVerificationBatches.vue'
import { getApiErrorMessage } from '@/services/api'
import { fuelImportService, type FuelImportPreview, type FuelImportResult } from '@/services/fuelImportService'

defineProps<{ canReadGps: boolean }>()
const fileInput = ref<HTMLInputElement>()
const file = shallowRef<File | null>(null)
const preview = shallowRef<FuelImportPreview | null>(null)
const result = ref<FuelImportResult | null>(null)
const lastImportId = ref<number>()
const busy = ref<'preview' | 'save' | null>(null)
const dragging = ref(false)
const selectionError = ref('')
const error = ref('')
let request = 0
const saveable = computed(() => preview.value?.rows.filter(row => row.status !== 'DUPLICATE').length ?? 0)
const summary = computed(() => {
  if (result.value) {
    const { saved, duplicates, rejected, queued } = result.value
    return [{ label: 'Zapisano', value: saved }, { label: 'Duplikaty', value: duplicates },
      { label: 'Odrzucono', value: rejected }, { label: 'W kolejce GPS', value: queued }]
  }
  if (!preview.value) return []
  return [{ label: 'Do zapisania', value: saveable.value }, { label: 'Duplikaty', value: preview.value.rows.length - saveable.value },
    { label: 'Odrzucone', value: preview.value.errors.length }, { label: 'Wiersze łącznie', value: preview.value.rows.length + preview.value.errors.length }]
})

function reset() {
  request++
  file.value = null
  preview.value = null
  result.value = null
  error.value = ''
  busy.value = null
}

function close() {
  if (busy.value !== 'save') reset()
}

async function selectFile(selected?: File) {
  if (!selected || busy.value === 'save') return
  selectionError.value = ''
  if (!/\.csv$/i.test(selected.name) || !selected.size) {
    selectionError.value = 'Wybierz niepusty plik CSV.'
    return
  }
  reset()
  const current = request
  file.value = selected
  busy.value = 'preview'
  try {
    const response = await fuelImportService.preview(selected)
    if (request === current) preview.value = response
  } catch (cause) {
    if (request === current) error.value = getApiErrorMessage(cause)
  } finally {
    if (request === current) busy.value = null
  }
}

function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  void selectFile(input.files?.[0])
  input.value = ''
}

function onDrop(event: DragEvent) {
  dragging.value = false
  const files = event.dataTransfer?.files
  if (files?.length !== 1) {
    selectionError.value = 'Wybierz jeden plik CSV.'
    return
  }
  void selectFile(files[0])
}

async function confirm() {
  const selected = file.value
  if (!selected || !preview.value?.rows.length || busy.value || result.value) return
  const current = request
  busy.value = 'save'
  error.value = ''
  try {
    const response = await fuelImportService.confirm(selected)
    if (request === current) {
      result.value = response
      lastImportId.value = response.importId
    }
  } catch (cause) {
    if (request === current) error.value = getApiErrorMessage(cause)
  } finally {
    if (request === current) busy.value = null
  }
}

onBeforeUnmount(reset)
</script>
