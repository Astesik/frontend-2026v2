<template>
  <AppCard title="Powiadomienia krajowe">
    <AppTabs
      class="mb-4 w-full"
      :model-value="activeTab"
      :items="tabs"
      aria-label="Widok powiadomień krajowych"
      size="sm"
      @update:model-value="setActiveTab"
    />

    <template v-if="activeTab === 'rules'">
      <div class="mb-3 flex justify-end">
        <AppButton size="sm" @click="openCreateModal">
          <Plus class="h-4 w-4" />
          Dodaj regułę
        </AppButton>
      </div>

      <div v-if="isLoadingCountryRules" class="py-8 ui-body-sm text-ui-mutedText">
        Pobieranie reguł...
      </div>

      <div v-else class="ui-table-shell">
        <div class="max-h-[52vh] overflow-auto">
          <table class="ui-table min-w-[900px]">
            <thead class="ui-table-head sticky top-0 z-10">
              <tr>
                <th class="py-2 pl-3 pr-3 font-medium">Typ</th>
                <th class="py-2 pr-3 font-medium">Pojazdy</th>
                <th class="py-2 pr-3 font-medium">Kraj</th>
                <th class="py-2 pr-3 font-medium">Status</th>
                <th class="py-2 pr-3 font-medium">Emaile</th>
                <th class="sticky right-0 z-10 w-36 bg-ui-muted py-2 pr-3 text-right font-medium shadow-[-1px_0_0_0_rgb(var(--rw-border))]">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="rule in countryRules"
                :key="rule.id"
                class="ui-table-row group"
              >
                <td class="py-2 pl-3 pr-3 font-semibold text-ui-text">{{ eventTypeLabel(rule.eventType) }}</td>
                <td class="py-2 pr-3 text-ui-text-secondary">{{ scopeLabel(rule.vehicleScope) }}</td>
                <td class="py-2 pr-3">
                  <AppBadge variant="neutral">{{ rule.countryCode }}</AppBadge>
                </td>
                <td class="py-2 pr-3">
                  <AppBadge :variant="rule.enabled ? 'success' : 'neutral'">
                    {{ rule.enabled ? 'Włączona' : 'Wyłączona' }}
                  </AppBadge>
                </td>
                <td class="py-2 pr-3">
                  <div class="flex max-w-lg flex-wrap gap-1.5">
                    <span
                      v-for="email in rule.recipients"
                      :key="email"
                      class="rounded-[6px] border border-ui-border bg-ui-muted px-2 py-1 text-xs font-medium text-ui-text-secondary"
                    >
                      {{ email }}
                    </span>
                    <span v-if="!rule.recipients.length" class="ui-caption">Brak</span>
                  </div>
                </td>
                <td class="sticky right-0 z-10 bg-ui-surface py-2 pr-3 text-right shadow-[-1px_0_0_0_rgb(var(--rw-border))] transition group-hover:bg-ui-hover">
                  <div class="inline-flex items-center gap-1">
                    <AppButton type="button" size="sm" variant="ghost" @click="openEditModal(rule)">
                      <Pencil class="h-4 w-4" />
                      Edytuj
                    </AppButton>
                    <AppButton type="button" size="sm" variant="ghost" class="hover:!text-danger-600 dark:hover:!text-danger-400" @click="ruleToDelete = rule">
                      <Trash2 class="h-4 w-4" />
                      Usuń
                    </AppButton>
                  </div>
                </td>
              </tr>

              <tr v-if="!countryRules.length">
                <td colspan="6" class="py-10 text-center ui-body-sm text-ui-mutedText">
                  Brak reguł krajowych.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-if="isLoadingCountryHistory" class="py-8 ui-body-sm text-ui-mutedText">
        Pobieranie historii...
      </div>

      <div v-else class="ui-table-shell">
        <div class="max-h-[52vh] overflow-auto">
          <table class="ui-table min-w-[920px]">
            <thead class="ui-table-head sticky top-0 z-10">
              <tr>
                <th class="py-2 pl-3 pr-3 font-medium">Data</th>
                <th class="py-2 pr-3 font-medium">Pojazd</th>
                <th class="py-2 pr-3 font-medium">Typ</th>
                <th class="py-2 pr-3 font-medium">Kraj</th>
                <th class="py-2 pr-3 font-medium">Winieta</th>
                <th class="py-2 pr-3 font-medium">Emaile</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(event, index) in countryHistory"
                :key="event.id || index"
                class="ui-table-row"
              >
                <td class="py-2 pl-3 pr-3 text-ui-text-secondary">{{ formatEventDate(event) }}</td>
                <td class="py-2 pr-3 font-semibold text-ui-text">{{ event.vehicleLicensePlate || '-' }}</td>
                <td class="py-2 pr-3 text-ui-text-secondary">{{ eventTypeLabel(event.eventType) }}</td>
                <td class="py-2 pr-3 text-ui-text-secondary">{{ event.previousCountryCode || '-' }} → {{ event.countryCode }}</td>
                <td class="py-2 pr-3">
                  <AppBadge v-if="event.vignetteStatus" :variant="vignetteVariant(event.vignetteStatus)">
                    {{ vignetteLabel(event.vignetteStatus) }}
                  </AppBadge>
                  <span v-else class="ui-caption">-</span>
                </td>
                <td class="py-2 pr-3">
                  <div class="flex max-w-lg flex-wrap gap-1.5">
                    <span
                      v-for="email in event.notificationRecipients"
                      :key="email"
                      class="rounded-[6px] border border-ui-border bg-ui-muted px-2 py-1 text-xs font-medium text-ui-text-secondary"
                    >
                      {{ email }}
                    </span>
                    <span v-if="!event.notificationRecipients.length" class="ui-caption">Brak</span>
                  </div>
                </td>
              </tr>

              <tr v-if="!countryHistory.length">
                <td colspan="6" class="py-10 text-center ui-body-sm text-ui-mutedText">
                  Brak historii zdarzeń krajowych.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="px-3 pb-3">
          <AppPagination
            v-model:page="historyPage"
            v-model:page-size="historyPageSize"
            :total="countryHistoryTotal"
          />
        </div>
      </div>
    </template>
  </AppCard>

  <AppModal :open="isModalOpen" :title="form.id ? 'Edytuj regułę' : 'Dodaj regułę'" size="md" :busy="isMutating" @close="closeModal">
      <form id="country-rule-form" class="space-y-3" @submit.prevent="saveRule">
          <div class="grid gap-3 sm:grid-cols-2">
            <AppInput v-model="form.countryCode" label="Kod kraju ISO" placeholder="DK" />
            <AppSelect v-model="form.eventType" label="Typ zdarzenia" :options="eventTypeOptions" />
            <AppSelect v-model="form.vehicleScope" label="Zakres pojazdów" :options="scopeOptions" />
            <AppSwitch v-model="form.enabled" label="Reguła aktywna" />
          </div>
          <EmailChipInput v-model="form.recipients" label="Odbiorcy" />
          <p v-if="formError" class="ui-error">{{ formError }}</p>
      </form>
      <template #footer>
          <AppButton type="button" variant="secondary" @click="closeModal">Anuluj</AppButton>
          <AppButton form="country-rule-form" type="submit" :loading="isMutating">Zapisz</AppButton>
      </template>
  </AppModal>

  <AppModal :open="Boolean(ruleToDelete)" title="Usunąć regułę?" size="sm" :busy="isMutating" @close="ruleToDelete = null">
      <p class="ui-body-sm text-ui-mutedText">Tej operacji nie można cofnąć.</p>
      <template #footer>
          <AppButton variant="secondary" @click="ruleToDelete = null">Anuluj</AppButton>
          <AppButton variant="danger" :loading="isMutating" @click="deleteRule">Usuń</AppButton>
      </template>
  </AppModal>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Pencil, Plus, Trash2 } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import AppSelect, { type AppSelectOption } from '@/components/ui/AppSelect.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import EmailChipInput from '@/components/ui/EmailChipInput.vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUiStore } from '@/stores/uiStore'
