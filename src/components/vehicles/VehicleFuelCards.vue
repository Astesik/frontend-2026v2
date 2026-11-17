<template>
  <section class="space-y-3 pb-4" aria-label="Karty paliwowe pojazdu">
    <p v-if="loading" class="ui-body-sm text-ui-mutedText" role="status">Pobieranie kart paliwowych…</p>
    <div v-else-if="loadError" class="space-y-2">
      <p class="ui-error" role="alert">{{ loadError }}</p>
      <AppButton size="sm" variant="secondary" @click="load">Spróbuj ponownie</AppButton>
    </div>
    <div v-else class="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
      <AppCard v-for="group in groups" :key="group.id" :title="group.label" :icon="CreditCard" compact>
        <div class="space-y-3">
          <template v-if="group.active">
            <p class="text-base font-semibold tabular-nums text-ui-text">{{ group.active.maskedNumber }}</p>
            <p class="ui-caption">Od {{ dateLabel(group.active.validFrom) }}<br>Do {{ group.active.validTo ? dateLabel(group.active.validTo) : 'odwołania' }}</p>
            <p v-if="group.holder" class="break-words ui-body-sm text-ui-text">U posiadacza: {{ group.holder.holderName }}</p>
          </template>
          <p v-else class="ui-body-sm text-ui-mutedText">Brak aktywnego przypisania.</p>

          <div v-if="canManage" class="flex flex-wrap gap-2">
            <AppButton size="sm" variant="secondary" @click="open({ kind: 'assign', provider: group.id })">
              <Plus class="h-4 w-4" />Przypisz
            </AppButton>
            <template v-if="group.active">
              <AppButton v-if="!group.holder" size="sm" variant="secondary" @click="open({ kind: 'issue', assignment: group.active })">Wydaj</AppButton>
              <AppButton v-else size="sm" variant="secondary" @click="open({ kind: 'return', assignment: group.active, issue: group.holder })">Zwrot</AppButton>
              <AppButton size="sm" variant="ghost" @click="open({ kind: 'end', assignment: group.active })">Zakończ</AppButton>
            </template>
          </div>

          <details v-if="group.assignments.length" class="border-t border-ui-divider pt-2">
            <summary class="cursor-pointer ui-body-sm font-medium text-ui-text">Historia przypisań</summary>
            <ul class="mt-2 divide-y divide-ui-divider">
              <li v-for="assignment in group.assignments" :key="assignment.id" class="space-y-1 py-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-medium tabular-nums">{{ assignment.maskedNumber }}</span>
                  <AppBadge v-if="assignment.voidedAt" variant="neutral">Unieważnione</AppBadge>
                  <AppBadge v-else-if="Date.parse(assignment.validFrom) > now" variant="info">Zaplanowane</AppBadge>
                </div>
                <p class="ui-caption">{{ dateLabel(assignment.validFrom) }} – {{ assignment.validTo ? dateLabel(assignment.validTo) : 'bez terminu' }}</p>
                <AppButton
                  v-if="canManage && !assignment.voidedAt && assignment.id !== group.active?.id && Date.parse(assignment.validFrom) <= now"
                  size="sm" variant="ghost" @click="open({ kind: 'issue', assignment })"
                >Zapisz wydanie</AppButton>
                <AppButton v-if="canManage && !assignment.voidedAt" size="sm" variant="ghost"
                  @click="open({ kind: 'void', assignment })">Unieważnij</AppButton>
              </li>
            </ul>
          </details>
          <details v-if="group.issues.length" class="border-t border-ui-divider pt-2">
            <summary class="cursor-pointer ui-body-sm font-medium text-ui-text">Wydania i zwroty</summary>
            <ul class="mt-2 divide-y divide-ui-divider">
              <li v-for="{ issue, assignment } in group.issues" :key="issue.id" class="space-y-1 py-2">
                <p class="break-words ui-body-sm text-ui-text">{{ issue.holderName }} · {{ assignment.maskedNumber }}</p>
                <p class="ui-caption">Wydano {{ dateLabel(issue.issuedAt) }}</p>
                <p class="ui-caption">{{ issue.returnedAt ? 'Zwrócono ' + dateLabel(issue.returnedAt) : 'Oczekuje na zwrot' }}</p>
                <AppButton v-if="canManage && !issue.returnedAt" size="sm" variant="ghost" @click="open({ kind: 'return', assignment, issue })">Zarejestruj zwrot</AppButton>
              </li>
            </ul>
          </details>
        </div>
      </AppCard>
    </div>

    <AppModal :open="!!action" :title="modalTitle" size="sm" :busy="saving" @close="action = null">
      <form id="fuel-card-action" class="space-y-3" @submit.prevent="submit">
        <AppInput v-if="action?.kind === 'assign'" v-model="cardNumber" label="Numer karty" :maxlength="100" :disabled="saving" required />
        <AppInput v-if="action?.kind === 'issue'" v-model="holderName" label="Komu wydano kartę" :maxlength="160" :disabled="saving" required />
        <p v-if="action?.kind === 'void'" class="ui-body-sm">Tankowania z tego okresu zostaną odpięte od pojazdu i pozostaną w historii importu.</p>
        <AppDateTimePicker v-else
          v-model="when" :label="action?.kind === 'assign' ? 'Przypisz od' : 'Data i godzina'"
          placeholder="Teraz" :disabled="saving"
        />
        <AppDateTimePicker v-if="action?.kind === 'assign'" v-model="until" label="Przypisz do" placeholder="Bez terminu" :disabled="saving" />
        <AppDateTimePicker v-if="action?.kind === 'issue'" v-model="until" label="Data zwrotu" placeholder="Karta jeszcze nie została zwrócona" :disabled="saving" />
        <p v-if="action?.kind === 'assign'" class="ui-caption">Przed wymianą karty zakończ poprzednie przypisanie z datą wymiany.</p>
        <p v-if="formError" class="ui-error" role="alert">{{ formError }}</p>
      </form>
      <template #footer>
        <AppButton variant="secondary" :disabled="saving" @click="action = null">Anuluj</AppButton>
        <AppButton type="submit" form="fuel-card-action" :loading="saving">{{ action?.kind === 'void' ? 'Unieważnij' : 'Zapisz' }}</AppButton>
      </template>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { IconCreditCard as CreditCard, IconPlus as Plus } from '@tabler/icons-vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppCard from '@/components/ui/AppCard.vue'
