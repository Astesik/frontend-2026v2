<template>
  <AppCard title="Powiadomienia krajowe" description="Reguły wjazdu do kraju oraz kontroli ważności winiet.">
    <div class="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-app-elevated">
      <button v-for="tab in tabs" :key="tab.value" type="button" class="h-8 flex-1 rounded-lg text-xs font-semibold transition" :class="activeTab === tab.value ? 'bg-white text-slate-950 shadow-sm dark:bg-app-dark dark:text-slate-50' : 'text-slate-500 dark:text-app-muted'" @click="activeTab = tab.value">
        {{ tab.label }}
      </button>
    </div>

    <template v-if="activeTab === 'rules'">
      <div class="mb-4 flex justify-end">
        <AppButton size="sm" @click="openCreateModal"><Plus class="h-4 w-4" />Dodaj regułę</AppButton>
      </div>

      <div v-if="isLoadingCountryRules" class="py-8 text-sm text-slate-500 dark:text-slate-400">Pobieranie reguł...</div>
      <div v-else class="space-y-2">
        <article v-for="rule in countryRules" :key="rule.id" class="grid gap-3 rounded-2xl border border-slate-100 p-3 dark:border-app-border sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:items-center">
          <div>
            <p class="text-lg font-bold text-slate-950 dark:text-slate-50">{{ rule.countryCode }}</p>
            <AppBadge :variant="rule.enabled ? 'success' : 'neutral'">{{ rule.enabled ? 'Aktywna' : 'Wyłączona' }}</AppBadge>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-slate-950 dark:text-slate-50">{{ eventTypeLabel(rule.eventType) }} · {{ scopeLabel(rule.vehicleScope) }}</p>
            <p class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{{ rule.recipients.join(', ') || 'Brak odbiorców' }}</p>
          </div>
          <div class="flex justify-end gap-1">
            <button type="button" class="action-button" @click="openEditModal(rule)"><Pencil class="h-4 w-4" />Edytuj</button>
            <button type="button" class="action-button hover:text-danger-600 dark:hover:text-danger-400" @click="ruleToDelete = rule"><Trash2 class="h-4 w-4" />Usuń</button>
          </div>
        </article>
        <div v-if="!countryRules.length" class="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500 dark:border-app-border dark:text-slate-400">Brak reguł krajowych.</div>
      </div>
    </template>

    <template v-else>
      <div v-if="isLoadingCountryHistory" class="py-8 text-sm text-slate-500 dark:text-slate-400">Pobieranie historii...</div>
      <div v-else class="space-y-2">
        <article v-for="(event, index) in countryHistory" :key="event.id || index" class="grid gap-2 rounded-2xl border border-slate-100 p-3 dark:border-app-border sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:items-center">
          <div>
            <p class="text-sm font-bold text-slate-950 dark:text-slate-50">{{ event.previousCountryCode || '—' }} → {{ event.countryCode }}</p>
            <p class="mt-1 text-[11px] text-slate-500 dark:text-app-muted">{{ formatEventDate(event) }}</p>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-slate-950 dark:text-slate-50">{{ eventTypeLabel(event.eventType) }}</p>
            <p class="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{{ event.vehicleLicensePlate || 'Pojazd bez numeru' }} · {{ event.notificationRecipients.join(', ') || 'Bez powiadomienia' }}</p>
          </div>
          <AppBadge v-if="event.vignetteStatus" :variant="vignetteVariant(event.vignetteStatus)">{{ vignetteLabel(event.vignetteStatus) }}</AppBadge>
        </article>
        <div v-if="!countryHistory.length" class="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500 dark:border-app-border dark:text-slate-400">Brak historii zdarzeń krajowych.</div>
      </div>
    </template>
  </AppCard>

  <Teleport to="body">
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4" @click.self="closeModal">
      <form class="my-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel" @submit.prevent="saveRule">
        <header class="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-app-border">
          <h2 class="font-semibold text-slate-950 dark:text-slate-50">{{ form.id ? 'Edytuj regułę' : 'Dodaj regułę' }}</h2>
          <button type="button" class="icon-button" @click="closeModal"><X class="h-4 w-4" /></button>
        </header>
        <div class="space-y-3 p-5">
          <div class="grid gap-3 sm:grid-cols-2">
            <AppInput v-model="form.countryCode" label="Kod kraju ISO" placeholder="DK" />
            <AppSelect v-model="form.eventType" label="Typ zdarzenia" :options="eventTypeOptions" />
            <AppSelect v-model="form.vehicleScope" label="Zakres pojazdów" :options="scopeOptions" />
            <AppSwitch v-model="form.enabled" label="Reguła aktywna" />
          </div>
          <EmailChipInput v-model="form.recipients" label="Odbiorcy" />
          <p v-if="formError" class="text-xs font-medium text-danger-600 dark:text-danger-400">{{ formError }}</p>
        </div>
        <footer class="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-app-border">
          <AppButton type="button" variant="secondary" @click="closeModal">Anuluj</AppButton>
          <AppButton type="submit" :loading="isMutating">Zapisz</AppButton>
        </footer>
      </form>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="ruleToDelete" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" @click.self="ruleToDelete = null">
      <section class="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-app-border dark:bg-app-panel">
        <header class="border-b border-slate-100 px-5 py-4 dark:border-app-border"><h2 class="font-semibold text-slate-950 dark:text-slate-50">Usunąć regułę?</h2></header>
        <footer class="flex justify-end gap-2 px-5 py-4"><AppButton variant="secondary" @click="ruleToDelete = null">Anuluj</AppButton><AppButton variant="danger" :loading="isMutating" @click="deleteRule">Usuń</AppButton></footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Pencil, Plus, Trash2, X } from 'lucide-vue-next'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect, { type AppSelectOption } from '@/components/ui/AppSelect.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import EmailChipInput from '@/components/ui/EmailChipInput.vue'