import type { CountryEventHistoryItem, CountryEventRule, CountryEventType, CountryVehicleScope, VignetteStatus } from '@/types/notifications'

const notificationStore = useNotificationStore()
const uiStore = useUiStore()
const {
  countryRules,
  countryHistory,
  countryHistoryTotal,
  isLoadingCountryRules,
  isLoadingCountryHistory,
  isMutating,
} = storeToRefs(notificationStore)

const activeTab = ref<'rules' | 'history'>('rules')
const historyPage = ref(1)
const historyPageSize = ref(10)
const isModalOpen = ref(false)
const ruleToDelete = ref<CountryEventRule | null>(null)
const formError = ref('')
const form = reactive({
  id: null as number | null,
  countryCode: '',
  eventType: 'country_entry' as CountryEventType,
  vehicleScope: 'all' as CountryVehicleScope,
  enabled: true,
  recipients: [] as string[],
})

const tabs = [
  { value: 'rules' as const, label: 'Reguły' },
  { value: 'history' as const, label: 'Historia' },
]

function setActiveTab(value: string) {
  if (value === 'rules' || value === 'history') activeTab.value = value
}
const eventTypeOptions: AppSelectOption[] = [
  { value: 'country_entry', label: 'Wjazd do kraju' },
  { value: 'vignette_check', label: 'Kontrola winiety' },
]
const scopeOptions: AppSelectOption[] = [
  { value: 'all', label: 'Wszystkie pojazdy' },
  { value: 'trucks', label: 'Ciągniki' },
  { value: 'trailers', label: 'Naczepy' },
]

