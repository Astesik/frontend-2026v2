<template>
  <form class="min-w-0 space-y-3" @submit.prevent="save">
    <div class="flex flex-wrap justify-end gap-2">
      <AppButton size="sm" variant="secondary" :disabled="store.isMutating" @click="emit('cancel')"><X class="h-4 w-4" />Anuluj</AppButton>
      <AppButton size="sm" type="submit" :loading="store.isMutating" :disabled="!canUpdate || store.dictionariesLoading || !form.truckId || Boolean(store.conflict)"><Check class="h-4 w-4" />Zapisz</AppButton>
    </div>
    <p v-if="error" class="ui-error" role="alert">{{ error }}</p>
    <div v-if="store.conflict" class="rounded-[6px] border border-warning-400/40 bg-warning-400/10 p-3 text-warning-600 dark:text-warning-400">
      <p class="text-xs">Wpis zmieniła inna osoba. Twój formularz nie został nadpisany. Wczytaj aktualny wpis przed ponowną edycją.</p>
      <AppButton size="sm" variant="secondary" class="mt-2" @click="reloadConflict">Wczytaj aktualne dane</AppButton>
    </div>
    <AppSearchSelect v-model="form.truckId" label="Ciągnik" size="sm" :options="truckOptions" :disabled="!canReadVehicles || store.dictionariesLoading || store.isMutating" />
    <AppSearchSelect v-model="form.trailerId" label="Naczepa" size="sm" :options="trailerOptions" :disabled="!canReadVehicles || store.dictionariesLoading || store.isMutating" />
    <AppSearchSelect v-model="form.returnDriver" label="Kierowca zjazdu" size="sm" :options="driverOptions('returnDriver')" :disabled="!canReadDrivers || store.dictionariesLoading || store.isMutating" />
    <AppSearchSelect v-model="form.departureDriver" label="Kierowca wyjazdu" size="sm" :options="driverOptions('departureDriver')" :disabled="!canReadDrivers || store.dictionariesLoading || store.isMutating" />
    <AppDatePicker v-model="form.tripStartedOn" label="Rozpoczęcie trasy" :disabled="store.isMutating" />
    <AppTextarea v-model="form.notes" label="Uwagi" :rows="3" :maxlength="4000" show-counter :disabled="store.isMutating" />
  </form>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Check, X } from 'lucide-vue-next'
import AppButton from '@/components/ui/AppButton.vue'
import AppSearchSelect from '@/components/ui/AppSearchSelect.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import AppTextarea from '@/components/ui/AppTextarea.vue'
import { useVehicleReturnStore } from '@/stores/vehicleReturnStore'
import { useFleetStore } from '@/stores/fleetStore'
import { useVehicleReturnPermissions } from '@/composables/useVehicleReturnPermissions'
import { businessToday, newReturnForm, returnFormWrite } from '@/utils/vehicleReturn'
import { returnVehicleOptions } from '@/utils/vehicleReturnPresentation'
import { getApiErrorMessage } from '@/services/api'
const props = defineProps<{ timezone: string }>()
const emit = defineEmits<{ cancel: []; saved: [] }>()
const store = useVehicleReturnStore()
const fleet = useFleetStore()
const { canUpdate, canReadVehicles, canReadDrivers } = useVehicleReturnPermissions()
const form = computed(() => store.draft)
const error = ref('')
const truckOptions = computed(() => returnVehicleOptions(fleet.apiVehicles, 'TRUCK', store.currentEntry?.truck))
const trailerOptions = computed(() => [{ value: '', label: 'Bez naczepy' }, ...returnVehicleOptions(fleet.apiVehicles, 'TRAILER', store.currentEntry?.trailer)])
function driverOptions(field: 'returnDriver' | 'departureDriver') {
  const current = store.currentEntry?.[field]
  return [
    ...(current ? [{ value: 'KEEP', label: current.name || current.externalId || 'Zapisany kierowca' }] : []),
    { value: 'NONE', label: 'Bez kierowcy' },
    { value: 'CURRENT', label: 'Aktualny kierowca pojazdu' },
    ...store.drivers.map((driver) => ({ value: 'MANUAL_' + driver.id, label: driver.label?.trim() || 'Kierowca #' + driver.id })),
  ]
}
function reloadConflict() {
  if (!store.conflict) return
  store.currentEntry = store.conflict
  store.draft = newReturnForm(store.selectedWeekStart, store.conflict)
  store.conflict = null
  error.value = ''
}
async function save() {
  if (!canUpdate.value || store.isMutating || store.conflict || !store.currentEntry) return
  error.value = ''
  if (!form.value.truckId) { error.value = 'Wybierz ciągnik.'; return }
  if (form.value.notes.length > 4000) { error.value = 'Uwagi mogą mieć maksymalnie 4000 znaków.'; return }
  if (form.value.tripStartedOn && form.value.tripStartedOn > businessToday(props.timezone)) { error.value = 'Data rozpoczęcia trasy nie może być w przyszłości.'; return }
  try {
    if (await store.mutate(returnFormWrite(form.value, store.currentEntry), store.currentEntry)) {
      emit('saved')
      void store.loadWeek()
    }
  } catch (cause) { error.value = getApiErrorMessage(cause) }
}
watch(() => form.value.truckId, (id) => {
  if (!store.currentEntry) return
  const initial = newReturnForm(store.selectedWeekStart, store.currentEntry)
  const originalTruck = id === String(store.currentEntry.truck.id)
  form.value.returnDriver = originalTruck ? initial.returnDriver : 'CURRENT'
  form.value.departureDriver = originalTruck ? initial.departureDriver : 'NONE'
})
</script>