import AppDateTimePicker from '@/components/ui/AppDateTimePicker.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { getApiErrorMessage } from '@/services/api'
import {
  fuelCardService, fuelCardProviders, type FuelCardAssignment, type FuelCardHistory, type FuelCardIssue, type FuelCardProvider,
} from '@/services/fuelCardService'
import { HISTORY_TIMEZONE, historyLocalInstant } from '@/utils/historyTime'

const props = defineProps<{ vehicleId: number; canManage: boolean }>()
type Action =
  | { kind: 'assign'; provider: FuelCardProvider }
  | { kind: 'end' | 'issue' | 'void'; assignment: FuelCardAssignment }
  | { kind: 'return'; assignment: FuelCardAssignment; issue: FuelCardIssue }

const action = ref<Action | null>(null)
const history = ref<FuelCardHistory>({ assignments: [], issues: [] })
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const formError = ref('')
const cardNumber = ref('')
const holderName = ref('')
const when = ref('')
const until = ref('')
const now = ref(Date.now())

const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'short', timeStyle: 'short', timeZone: HISTORY_TIMEZONE,
})
const dateLabel = (value: string) => dateFormatter.format(new Date(value))
const coversNow = (start: string, end: string | null) => Date.parse(start) <= now.value && (!end || now.value < Date.parse(end))
const groups = computed(() => fuelCardProviders.map(provider => {
  const assignments = history.value.assignments.filter(assignment => assignment.provider === provider.id)
  const active = assignments.find(assignment => !assignment.voidedAt && coversNow(assignment.validFrom, assignment.validTo))
  const holder = active && history.value.issues.find(issue => issue.cardId === active.cardId && coversNow(issue.issuedAt, issue.returnedAt))
  const issues = history.value.issues.flatMap(issue => {
    const assignment = assignments.find(item => item.cardId === issue.cardId)
    return assignment ? [{ issue, assignment }] : []
  })
  return { ...provider, assignments, active, holder, issues }
}))

const modalTitle = computed(() => {
  const request = action.value
  switch (request?.kind) {
    case 'assign': return 'Przypisz kartę ' + (fuelCardProviders.find(provider => provider.id === request.provider)?.label ?? '')
    case 'end': return 'Zakończ przypisanie'
    case 'void': return 'Unieważnij przypisanie'
    case 'issue': return 'Wydaj kartę'
    case 'return': return 'Zarejestruj zwrot karty'
    default: return ''
  }
})

onMounted(load)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    history.value = await fuelCardService.history(props.vehicleId)
    now.value = Date.now()
  } catch (error) {
    loadError.value = getApiErrorMessage(error)
  } finally {
    loading.value = false
  }
}

function open(next: Action) {
  action.value = next
  cardNumber.value = ''
  holderName.value = ''
  when.value = ''
  until.value = ''
  formError.value = ''
}

async function submit() {
  const request = action.value
  if (!request || saving.value || !props.canManage) return
  saving.value = true
  formError.value = ''
  try {
    const at = (when.value ? historyLocalInstant(when.value) : new Date()).toISOString()
    const end = until.value ? historyLocalInstant(until.value).toISOString() : null
    switch (request.kind) {
      case 'assign':
        await fuelCardService.assign(props.vehicleId, {
          provider: request.provider,
          cardNumber: cardNumber.value.trim(),
          validFrom: at,
          validTo: end,
        })
        break
      case 'void':
        await fuelCardService.voidAssignment(props.vehicleId, request.assignment.id)
        break
      case 'end':
        await fuelCardService.end(props.vehicleId, request.assignment.id, at)
        break
      case 'issue':
        await fuelCardService.issue(props.vehicleId, request.assignment.id, holderName.value.trim(), at, end)
        break
      case 'return':
        await fuelCardService.returnCard(props.vehicleId, request.assignment.id, request.issue.id, at)
        break
    }
    action.value = null
    await load()
  } catch (error) {
    formError.value = getApiErrorMessage(error)
  } finally {
    saving.value = false
  }
}
</script>
