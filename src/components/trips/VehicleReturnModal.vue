<template>
  <AppModal :open="open" :title="store.currentEntry ? 'Edytuj zjazd / wyjazd' : 'Dodaj zjazd / wyjazd'" size="md" :busy="store.isMutating" :close-on-backdrop="false" panel-class="!fixed inset-0 !h-dvh !max-h-none !rounded-none sm:!relative sm:inset-auto sm:!h-[38rem] sm:!max-h-[calc(100dvh-2.5rem)] sm:!rounded-[var(--rw-radius-panel)]" @close="close">
    <form id="vehicle-return-form" class="min-w-0" @submit.prevent="save">
      <section class="min-w-0 space-y-3">
        <p class="ui-caption">{{ returnWeekLabel(form.weekStart) }}</p>
        <p v-if="formError" class="ui-error" role="alert">{{ formError }}</p>
        <div v-if="store.conflict" class="rounded-[6px] border border-warning-100 bg-warning-50 p-3 text-warning-600 dark:border-warning-400/40 dark:bg-warning-400/10 dark:text-warning-400">
          <p class="ui-body-sm font-semibold">Wpis został zmieniony przez inną osobę. Twoje zmiany pozostały w formularzu.</p>
          <p class="mt-2 text-xs">Aktualna wersja: {{ store.conflict.version }} · {{ returnWeekLabel(store.conflict.weekStart) }}</p>
          <p class="mt-1 text-xs">Stacja zjazd: {{ stationLabel(store.conflict.returnStationStatus) }} · Stacja wyjazd: {{ stationLabel(store.conflict.departureStationStatus) }}</p>
          <p class="mt-1 text-xs break-words">Uwagi: {{ store.conflict.notes || '—' }}</p>
          <AppButton size="sm" variant="secondary" class="mt-3" @click="reloadConflict">Wczytaj aktualne dane</AppButton>
        </div>
        <AppSearchSelect v-model="form.truckId" label="Ciągnik" placeholder="Wybierz ciągnik" :options="truckOptions" :disabled="store.dictionariesLoading || !canReadVehicles || store.isMutating" />
        <AppSearchSelect v-model="form.trailerId" label="Naczepa" :options="trailerOptions" :disabled="store.dictionariesLoading || !canReadVehicles || store.isMutating" />
        <AppDatePicker v-model="form.tripStartedOn" label="Rozpoczęcie obecnej trasy" :disabled="store.isMutating" />
        <AppTextarea v-model="form.notes" label="Uwagi" :maxlength="4000" show-counter :rows="4" :disabled="store.isMutating" />
        <p v-if="!canReadVehicles" class="ui-caption">Wybór pojazdów wymaga uprawnienia do ich odczytu.</p>
        <p v-if="duplicate" class="rounded-[6px] border border-warning-100 bg-warning-50 p-3 ui-body-sm text-warning-600 dark:border-warning-400/40 dark:bg-warning-400/10 dark:text-warning-400">Ten ciągnik ma już wpis w wybranym tygodniu. Możesz dodać kolejny zjazd.</p>
      </section>
    </form>
    <template #footer>
      <AppButton variant="secondary" :disabled="store.isMutating" @click="close">Anuluj</AppButton>
      <AppButton form="vehicle-return-form" type="submit" :loading="store.isMutating" :disabled="!canSave || !form.truckId || store.dictionariesLoading || Boolean(store.conflict)"><Check class="h-4 w-4" />{{ store.currentEntry ? 'Zapisz' : 'Dodaj pojazd' }}</AppButton>
    </template>
  </AppModal>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check } from 'lucide-vue-next'
import AppModal from '@/components/ui/AppModal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSearchSelect from '@/components/ui/AppSearchSelect.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import { useFleetStore } from '@/stores/fleetStore'
import { returnVehicleOptions } from '@/utils/vehicleReturnPresentation'
import { useVehicleReturnStore } from '@/stores/vehicleReturnStore'
import { useVehicleReturnPermissions } from '@/composables/useVehicleReturnPermissions'
import { businessToday, newReturnForm, returnFormWrite, returnStationOptions, returnWeekLabel } from '@/utils/vehicleReturn'
import { getApiErrorMessage } from '@/services/api'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const store = useVehicleReturnStore()
const fleet = useFleetStore()
const { canCreate, canUpdate, canReadVehicles } = useVehicleReturnPermissions()
const form = computed(() => store.draft)
const formError = ref('')
const timezone = computed(() => store.week?.timezone || 'Europe/Warsaw')
const canSave = computed(() => store.currentEntry ? canUpdate.value : canCreate.value)
const duplicate = computed(() => (store.week?.weekStart === form.value.weekStart ? store.entries : store.draftWeekEntries).some((entry) => entry.id !== store.currentEntry?.id && String(entry.truck.id) === form.value.truckId))
function vehicleOptions(type: string) {
  return returnVehicleOptions(fleet.apiVehicles, type, type === 'TRUCK' ? store.currentEntry?.truck : store.currentEntry?.trailer)
}
const truckOptions = computed(() => vehicleOptions('TRUCK'))
const trailerOptions = computed(() => [{value:'', label:'Bez naczepy'}, ...vehicleOptions('TRAILER')])
function stationLabel(value: string) { return returnStationOptions.find((option) => option.value === value)?.label || value }
function close() { if (!store.isMutating) emit('close') }
function reloadConflict() {
  if (!store.conflict) return
  store.currentEntry = store.conflict
  store.draft = newReturnForm(store.selectedWeekStart, store.currentEntry)
  store.conflict = null
  formError.value = ''
}
async function save() {
  if (!canSave.value || store.isMutating || store.conflict) return
  formError.value = ''
  if (!form.value.truckId) { formError.value = 'Wybierz ciągnik.'; return }
  if (form.value.notes.length > 4000) { formError.value = 'Uwagi mogą mieć maksymalnie 4000 znaków.'; return }
  if (form.value.tripStartedOn && form.value.tripStartedOn > businessToday(timezone.value)) { formError.value = 'Data rozpoczęcia trasy nie może być w przyszłości.'; return }
  try {
    const response = await store.mutate(returnFormWrite(form.value, store.currentEntry), store.currentEntry || undefined)
    if (response) { emit('close'); void store.loadWeek() }
  } catch (cause) { formError.value = getApiErrorMessage(cause) }
}
watch(() => props.open, async (open) => {
  if (!open) return
  formError.value = ''
  store.draft = newReturnForm(store.selectedWeekStart, store.currentEntry)
  await store.loadDictionaries(canReadVehicles.value, false)
})
watch(() => [props.open, form.value.weekStart] as const, ([open, start]) => {
  if (open) void store.loadDraftWeek(start)
})
watch(() => [props.open, form.value.truckId, form.value.trailerId] as const, ([open, truckId, trailerId], previous) => {
  if (!open) return
  if (previous?.[0] && truckId !== previous[1] && truckId !== String(store.currentEntry?.truck.id || '')) {
    form.value.returnDriver = 'CURRENT'
    form.value.departureDriver = 'NONE'
  }
  void store.loadPreview(truckId ? Number(truckId) : null, trailerId ? Number(trailerId) : null)
})
</script>
