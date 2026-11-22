<template>
  <section class="min-w-0" aria-label="Zbiorniki pojazdu">
    <AppCard
      title="Zbiorniki" :icon="IconGasStation" compact
      class="flex h-[200px] w-full flex-col [&>.ui-card-header]:flex-wrap [&>.ui-card-header]:items-center [&>.ui-card-header]:gap-2 [&>.ui-card-header]:px-3 [&>.ui-card-header]:py-2"
      content-class="relative flex min-h-0 flex-1 !p-3"
      :aria-busy="loading"
    >
      <template #actions>
        <div class="flex flex-wrap gap-1">
          <AppButton v-if="canManage" size="sm" class="!h-7 !px-2 !text-xs" :disabled="loading || !!loadError" @click="openEditor">{{ current ? 'Zmień profil' : 'Uzupełnij' }}</AppButton>
          <AppButton size="sm" variant="secondary" class="!h-7 !px-2 !text-xs" :disabled="loading || !!loadError" @click="detailsOpen = true">Szczegóły</AppButton>
        </div>
      </template>
      <AppLoadingIndicator v-if="loading" class="h-full w-full" />
      <div v-else-if="loadError" class="min-h-0 space-y-2 overflow-y-auto">
        <p class="ui-error" role="alert">{{ loadError }}</p>
        <AppButton size="sm" variant="secondary" @click="load()">Spróbuj ponownie</AppButton>
      </div>
      <VehicleFuelTankDiagram v-else :profile="current ?? null" :observation="latest ?? null" />
    </AppCard>

    <AppModal :open="detailsOpen" title="Szczegóły zbiorników" size="lg" center-in-viewport @close="detailsOpen = false">
      <div class="min-w-0 space-y-3">
        <AppCard title="Pomiary" :icon="IconActivity" compact content-class="!p-0 overflow-hidden">
          <table class="ui-table" aria-label="Pomiary paliwa i konfiguracja zbiorników">
            <thead class="ui-table-head">
              <tr class="divide-x divide-ui-divider">
                <th scope="col" class="ui-table-cell">Pomiar</th>
                <th scope="col" class="ui-table-cell">Wartość</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="view.quality" class="ui-table-row divide-x divide-ui-divider">
                <th scope="row" class="ui-table-cell font-normal">Ostatni poziom CAN</th>
                <td class="ui-table-cell">
                  <p class="font-medium tabular-nums text-ui-text">{{ latest?.percent == null ? 'Brak odczytu' : number.format(latest.percent) + '%' }}</p>
                  <p v-if="latest" class="ui-caption">{{ dateLabel(latest.source.recordedAt) }}</p>
                  <AppBadge v-if="view.quality.ageSeconds != null && view.quality.ageSeconds > 7200" variant="warning">Nieaktualny odczyt</AppBadge>
                </td>
              </tr>
              <template v-if="current">
                <tr class="ui-table-row divide-x divide-ui-divider">
                  <th scope="row" class="ui-table-cell font-normal">Źródło pomiaru</th>
                  <td class="ui-table-cell">{{ current.levelSource === 'CAN' ? 'CAN' : 'Do ustalenia' }} · {{ levelLabel[current.levelTank] }}</td>
                </tr>
                <tr class="ui-table-row divide-x divide-ui-divider">
                  <th scope="row" class="ui-table-cell font-normal">Połączenie zbiorników</th>
                  <td class="ui-table-cell">{{ connectionLabel[current.connection] }}</td>
                </tr>
                <tr class="ui-table-row divide-x divide-ui-divider">
                  <th scope="row" class="ui-table-cell font-normal">Łączna pojemność ON</th>
                  <td class="ui-table-cell font-medium tabular-nums text-ui-text">{{ number.format(dieselCapacity) }} L</td>
                </tr>
                <tr
                  v-for="tank in current.tanks.filter(item => item.usableCapacityLiters != null)" :key="tank.slot"
                  class="ui-table-row divide-x divide-ui-divider"
                >
                  <th scope="row" class="ui-table-cell font-normal">{{ slotLabel[tank.slot] }} · pojemność użytkowa</th>
                  <td class="ui-table-cell tabular-nums">{{ number.format(tank.usableCapacityLiters!) }} L</td>
                </tr>
                <tr class="ui-table-row divide-x divide-ui-divider">
                  <th scope="row" class="ui-table-cell font-normal">Konfiguracja od</th>
                  <td class="ui-table-cell tabular-nums">{{ dateLabel(current.validFrom) }}</td>
                </tr>
              </template>
              <template v-if="view.quality">
                <tr class="ui-table-row divide-x divide-ui-divider">
                  <th scope="row" class="ui-table-cell font-normal">Poziom paliwa · ostatnie 7 dni</th>
                  <td class="ui-table-cell">
                    <p class="font-medium tabular-nums text-ui-text">{{ coverage(view.quality.withFuelLevel) }}</p>
                    <p class="ui-caption">{{ number.format(view.quality.withFuelLevel) }} z {{ number.format(view.quality.samples) }} odczytów</p>
                  </td>
                </tr>
                <tr class="ui-table-row divide-x divide-ui-divider">
                  <th scope="row" class="ui-table-cell font-normal">Licznik zużycia CAN · ostatnie 7 dni</th>
                  <td class="ui-table-cell">
                    <p class="font-medium tabular-nums text-ui-text">{{ coverage(view.quality.withCanConsumption) }}</p>
                    <p class="ui-caption">{{ number.format(view.quality.withCanConsumption) }} z {{ number.format(view.quality.samples) }} odczytów</p>
                  </td>
                </tr>
              </template>
              <tr v-if="!current && !view.quality">
                <td colspan="2" class="ui-table-cell text-ui-mutedText">Uzupełnij konfigurację zbiorników, aby zobaczyć pomiary.</td>
              </tr>
            </tbody>
          </table>
        </AppCard>

        <AppCard v-if="view.profiles.length" title="Historia konfiguracji" :icon="IconHistory" compact content-class="!p-0 overflow-x-auto">
          <table class="ui-table" aria-label="Historia konfiguracji zbiorników">
            <thead class="ui-table-head">
              <tr class="divide-x divide-ui-divider">
                <th scope="col" class="ui-table-cell">Od</th>
                <th scope="col" class="ui-table-cell">Do</th>
                <th scope="col" class="ui-table-cell">Zbiorniki</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="profile in view.profiles" :key="profile.id" class="ui-table-row divide-x divide-ui-divider">
                <td class="ui-table-cell tabular-nums">{{ dateLabel(profile.validFrom) }}</td>
                <td class="ui-table-cell tabular-nums">{{ profile.validTo ? dateLabel(profile.validTo) : 'Bez terminu' }}</td>
                <td class="ui-table-cell">
                  <p v-for="tank in profile.tanks" :key="tank.slot" class="ui-caption">
                    {{ slotLabel[tank.slot] }} <span class="whitespace-nowrap tabular-nums">{{ number.format(tank.nominalCapacityLiters) }} L</span>
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </AppCard>
      </div>
    </AppModal>

    <AppModal :open="editing" title="Profil zbiorników" size="lg" center-in-viewport :busy="saving" @close="editing = false">
      <form id="fuel-tanks-form" class="space-y-4" @submit.prevent="save">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="ui-caption">Pojemność użytkową możesz uzupełnić później.</p>
          <AppButton v-if="isMan" size="sm" variant="secondary" :disabled="saving" @click="manPreset">MAN 530 / 330 / 135 l</AppButton>
        </div>
        <div v-for="tank in form.tanks" :key="tank.slot" class="space-y-2 rounded-lg border border-ui-divider p-3">
          <AppCheckbox v-model="tank.enabled" :label="slotLabel[tank.slot]" :disabled="saving" />
          <div v-if="tank.enabled" class="grid gap-3 sm:grid-cols-2">
            <AppInput v-model="tank.nominal" label="Pojemność nominalna (l)" type="number" min="0.001" max="10000" step="0.001" :disabled="saving" required />
            <AppInput v-model="tank.usable" label="Pojemność użytkowa (l)" type="number" min="0.001" :max="tank.nominal || 10000" step="0.001" :disabled="saving" placeholder="Do ustalenia" />
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <AppSelect v-model="form.connection" label="Połączenie zbiorników oleju napędowego" :options="connections" :disabled="saving" />
          <AppSelect v-model="form.levelTank" label="Odczyt poziomu paliwa CAN" :options="levelTanks" :disabled="saving" />
        </div>
        <div class="space-y-2">
          <AppDatePicker v-model="effectiveFrom" label="Konfiguracja obowiązuje od" editable required :disabled="saving || form.useFirstRegistration" />
          <AppCheckbox
            v-model="form.useFirstRegistration" label="Od daty pierwszej rejestracji pojazdu"
            :disabled="saving || !registrationDate"
          />
          <p v-if="!registrationDate" class="ui-caption">Uzupełnij datę pierwszej rejestracji w danych pojazdu, aby użyć tej opcji.</p>
        </div>
        <p v-if="formError" class="ui-error" role="alert">{{ formError }}</p>
      </form>
      <template #footer>
        <AppButton variant="secondary" :disabled="saving" @click="editing = false">Anuluj</AppButton>
        <AppButton type="submit" form="fuel-tanks-form" :loading="saving">Zapisz profil</AppButton>
      </template>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { IconActivity, IconGasStation, IconHistory } from '@tabler/icons-vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppDatePicker from '@/components/ui/AppDatePicker.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppLoadingIndicator from '@/components/ui/AppLoadingIndicator.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import VehicleFuelTankDiagram from '@/components/vehicles/VehicleFuelTankDiagram.vue'