import { useNotificationStore } from '@/stores/notificationStore'
import { useUiStore } from '@/stores/uiStore'
import type { CountryEventHistoryItem, CountryEventRule, CountryEventType, CountryVehicleScope, VignetteStatus } from '@/types/notifications'

const notificationStore = useNotificationStore()
const uiStore = useUiStore()
const { countryRules, countryHistory, isLoadingCountryRules, isLoadingCountryHistory, isMutating } = storeToRefs(notificationStore)
const activeTab = ref<'rules' | 'history'>('rules')
const isModalOpen = ref(false)
const ruleToDelete = ref<CountryEventRule | null>(null)
const formError = ref('')
const form = reactive({ id: null as number | null, countryCode: '', eventType: 'country_entry' as CountryEventType, vehicleScope: 'all' as CountryVehicleScope, enabled: true, recipients: [] as string[] })
const tabs = [{ value: 'rules' as const, label: 'Reguły' }, { value: 'history' as const, label: 'Historia' }]
const eventTypeOptions: AppSelectOption[] = [{ value: 'country_entry', label: 'Wjazd do kraju' }, { value: 'vignette_check', label: 'Kontrola winiety' }]
const scopeOptions: AppSelectOption[] = [{ value: 'all', label: 'Wszystkie pojazdy' }, { value: 'trucks', label: 'Ciągniki' }, { value: 'trailers', label: 'Naczepy' }]

function resetForm(rule?: CountryEventRule) {
  Object.assign(form, rule ? { ...rule, recipients: [...rule.recipients] } : { id: null, countryCode: '', eventType: 'country_entry', vehicleScope: 'all', enabled: true, recipients: [] })
  formError.value = ''
}
function openCreateModal() { resetForm(); isModalOpen.value = true }
function openEditModal(rule: CountryEventRule) { resetForm(rule); isModalOpen.value = true }
function closeModal() { if (!isMutating.value) isModalOpen.value = false }

async function saveRule() {
  const countryCode = form.countryCode.trim().toUpperCase() === 'UK' ? 'GB' : form.countryCode.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(countryCode)) { formError.value = 'Podaj dwuliterowy kod kraju ISO.'; return }
  if (form.eventType === 'vignette_check' && !['GB', 'LU', 'DK'].includes(countryCode)) { formError.value = 'Kontrola winiety jest dostępna dla GB, LU i DK.'; return }
  if (form.enabled && !form.recipients.length) { formError.value = 'Aktywna reguła wymaga przynajmniej jednego odbiorcy.'; return }
  const duplicate = countryRules.value.some((rule) => rule.id !== form.id && rule.countryCode === countryCode && rule.eventType === form.eventType && rule.vehicleScope === form.vehicleScope)
  if (duplicate) { formError.value = 'Taka reguła już istnieje.'; return }
  try {
    await notificationStore.saveCountryRule({ countryCode, eventType: form.eventType, vehicleScope: form.vehicleScope, enabled: form.enabled, recipients: form.recipients }, form.id)
    isModalOpen.value = false
    uiStore.addToast({ type: 'success', title: 'Reguła zapisana', message: 'Zaktualizowano powiadomienia krajowe.' })
  } catch { /* Global interceptor displays the error. */ }
}

async function deleteRule() {
  if (!ruleToDelete.value) return
  try { await notificationStore.deleteCountryRule(ruleToDelete.value.id); ruleToDelete.value = null; uiStore.addToast({ type: 'success', title: 'Reguła usunięta', message: 'Usunięto regułę krajową.' }) } catch { /* Global interceptor displays the error. */ }
}

function eventTypeLabel(value: CountryEventType) { return value === 'country_entry' ? 'Wjazd do kraju' : 'Kontrola winiety' }
function scopeLabel(value: CountryVehicleScope) { return { all: 'Wszystkie pojazdy', trucks: 'Ciągniki', trailers: 'Naczepy' }[value] }
function vignetteLabel(value: VignetteStatus) { return { valid: 'Ważna', missing: 'Brak', expired: 'Wygasła' }[value] }
function vignetteVariant(value: VignetteStatus): 'success' | 'warning' | 'error' { return value === 'valid' ? 'success' : value === 'missing' ? 'warning' : 'error' }
function formatEventDate(event: CountryEventHistoryItem) { const value = event.occurredAt || event.createdAt; return value ? new Date(value).toLocaleString('pl-PL') : '—' }

watch(activeTab, (tab) => { if (tab === 'history' && !countryHistory.value.length) void notificationStore.loadCountryHistory(0, 100, { silent: true }) })
onMounted(() => { void notificationStore.loadCountryRules({ silent: true }) })
</script>

<style scoped>
.action-button, .icon-button { display:inline-flex; height:2rem; align-items:center; justify-content:center; gap:.25rem; border-radius:.75rem; padding:0 .5rem; color:rgb(var(--rw-app-muted)); font-size:.75rem; font-weight:500; transition:background-color 150ms,color 150ms; }
.action-button:hover, .icon-button:hover { background:rgb(var(--rw-app-hover)); color:rgb(var(--rw-app-text)); }
.icon-button { width:2rem; padding:0; }
</style>