function resetForm(rule?: CountryEventRule) {
  Object.assign(form, rule
    ? { ...rule, recipients: [...rule.recipients] }
    : { id: null, countryCode: '', eventType: 'country_entry', vehicleScope: 'all', enabled: true, recipients: [] })
  formError.value = ''
}

function openCreateModal() {
  resetForm()
  isModalOpen.value = true
}

function openEditModal(rule: CountryEventRule) {
  resetForm(rule)
  isModalOpen.value = true
}

function closeModal() {
  if (!isMutating.value) {
    isModalOpen.value = false
  }
}

async function saveRule() {
  const countryCode = form.countryCode.trim().toUpperCase() === 'UK' ? 'GB' : form.countryCode.trim().toUpperCase()

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    formError.value = 'Podaj dwuliterowy kod kraju ISO.'
    return
  }

  if (form.eventType === 'vignette_check' && !['GB', 'LU', 'DK'].includes(countryCode)) {
    formError.value = 'Kontrola winiety jest dostępna dla GB, LU i DK.'
    return
  }

  if (form.enabled && !form.recipients.length) {
    formError.value = 'Aktywna reguła wymaga przynajmniej jednego odbiorcy.'
    return
  }

  const duplicate = countryRules.value.some((rule) => (
    rule.id !== form.id &&
    rule.countryCode === countryCode &&
    rule.eventType === form.eventType &&
    rule.vehicleScope === form.vehicleScope
  ))

  if (duplicate) {
    formError.value = 'Taka reguła już istnieje.'
    return
  }

  try {
    await notificationStore.saveCountryRule({
      countryCode,
      eventType: form.eventType,
      vehicleScope: form.vehicleScope,
      enabled: form.enabled,
      recipients: form.recipients,
    }, form.id)
    isModalOpen.value = false
    uiStore.addToast({
      type: 'success',
      title: 'Reguła zapisana',
      message: 'Zaktualizowano powiadomienia krajowe.',
    })
  } catch {
    // Global interceptor displays the error.
  }
}

async function deleteRule() {
  if (!ruleToDelete.value) {
    return
  }

  try {
    await notificationStore.deleteCountryRule(ruleToDelete.value.id)
    ruleToDelete.value = null
    uiStore.addToast({
      type: 'success',
      title: 'Reguła usunięta',
      message: 'Usunięto regułę krajową.',
    })
  } catch {
    // Global interceptor displays the error.
  }
}

async function loadHistory() {
  await notificationStore.loadCountryHistory(historyPage.value - 1, historyPageSize.value, { silent: true })
}

function eventTypeLabel(value: CountryEventType) {
  return value === 'country_entry' ? 'Wjazd do kraju' : 'Kontrola winiety'
}

function scopeLabel(value: CountryVehicleScope) {
  return { all: 'Wszystkie pojazdy', trucks: 'Ciągniki', trailers: 'Naczepy' }[value]
}

function vignetteLabel(value: VignetteStatus) {
  return { valid: 'Ważna', missing: 'Brak', expired: 'Wygasła' }[value]
}

function vignetteVariant(value: VignetteStatus): 'success' | 'warning' | 'error' {
  return value === 'valid' ? 'success' : value === 'missing' ? 'warning' : 'error'
}

function formatEventDate(event: CountryEventHistoryItem) {
  const value = event.occurredAt || event.createdAt
  return value ? new Date(value).toLocaleString('pl-PL') : '-'
}

watch(activeTab, (tab) => {
  if (tab === 'history' && !countryHistory.value.length) {
    void loadHistory()
  }
})

watch([historyPage, historyPageSize], () => {
  if (activeTab.value === 'history') {
    void loadHistory()
  }
})

onMounted(() => {
  void notificationStore.loadCountryRules({ silent: true })
})
</script>