import { getApiErrorMessage } from '@/services/api'
import { fuelTankService, type FuelTankSlot, type FuelTankView, type FuelTankProfile } from '@/services/fuelTankService'
import { HISTORY_TIMEZONE, historyLocalInstant } from '@/utils/historyTime'
import { businessToday } from '@/utils/vehicleReturn'
import { parseTypedDate } from '@/utils/date'
import { useWorkspacePolling } from '@/composables/useWorkspace'

const props = defineProps<{ vehicleId: number; canManage: boolean; make: string | null; firstRegistration: string | null }>()
const emit = defineEmits<{ saved: [] }>()
const view = ref<FuelTankView>({ profiles: [], quality: null })
const loading = ref(true), saving = ref(false), editing = ref(false)
const detailsOpen = ref(false)
const loadError = ref(''), formError = ref('')
const number = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 2 })
const date = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'short', timeStyle: 'short', timeZone: HISTORY_TIMEZONE })
const dateLabel = (value: string) => date.format(new Date(value))
const slotLabel = { LEFT: 'Lewy zbiornik', RIGHT: 'Prawy zbiornik', ADBLUE: 'Zbiornik AdBlue' }
const connectionLabel = { CONNECTED: 'Połączone', SEPARATE: 'Oddzielne', UNKNOWN: 'Do ustalenia' }
const levelLabel = { LEFT: 'Lewy zbiornik', RIGHT: 'Prawy zbiornik', UNKNOWN: 'Do ustalenia' }
const connections = Object.entries(connectionLabel).map(([value, label]) => ({ value, label }))
const levelTanks = Object.entries(levelLabel).map(([value, label]) => ({ value, label }))
const isMan = computed(() => props.make?.trim().toUpperCase() === 'MAN')
const current = computed(() => view.value.profiles.find(profile => Date.parse(profile.validFrom) <= Date.now()
  && (!profile.validTo || Date.parse(profile.validTo) > Date.now())))
