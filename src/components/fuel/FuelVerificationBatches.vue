<template>
  <AppCard title="Historia importów" :icon="IconHistory" compact class="flex min-w-0 flex-col md:min-h-0 md:flex-1" content-class="flex min-h-0 flex-1 flex-col !p-0">
    <template #actions>
      <IconLoader2 v-if="loading && rows.length" class="h-4 w-4 animate-spin text-ui-icon" aria-label="Aktualizowanie historii importów" />
    </template>
    <p v-if="error" class="p-3 ui-error" role="alert">{{ error }}</p>
    <div class="relative flex min-h-48 flex-1 flex-col" :aria-busy="loading && !rows.length">
      <div class="max-h-[70dvh] min-h-0 flex-1 overflow-auto md:max-h-none">
        <table class="ui-table min-w-[48rem] table-auto !text-[14px]" aria-label="Importy kart paliwowych">
          <thead class="ui-table-head">
            <tr class="divide-x divide-ui-divider [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:h-11 [&>th]:whitespace-nowrap [&>th]:bg-ui-muted [&>th]:px-3 [&>th]:py-1">
              <th scope="col" class="w-12">Lp.</th>
              <th scope="col" class="w-full min-w-56">Plik</th>
              <th scope="col">Data importu</th>
              <th scope="col" class="text-right">Transakcje</th>
              <th v-if="canReadGps" scope="col" class="min-w-52">Weryfikacja GPS</th>
              <th scope="col" class="text-right">Akcje</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in rows" :key="item.importId" class="ui-table-row divide-x divide-ui-divider [&>td]:px-3 [&>td]:py-2 [&>td]:align-middle">
              <td class="text-xs tabular-nums text-ui-mutedText">{{ page * 20 + index + 1 }}.</td>
              <td>
                <div class="flex items-center gap-2">
                  <IconFileSpreadsheet class="h-4 w-4 shrink-0 text-ui-icon" aria-hidden="true" />
                  <span class="break-all font-semibold">{{ item.fileName }}</span>
                </div>
              </td>
              <td class="whitespace-nowrap tabular-nums"><time :datetime="item.importedAt">{{ date.format(new Date(item.importedAt)) }}</time></td>
              <td class="text-right tabular-nums">{{ item.total.toLocaleString('pl-PL') }}</td>
              <td v-if="canReadGps">
                <div class="space-y-1">
                  <div class="flex items-center justify-between gap-3">
                  <span class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium" :class="batchStatus(item).tone">
                    <component :is="batchStatus(item).icon" class="h-4 w-4 shrink-0" :class="{ 'animate-spin': item.pending > 0 }" aria-hidden="true" />
                    {{ batchStatus(item).label }}
                  </span>
                    <span v-if="item.total" class="whitespace-nowrap text-xs tabular-nums text-ui-mutedText" :title="'Sprawdzono: ' + item.done + ', w kolejce: ' + item.pending + ', błędy: ' + item.failed">{{ item.done }} / {{ item.total }}</span>
                  </div>
                  <div v-if="item.total" role="progressbar" :aria-valuenow="item.done + item.failed" :aria-valuemax="item.total" aria-valuemin="0" :aria-label="'Postęp weryfikacji ' + item.fileName" class="h-1 overflow-hidden rounded-full bg-ui-border">
                    <div class="h-full rounded-full bg-ui-icon/50 transition-[width]" :style="{ width: Math.min(100, (item.done + item.failed) / item.total * 100) + '%' }" />
                  </div>
                </div>
              </td>
              <td>
                <div class="flex items-center justify-end gap-2 whitespace-nowrap">
                  <RouterLink v-if="item.total" :to="{ name: 'fuel', query: { tab: 'history', importId: item.importId } }" class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ui-border text-ui-icon transition hover:bg-ui-hover focus-visible:outline-ui-focus" :aria-label="'Transakcje importu ' + item.fileName" title="Pokaż transakcje">
                    <IconListDetails class="h-4 w-4" />
                  </RouterLink>
                  <AppButton v-if="canReadGps && item.total && item.done + item.pending < item.total" size="sm" variant="secondary" :loading="starting === item.importId" :disabled="starting !== null" @click="start(item.importId)">
                    <IconMapPin class="h-4 w-4" />{{ item.failed && item.done + item.pending + item.failed === item.total ? 'Ponów sprawdzenie' : 'Sprawdź import' }}
                  </AppButton>
                  <span v-if="!item.total" class="text-ui-mutedText">—</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <AppLoadingIndicator v-if="loading && !rows.length" class="absolute inset-0 z-20 bg-ui-surface/85" />
      <p v-else-if="!rows.length && !error" class="absolute inset-x-0 top-16 px-4 text-center text-sm text-ui-mutedText">Brak zapisanych importów.</p>
    </div>
    <div v-if="page || hasMore" class="flex items-center justify-end gap-3 border-t border-ui-divider p-3">
      <AppButton size="sm" variant="secondary" :disabled="loading || page === 0" @click="load(page - 1)">Poprzednie</AppButton>
      <span class="text-sm tabular-nums">Strona {{ page + 1 }}</span>
      <AppButton size="sm" variant="secondary" :disabled="loading || !hasMore" @click="load(page + 1)">Następne</AppButton>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { IconHistory, IconFileSpreadsheet, IconListDetails, IconMapPin, IconLoader2, IconCircleCheck, IconAlertTriangle, IconClock } from '@tabler/icons-vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppLoadingIndicator from '@/components/ui/AppLoadingIndicator.vue'
