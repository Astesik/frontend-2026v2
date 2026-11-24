<template>
  <div class="flex min-w-0 flex-col gap-3 md:min-h-0 md:flex-1">
    <div class="grid shrink-0 gap-3 sm:grid-cols-2" aria-label="Podsumowanie importów na stronie">
      <AppCard v-for="tile in importTiles" :key="tile.label" compact>
        <div class="flex min-h-12 items-center gap-3">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border" :class="tile.tone">
            <component :is="tile.icon" class="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 class="text-sm text-ui-mutedText">{{ tile.label }}</h3>
            <div class="mt-1 flex h-8 items-center"><IconLoader2 v-if="!importStats" class="h-6 w-6 animate-spin text-ui-icon" aria-label="Ładowanie podsumowania" />
            <p v-else class="text-2xl font-semibold tabular-nums">{{ tile.value == null ? '—' : tile.value.toLocaleString('pl-PL') }}</p></div>
          </div>
        </div>
      </AppCard>
    </div>
    <AppCard title="Importuj" :icon="IconUpload" compact class="shrink-0">
      <div class="grid items-center gap-3 sm:grid-cols-[minmax(10rem,14rem)_minmax(0,1fr)]">
        <AppSelect v-model="provider" label="Operator karty" :options="providerOptions" size="sm" />
        <input ref="fileInput" hidden type="file" :accept="provider === 'AS24' ? '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : '.csv,text/csv'" @change="onFile" />
        <button
          type="button"
          class="flex min-h-20 w-full items-center justify-center gap-3 rounded-[var(--rw-radius-control)] border border-dashed border-ui-border-strong px-4 py-4 text-center transition hover:bg-ui-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus"
          :class="dragging ? 'bg-ui-hover ring-2 ring-ui-focus' : 'bg-ui-muted'"
          @click="fileInput?.click()"
          @dragenter.prevent="dragging = true"
          @dragover.prevent
          @dragleave="dragging = false"
          @drop.prevent="onDrop"
        >
          <span class="pointer-events-none flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border bg-ui-surface text-ui-icon"><IconFileUpload class="h-5 w-5" /></span>
          <span class="pointer-events-none text-sm font-semibold text-ui-text">Wybierz lub przeciągnij plik</span>
        </button>
      </div>
      <p v-if="selectionError" role="alert" class="mt-3 ui-error">{{ selectionError }}</p>
    </AppCard>

    <FuelVerificationBatches :can-read-gps="canReadGps" :refresh-key="lastImportId" @summary="importStats = $event" />

    <AppModal
      :open="Boolean(file)"
      :title="result ? 'Import zapisany' : 'Potwierdź import ' + provider"
      :size="provider === 'E100' ? 'xl' : 'md'"
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
        <E100ImportPreview v-if="e100Preview && !result" :preview="e100Preview" />
        <p v-if="e100Skipped && !result" class="ui-body-sm">Import pominie {{ e100Skipped }} poz. z błędami, konfliktem kart lub możliwą korektą.</p>
        <div v-if="summary.length" class="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Podsumowanie importu">
          <div v-for="item in summary" :key="item.label" class="rounded-md border border-ui-border bg-ui-muted p-3">
            <p class="ui-caption">{{ item.label }}</p>
            <p class="text-lg font-semibold tabular-nums text-ui-text">{{ item.value }}</p>
          </div>
        </div>
        <p v-if="reviewCount && !result" class="ui-body-sm text-warning-600 dark:text-warning-400" role="status">
          {{ reviewCount }} poz. ma zmienione dane przy tym samym numerze transakcji. Zostaną pominięte, aby nie doliczyć paliwa ponownie.
        </p>
        <details v-if="reviewCount && !result" class="rounded-md border border-ui-divider p-3">
          <summary class="cursor-pointer text-sm font-medium text-ui-text">Pozycje do wyjaśnienia ({{ reviewCount }})</summary>
          <ul class="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-ui-mutedText">
            <li v-for="item in reviewRows.slice(0, 100)" :key="item.row">Wiersz {{ item.row }}<span v-if="item.transactionNumber"> · Transakcja {{ item.transactionNumber }}</span></li>
            <li v-if="reviewCount > 100">Pozostałe pozycje do wyjaśnienia: {{ reviewCount - 100 }}</li>
          </ul>
        </details>
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
        <p v-else-if="preview?.rows.length && !saveable && !reviewCount" class="ui-body-sm text-ui-mutedText">
          Plik zawiera wyłącznie duplikaty. Po zatwierdzeniu pojawi się w historii bez uruchamiania weryfikacji.
        </p>
      </div>
      <template #footer>
        <AppButton variant="secondary" :disabled="busy === 'save'" @click="close">{{ result || provider === 'E100' ? 'Zamknij' : 'Anuluj' }}</AppButton>
        <AppButton v-if="!result" :disabled="!canConfirm || !!busy" :loading="busy === 'save'" @click="confirm">
          Potwierdź import
        </AppButton>
      </template>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { IconFileUpload, IconLoader2, IconUpload, IconHistory, IconMapPin } from '@tabler/icons-vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import E100ImportPreview from './E100ImportPreview.vue'
import FuelVerificationBatches from './FuelVerificationBatches.vue'
import { getApiErrorMessage } from '@/services/api'
import { fuelImportService, type FuelImportPreview, type EurowagImportPreview, type As24ImportPreview, type FuelImportResult, type E100Preview } from '@/services/fuelImportService'