const latest = computed(() => view.value.quality?.latest)
const dieselCapacity = computed(() => current.value?.tanks.filter(tank => tank.product === 'DIESEL')
  .reduce((sum, tank) => sum + tank.nominalCapacityLiters, 0) ?? 0)
const registrationDate = computed(() => parseTypedDate(props.firstRegistration?.slice(0, 10) ?? '') || '')
const slots: FuelTankSlot[] = ['LEFT', 'RIGHT', 'ADBLUE']
const form = reactive({
  previousId: null as number | null,
  connection: 'CONNECTED' as FuelTankProfile['connection'],
  levelTank: 'LEFT' as FuelTankProfile['levelTank'],
  from: '',
  useFirstRegistration: false,
  tanks: slots.map(slot => ({ slot, enabled: slot !== 'ADBLUE', nominal: '', usable: '' })),
})
const effectiveFrom = computed({
  get: () => form.useFirstRegistration ? registrationDate.value : form.from,
  set: value => { form.from = value },
})
watch(() => form.connection, connection => {
  if (connection === 'CONNECTED') {
    for (const tank of form.tanks) if (tank.slot !== 'ADBLUE') tank.enabled = true
  }
})
function coverage(count: number) {
  const total = view.value.quality?.samples ?? 0
  return total ? number.format(count / total * 100) + '%' : 'Brak odczytów'
}
async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    view.value = await fuelTankService.view(props.vehicleId)
    loadError.value = ''
  } catch (cause) {
    if (!silent) loadError.value = getApiErrorMessage(cause)
  } finally {
    if (!silent) loading.value = false
  }
}
function openEditor() {
  const latest = view.value.profiles[0]
  form.previousId = latest?.id ?? null
  form.connection = latest?.connection === 'SEPARATE' ? 'SEPARATE' : 'CONNECTED'
  form.levelTank = latest?.levelTank === 'RIGHT' ? 'RIGHT' : 'LEFT'
  form.from = businessToday()
  form.useFirstRegistration = false
  formError.value = ''
  for (const tank of form.tanks) {
    const saved = latest?.tanks.find(item => item.slot === tank.slot)
    tank.enabled = Boolean(saved) || (form.connection === 'CONNECTED' && tank.slot !== 'ADBLUE')
    tank.nominal = saved ? String(saved.nominalCapacityLiters) : ''
    tank.usable = saved?.usableCapacityLiters == null ? '' : String(saved.usableCapacityLiters)
  }
  if (!latest && isMan.value) manPreset()
  editing.value = true
}
function manPreset() {
  const capacities = { LEFT: '530', RIGHT: '330', ADBLUE: '135' }
  for (const tank of form.tanks) {
    tank.enabled = true
    tank.nominal = capacities[tank.slot]
    tank.usable = ''
  }
  form.levelTank = 'LEFT'
  form.connection = 'CONNECTED'
}
async function save() {
  if (saving.value || !props.canManage) return
  saving.value = true
  formError.value = ''
  try {
    await fuelTankService.save(props.vehicleId, {
      previousId: form.previousId,
      validFrom: historyLocalInstant(`${effectiveFrom.value}T00:00`).toISOString(),
      connection: form.connection,
      levelSource: 'CAN',
      levelTank: form.levelTank,
      tanks: form.tanks.filter(tank => tank.enabled).map(tank => ({
        slot: tank.slot, product: tank.slot === 'ADBLUE' ? 'ADBLUE' : 'DIESEL',
        nominalCapacityLiters: Number(tank.nominal), usableCapacityLiters: tank.usable ? Number(tank.usable) : null,
      })),
    })
    editing.value = false
    emit('saved')
    await load()
  } catch (cause) {
    formError.value = getApiErrorMessage(cause)
  } finally {
    saving.value = false
  }
}
onMounted(() => load())
useWorkspacePolling(() => editing.value || saving.value || loading.value ? Promise.resolve() : load(true), 30_000)
</script>