import { useWorkspacePolling } from '@/composables/useWorkspace'
import { getApiErrorMessage } from '@/services/api'
import { fuelVerificationService, type FuelVerificationBatch } from '@/services/fuelVerificationService'
import { HISTORY_TIMEZONE } from '@/utils/historyTime'

const props = defineProps<{ refreshKey?: number; canReadGps: boolean }>()
const emit = defineEmits<{ summary: [value: { count: number | null; pending: number | null }] }>()
function batchStatus(item: FuelVerificationBatch) {
  if (!item.total) return { label: 'Bez nowych transakcji', icon: IconFileSpreadsheet, tone: 'border-ui-border bg-ui-muted text-ui-mutedText' }
  if (item.pending) return { label: 'W trakcie', icon: IconLoader2, tone: 'border-info-100 bg-info-50 text-info-600 dark:border-info-400/30 dark:bg-info-400/15 dark:text-info-400' }
  if (item.failed) return { label: 'Wymaga uwagi', icon: IconAlertTriangle, tone: 'border-warning-100 bg-warning-50 text-warning-600 dark:border-warning-400/30 dark:bg-warning-400/15 dark:text-warning-400' }
  if (item.done >= item.total) return { label: 'Sprawdzono', icon: IconCircleCheck, tone: 'border-success-100 bg-success-50 text-success-600 dark:border-success-400/30 dark:bg-success-400/15 dark:text-success-400' }
  return { label: 'Do sprawdzenia', icon: IconClock, tone: 'border-ui-border bg-ui-muted text-ui-mutedText' }
}
const rows = ref<FuelVerificationBatch[]>([])
const page = ref(0)
const hasMore = ref(false)
const loading = ref(false)
const starting = ref<number | null>(null)
const error = ref('')
const date = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeStyle: 'short', timeZone: HISTORY_TIMEZONE })
let revision = 0

async function load(requested: number) {
  const request = ++revision
  loading.value = true
  error.value = ''
  try {
    const result = await fuelVerificationService.batches(requested)
    if (request !== revision) return
    rows.value = result.rows
    page.value = requested
    hasMore.value = result.hasMore
    emit('summary', { count: result.rows.length, pending: result.rows.reduce((sum, item) => sum + item.pending, 0) })
  } catch (cause) {
    if (request === revision) {
      error.value = getApiErrorMessage(cause)
      if (!rows.value.length) emit('summary', { count: null, pending: null })
    }
  } finally {
    if (request === revision) loading.value = false
  }
}

async function start(importId: number) {
  if (!props.canReadGps || starting.value !== null) return
  starting.value = importId
  error.value = ''
  try {
    await fuelVerificationService.startBatch(importId)
    await load(page.value)
  } catch (cause) {
    error.value = getApiErrorMessage(cause)
  } finally {
    starting.value = null
  }
}

watch(() => [props.refreshKey, props.canReadGps], () => load(0), { immediate: true })
useWorkspacePolling(async () => {
  if (props.canReadGps && !loading.value && starting.value === null && rows.value.some(item => item.pending > 0)) await load(page.value)
}, 3000)
</script>