const props = defineProps<{ canReadGps: boolean }>()
const importStats = ref<{ count: number | null; pending: number | null } | null>(null)
const importTiles = computed(() => [
  { label: 'Importy na stronie', value: importStats.value?.count, icon: IconHistory, tone: 'border-info-100 bg-info-50 text-info-600 dark:border-info-400/30 dark:bg-info-400/15 dark:text-info-400' },
  ...(props.canReadGps ? [{ label: 'W kolejce GPS na stronie', value: importStats.value?.pending, icon: IconMapPin, tone: 'border-warning-100 bg-warning-50 text-warning-600 dark:border-warning-400/30 dark:bg-warning-400/15 dark:text-warning-400' }] : []),
])
const fileInput = ref<HTMLInputElement>()
const provider = ref('IDS')
const providerOptions = [{ label: 'IDS', value: 'IDS' }, { label: 'E100', value: 'E100' }, { label: 'Eurowag', value: 'EUROWAG' }, { label: 'AS24', value: 'AS24' }]
const e100Preview = shallowRef<E100Preview | null>(null)
const file = shallowRef<File | null>(null)
const preview = shallowRef<FuelImportPreview | EurowagImportPreview | As24ImportPreview | null>(null)
const result = ref<FuelImportResult | null>(null)
const lastImportId = ref<number>()
const busy = ref<'preview' | 'save' | null>(null)
const dragging = ref(false)
const selectionError = ref('')
const error = ref('')
let request = 0
const saveable = computed(() => preview.value?.rows.filter(row => row.status !== 'DUPLICATE' && row.status !== 'REVIEW').length ?? 0)
const reviewCount = computed(() => preview.value?.rows.filter(row => row.status === 'REVIEW').length ?? 0)
const reviewRows = computed(() => provider.value === 'AS24' ? (preview.value as As24ImportPreview | null)?.rows.filter(row => row.status === 'REVIEW') ?? [] : [])
const duplicateCount = computed(() => preview.value?.rows.filter(row => row.status === 'DUPLICATE').length ?? 0)
const e100Eligible = computed(() => e100Preview.value?.rows.filter(row => !row.cardConflict && row.status !== 'REVIEW') ?? [])
const e100Skipped = computed(() => e100Preview.value ? e100Preview.value.errors.length + e100Preview.value.rows.length - e100Eligible.value.length : 0)
const canConfirm = computed(() => provider.value === 'E100' ? e100Eligible.value.length > 0 : Boolean(preview.value?.rows.some(row => row.status !== 'REVIEW') || preview.value?.skippedZero))
const summary = computed(() => {
  if (result.value) {
    const { saved, duplicates, rejected, queued } = result.value
    return [{ label: 'Zapisano', value: saved }, { label: 'Duplikaty', value: duplicates },
      { label: 'Odrzucono', value: rejected }, { label: 'W kolejce GPS', value: queued }, ...(result.value.skippedZero ? [{ label: 'Pominięte 0 l', value: result.value.skippedZero }] : [])]
  }
  if (!preview.value) return []
  return [{ label: 'Do zapisania', value: saveable.value }, { label: 'Duplikaty', value: duplicateCount.value },
    { label: 'Odrzucone', value: preview.value.errors.length }, ...(reviewCount.value ? [{ label: 'Do wyjaśnienia', value: reviewCount.value }] : []), ...(preview.value.skippedZero ? [{ label: 'Pominięte 0 l', value: preview.value.skippedZero }] : []), { label: 'Wiersze łącznie', value: preview.value.rows.length + preview.value.errors.length + (preview.value.skippedZero ?? 0) }]
})

watch(provider, () => { if (busy.value !== 'save') { reset(); selectionError.value = '' } }, { flush: 'sync' })

function reset() {
  request++
  file.value = null
  preview.value = null
  e100Preview.value = null
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
  const isAs24 = provider.value === 'AS24'
  if (!(isAs24 ? /\.xlsx$/i : /\.csv$/i).test(selected.name) || !selected.size) {
    selectionError.value = isAs24 ? 'Wybierz niepusty plik XLSX AS24.' : 'Wybierz niepusty plik CSV.'
    return
  }
  reset()
  const current = request
  file.value = selected
  busy.value = 'preview'
  try {
    if (provider.value === 'E100') {
      const response = await fuelImportService.previewE100(selected)
      if (request === current) e100Preview.value = response
      return
    }
    const response = provider.value === 'AS24' ? await fuelImportService.previewAs24(selected)
      : provider.value === 'EUROWAG' ? await fuelImportService.previewEurowag(selected)
      : await fuelImportService.preview(selected)
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
    selectionError.value = provider.value === 'AS24' ? 'Wybierz jeden plik XLSX AS24.' : 'Wybierz jeden plik CSV.'
    return
  }
  void selectFile(files[0])
}

async function confirm() {
  const selected = file.value
  if (!selected || !canConfirm.value || busy.value || result.value) return
  const current = request
  busy.value = 'save'
  error.value = ''
  try {
    const response = provider.value === 'E100' ? await fuelImportService.confirmE100(selected)
      : provider.value === 'EUROWAG' ? await fuelImportService.confirmEurowag(selected)
      : provider.value === 'AS24' ? await fuelImportService.confirmAs24(selected)
      : await fuelImportService.confirm(selected)
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
