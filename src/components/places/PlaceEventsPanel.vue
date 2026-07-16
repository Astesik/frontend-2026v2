<template>
  <div class="space-y-5">
    <section>
      <h3 class="text-sm font-semibold text-slate-950 dark:text-slate-50">Reguły zdarzeń</h3>
      <div class="mt-3 space-y-3">
        <article v-for="definition in definitions" :key="definition.type" class="rounded-2xl border border-slate-100 p-3 dark:border-app-border">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-slate-950 dark:text-slate-50">{{ definition.label }}</p>
              <p class="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{{ definition.description }}</p>
            </div>
            <AppSwitch v-model="forms[definition.type].enabled" class="shrink-0" label="Aktywna" />
          </div>
          <AppSelect v-model="forms[definition.type].vehicleScope" class="mt-3" label="Zakres pojazdów" :options="scopeOptions" size="sm" />
          <EmailChipInput v-model="forms[definition.type].recipients" class="mt-3" label="Odbiorcy" />
          <div class="mt-3 flex flex-wrap justify-end gap-2">
            <AppButton v-if="hasRule(definition.type)" size="sm" variant="ghost" :loading="isMutating" @click="removeRule(definition.type)">Usuń regułę</AppButton>
            <AppButton size="sm" variant="secondary" :loading="isMutating" @click="saveRule(definition.type)">Zapisz</AppButton>
          </div>
        </article>
      </div>
    </section>

    <section class="border-t border-slate-100 pt-4 dark:border-app-border">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-sm font-semibold text-slate-950 dark:text-slate-50">Historia strefy</h3>
        <AppBadge>{{ events.length }}</AppBadge>
      </div>
      <div class="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
        <article v-for="(event, index) in events" :key="event.id || index" class="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-app-dark">
          <div class="min-w-0">
            <p class="text-xs font-semibold text-slate-950 dark:text-slate-50">{{ event.eventType === 'entry' ? 'Wjazd do strefy' : 'Wyjazd ze strefy' }} · {{ event.vehicleLicensePlate || event.vehicle?.licensePlate || `Pojazd #${event.vehicleId || event.vehicle?.id || '—'}` }}</p>
            <p class="mt-1 truncate text-[11px] text-slate-500 dark:text-app-muted">{{ eventPosition(event) }} · {{ event.notificationRecipients.join(', ') || 'Bez odbiorców' }}</p>
            <p v-if="event.changedRepair?.id" class="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">Naprawa #{{ event.changedRepair.id }} → {{ event.changedRepair.status === 'at_location' ? 'W lokalizacji' : event.changedRepair.status }}</p>
          </div>
          <time class="shrink-0 text-[10px] text-slate-400">{{ formatDate(event.occurredAt || event.createdAt) }}</time>
        </article>
        <p v-if="!events.length" class="py-4 text-center text-xs text-slate-500 dark:text-slate-400">Brak zdarzeń dla tej strefy.</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, watch } from 'vue'
import { storeToRefs } from 'pinia'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSelect, { type AppSelectOption } from '@/components/ui/AppSelect.vue'
import AppSwitch from '@/components/ui/AppSwitch.vue'
import EmailChipInput from '@/components/ui/EmailChipInput.vue'
import { usePlaceStore } from '@/stores/placeStore'
import { useUiStore } from '@/stores/uiStore'
import type { PlaceEventRuleType, PlaceVehicleScope } from '@/types/place'

const props = defineProps<{ placeId: number }>()
const placeStore = usePlaceStore()
const uiStore = useUiStore()
const { eventRulesByPlace, vehicleEventsByPlace, isMutating } = storeToRefs(placeStore)
const definitions: Array<{ type: PlaceEventRuleType; label: string; description: string }> = [
  { type: 'email_notification', label: 'Powiadomienie e-mail', description: 'Wysyła wiadomość przy wjeździe i wyjeździe pojazdu ze strefy.' },
  { type: 'repair_status_change', label: 'Zmiana statusu naprawy', description: 'Przy wjeździe zmienia zaplanowaną naprawę bieżącego tygodnia na „W lokalizacji” i wysyła e-mail.' },
]
const forms = reactive<Record<PlaceEventRuleType, { enabled: boolean; vehicleScope: PlaceVehicleScope; recipients: string[] }>>({
  email_notification: { enabled: false, vehicleScope: 'all', recipients: [] },
  repair_status_change: { enabled: false, vehicleScope: 'all', recipients: [] },
})
const scopeOptions: AppSelectOption[] = [
  { value: 'all', label: 'Wszystkie pojazdy' },
  { value: 'trucks', label: 'Ciągniki' },
  { value: 'trailers', label: 'Naczepy' },
]
const rules = computed(() => eventRulesByPlace.value[String(props.placeId)] || [])
const events = computed(() => vehicleEventsByPlace.value[String(props.placeId)] || [])

function syncForms() {
  definitions.forEach(({ type }) => {
    const rule = rules.value.find((item) => item.eventType === type)
    forms[type].enabled = rule?.enabled ?? false
    forms[type].vehicleScope = rule?.vehicleScope ?? 'all'
    forms[type].recipients = [...(rule?.recipients || [])]
  })
}

function hasRule(type: PlaceEventRuleType) { return rules.value.some((rule) => rule.eventType === type) }

async function load() {
  await placeStore.loadVehicleEvents(props.placeId, { silent: true }).catch(() => undefined)
  syncForms()
}

async function saveRule(type: PlaceEventRuleType) {
  if (forms[type].enabled && !forms[type].recipients.length) {
    uiStore.addToast({ type: 'warning', title: 'Brak odbiorców', message: 'Aktywna reguła wymaga przynajmniej jednego adresu e-mail.' })
    return
  }
  try {
    await placeStore.saveEventRule(props.placeId, type, forms[type].enabled, forms[type].vehicleScope, forms[type].recipients)
    uiStore.addToast({ type: 'success', title: 'Reguła zapisana', message: 'Zaktualizowano regułę strefy.' })
  } catch { /* Global interceptor displays the error. */ }
}

async function removeRule(type: PlaceEventRuleType) {
  try {
    await placeStore.deleteEventRule(props.placeId, type)
    forms[type] = { enabled: false, vehicleScope: 'all', recipients: [] }
    uiStore.addToast({ type: 'success', title: 'Reguła usunięta', message: 'Usunięto regułę strefy.' })
  } catch { /* Global interceptor displays the error. */ }
}

function formatDate(value?: string | null) { return value ? new Date(value).toLocaleString('pl-PL') : '—' }
function eventPosition(event: { position?: { lat?: number | null; lon?: number | null } | null }) {
  const lat = event.position?.lat
  const lon = event.position?.lon
  return typeof lat === 'number' && typeof lon === 'number' ? `${lat.toFixed(5)}, ${lon.toFixed(5)}` : 'Brak pozycji'
}

watch(rules, syncForms, { deep: true, immediate: true })
watch(() => props.placeId, load)
onMounted(load)
</script>
