<template>
  <AppCard title="Historia tankowań" compact content-class="!p-0">
    <template #actions>
      <AppButton size="sm" variant="secondary" :disabled="loading" @click="load(true)">Odśwież</AppButton>
    </template>
    <p v-if="loading && !rows.length" class="p-4 ui-caption" role="status">Pobieranie tankowań…</p>
    <p v-else-if="!rows.length && !error" class="p-4 ui-caption">Brak zapisanych tankowań.</p>
    <FuelTransactionRows v-if="rows.length" :rows="rows">
      <template v-if="canViewVerification" #actions="{ item }">
        <AppButton size="sm" variant="ghost" class="mt-1" @click="selected = item">Weryfikacja GPS</AppButton>
      </template>
    </FuelTransactionRows>
    <FuelTransactionVerificationDialog
      :transaction="selected" :can-verify="canVerify" @close="selected = null"
    />
    <p v-if="error" class="p-4 ui-error" role="alert">{{ error }}</p>
    <div v-if="hasMore" class="border-t border-ui-divider p-3">
      <AppButton size="sm" variant="secondary" :loading="loading" @click="load(false)">Pokaż kolejne</AppButton>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import FuelTransactionRows from '@/components/fuel/FuelTransactionRows.vue'
import FuelTransactionVerificationDialog from '@/components/fuel/FuelTransactionVerificationDialog.vue'
import { getApiErrorMessage } from '@/services/api'
import { fuelImportService, type FuelTransactionRow } from '@/services/fuelImportService'

import { useAuthStore } from '@/stores/authStore'

const props = defineProps<{ vehicleId?: number }>()
const auth = useAuthStore()
const canViewVerification = computed(() => auth.canManageCompany || auth.hasActiveCompanyPermission('positions.read'))
const canVerify = computed(() => auth.canManageCompany || auth.hasActiveCompanyPermission('fuel_imports.manage'))
const selected = ref<FuelTransactionRow | null>(null)
const rows = ref<FuelTransactionRow[]>([])
const page = ref(0)
const loading = ref(false)
const hasMore = ref(false)
const error = ref('')

async function load(replace: boolean) {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const requested = replace ? 0 : page.value
    const result = await fuelImportService.history(requested, props.vehicleId)
    rows.value = replace ? result.rows : [...rows.value, ...result.rows]
    page.value = requested + 1
    hasMore.value = result.hasMore
  } catch (cause) {
    error.value = getApiErrorMessage(cause)
  } finally {
    loading.value = false
  }
}

onMounted(() => load(true))
</script>
