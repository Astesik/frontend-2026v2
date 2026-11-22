<template>
  <AppCard title="Historia importów" :icon="IconHistory" compact content-class="!p-0">
    <p v-if="error" class="p-3 ui-error" role="alert">{{ error }}</p>
    <p v-else-if="!rows.length" class="p-3 ui-body-sm text-ui-mutedText">{{ loading ? 'Pobieranie importów…' : 'Brak zapisanych importów.' }}</p>
    <ul v-else class="divide-y divide-ui-divider" aria-label="Importy kart paliwowych">
      <li v-for="item in rows" :key="item.importId" class="flex flex-wrap items-center justify-between gap-3 p-3">
        <div class="min-w-0 flex-1">
          <p class="break-words text-sm font-semibold text-ui-text">{{ item.fileName }}</p>
          <p class="ui-caption">{{ date.format(new Date(item.importedAt)) }} · {{ item.total }} transakcji</p>
          <div v-if="canReadGps && item.total" class="mt-2 space-y-1">
            <progress
              class="block h-1.5 w-full max-w-72 accent-primary-600"
              :value="item.done + item.failed" :max="item.total" :aria-label="'Postęp weryfikacji ' + item.fileName"
            />
            <p class="ui-caption">
              Sprawdzono {{ item.done }} z {{ item.total }}
              <span v-if="item.pending"> · W kolejce {{ item.pending }}</span>
              <span v-if="item.failed"> · Błędy {{ item.failed }}</span>
            </p>
          </div>
        </div>
        <div v-if="item.total" class="flex flex-wrap items-center gap-2">
          <RouterLink
            :to="{ name: 'fuel', query: { tab: 'history', importId: item.importId } }"
            class="text-sm font-medium text-ui-text underline underline-offset-4"
          >Wyniki</RouterLink>
          <AppButton
            v-if="canReadGps && item.done + item.pending < item.total" size="sm" variant="secondary"
            :loading="starting === item.importId" :disabled="starting !== null"
            @click="start(item.importId)"
          >{{ item.failed && item.done + item.pending + item.failed === item.total ? 'Ponów sprawdzenie' : 'Sprawdź cały import' }}</AppButton>
        </div>
      </li>
    </ul>
    <div v-if="page || hasMore" class="flex gap-2 border-t border-ui-divider p-3">
      <AppButton size="sm" variant="secondary" :disabled="loading || page === 0" @click="load(page - 1)">Poprzednie</AppButton>
      <AppButton size="sm" variant="secondary" :disabled="loading || !hasMore" @click="load(page + 1)">Następne</AppButton>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { IconHistory } from '@tabler/icons-vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import { useWorkspacePolling } from '@/composables/useWorkspace'
import { getApiErrorMessage } from '@/services/api'
import { fuelVerificationService, type FuelVerificationBatch } from '@/services/fuelVerificationService'
import { HISTORY_TIMEZONE } from '@/utils/historyTime'

const props = defineProps<{ refreshKey?: number; canReadGps: boolean }>()
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
  } catch (cause) {
    if (request === revision) error.value = getApiErrorMessage(cause)
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
