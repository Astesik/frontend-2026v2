<template>
  <div
    ref="repairsViewRoot"
    class="flex min-h-full w-full min-w-0 max-w-full flex-col gap-5 overflow-x-hidden md:h-full md:min-h-0 md:overflow-hidden"
  >
    <header class="flex min-w-0 shrink-0 flex-wrap items-end justify-between gap-3">
      <AppInput
        v-model="repairSearch"
        class="w-full min-w-0 sm:w-64"
        label="Szukaj"
        placeholder="Tablica, miejsce, usterka"
        size="sm"
        clearable
      />
      <AppButton class="w-full min-w-0 sm:w-64" size="sm" :disabled="!canCreateRepairs" @click="openCreateModal">
        <Plus class="h-4 w-4" />
        Dodaj nową naprawę
      </AppButton>
    </header>

    <div v-if="isLoading" class="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm dark:border-app-border dark:bg-app-panel dark:text-slate-400">
      Pobieranie napraw...
    </div>

    <section v-else-if="normalizedRepairSearch" data-repairs-scroll-key="search" class="min-w-0 space-y-3 md:min-h-0 md:flex-1 md:overflow-y-auto">
      <header class="flex items-center gap-2">
        <h2 class="ui-section-title">Wyniki wyszukiwania</h2>
        <AppBadge aria-live="polite">{{ searchResults.length }}</AppBadge>
      </header>

      <p v-if="!searchResults.length" class="ui-empty-state">Brak pasujących napraw.</p>
      <div v-else class="space-y-2">
        <article
          v-for="repair in searchResults.slice(0, visibleSearchLimit)"
          :key="repair.id"
          role="link"
          tabindex="0"
          class="repair-board-card cursor-pointer"
          @click="openRepairDetails(repair)"
          @keydown.enter.self.prevent="openRepairDetails(repair)"
        >
          <RepairCardContent :repair="repair" show-country-flag />
        </article>

        <AppButton v-if="searchResults.length > visibleSearchLimit" full-width size="sm" variant="secondary" @click="visibleSearchLimit += REPAIRS_PAGE_SIZE">
          Załaduj więcej
          <span class="text-ui-mutedText">({{ searchResults.length - visibleSearchLimit }})</span>
        </AppButton>
      </div>
    </section>

    <template v-else>
      <AppTabs
        v-if="!wideBoard"
        :model-value="mobileRepairStatus"
        :items="mobileStatusTabs"
        aria-label="Status napraw"
        size="sm"
        class="w-full shrink-0 [&>button]:flex-1 [&>button]:px-1"
        @update:model-value="selectMobileStatus"
      />

      <section
        data-repairs-scroll-key="board"
        class="grid min-w-0 gap-3 md:min-h-0 md:flex-1 md:auto-rows-[minmax(0,1fr)] md:overflow-hidden"
        :class="{ 'grid-cols-3': wideBoard }"
        :aria-label="wideBoard ? 'Tablica napraw' : undefined"
      >
        <div
          v-for="column in displayedRepairColumns"
          :key="column.key"
          class="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-ui-border bg-ui-surface shadow-soft"
          :class="[
            dragOverColumn === column.key ? 'ring-2 ring-inset ring-ui-focus' : '',
            isRepairColumnCollapsed(column.key) ? 'self-start' : '',
          ]"
          @dragenter.prevent="dragOverColumn = column.key"
          @dragover.prevent="dragOverColumn = column.key"
          @dragleave="dragOverColumn = null"
          @drop.prevent="dropRepairOnColumn(column)"
        >
          <h2 v-if="wideBoard && column.key === 'progress'" class="flex shrink-0 items-center gap-2 border-b border-ui-divider px-3 py-3 text-sm font-semibold text-ui-text">
            <Clock class="h-4 w-4 shrink-0 text-ui-icon" aria-hidden="true" />
            <span class="min-w-0 flex-1">{{ column.label }}</span>
            <AppBadge>{{ column.repairs.length }}</AppBadge>
          </h2>
          <h2 v-else-if="wideBoard" class="shrink-0 text-sm font-semibold text-ui-text">
            <button
              type="button"
              class="flex w-full items-center gap-1.5 px-3 py-3 text-left transition hover:bg-ui-hover"
              :class="{ 'border-b border-ui-divider': !isRepairColumnCollapsed(column.key) }"
              :aria-expanded="!isRepairColumnCollapsed(column.key)"
              :aria-controls="isRepairColumnCollapsed(column.key) ? undefined : 'repair-column-' + column.key"
              @click="toggleRepairColumn(column.key)"
            >
              <component :is="column.icon" v-if="!isRepairColumnCollapsed(column.key)" class="h-4 w-4 shrink-0 text-ui-icon" aria-hidden="true" />
              <span class="min-w-0 flex-1">{{ column.shortLabel }}</span>
              <AppBadge>{{ column.repairs.length }}</AppBadge>
              <ChevronDown
                class="h-3.5 w-3.5 shrink-0 text-ui-icon transition-transform"
                :class="{ '-rotate-90': isRepairColumnCollapsed(column.key) }"
                aria-hidden="true"
              />
            </button>
          </h2>
          <h2 v-else class="sr-only">{{ column.label }}</h2>

          <div
            v-if="!isRepairColumnCollapsed(column.key)"
            :id="'repair-column-' + column.key"
            :data-repairs-scroll-key="'column:' + column.key"
            class="min-h-0 min-w-0 flex-1 space-y-2 p-3 md:overflow-y-auto"
          >
            <article
              v-for="repair in visibleColumnRepairs(column)"
              :key="repair.id"
              role="link"
              tabindex="0"
              :draggable="canDragRepairs"
              class="repair-board-card"
              :class="[draggedRepairId === repair.id ? 'opacity-20' : '', canDragRepairs ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer']"
              @dragstart="startRepairDrag(repair, $event)"
              @drag="updateRepairDragPreview"
              @dragend="endRepairDrag"
              @click="openRepairDetails(repair)"
              @keydown.enter.self.prevent="openRepairDetails(repair)"
            >
              <RepairCardContent :repair="repair" show-country-flag />
            </article>

            <p v-if="!column.repairs.length" class="ui-empty-state">Brak napraw w tej sekcji.</p>
            <AppButton
              v-if="hasMoreColumnRepairs(column)"
              full-width
              size="sm"
              variant="secondary"
              @click="loadMoreColumnRepairs(column.key)"
            >
              Załaduj więcej
              <span class="text-ui-mutedText">({{ remainingColumnRepairs(column) }})</span>
            </AppButton>
          </div>
        </div>
      </section>
    </template>

    <RepairCreateModal
      :open="isCreateModalOpen"
      :existing-repairs="repairs"
      @close="closeCreateModal"
      @created="handleCreatedRepair"
      @open-repair="openRepairFromCreate"
    />

    <Teleport :to="workspacePortal">
      <div
        v-if="draggedRepair"
        class="pointer-events-none fixed z-[80] w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-app-border dark:bg-app-panel"
        :style="{ left: `${dragPreview.x}px`, top: `${dragPreview.y}px`, transform: 'translate(-50%, -12px)' }"
      >
        <RepairCardContent :repair="draggedRepair" />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useWorkspacePolling, useWorkspacePortal, useWorkspaceViewState } from '@/composables/useWorkspace'
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, type Component, type PropType } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import {
  IconChevronDown as ChevronDown,
  IconCircleCheck as CircleCheck,
  IconClock as Clock,
  IconListCheck as ListChecks,
  IconPlus as Plus,
} from '@tabler/icons-vue'
import AppBadge from '@/components/ui/AppBadge.vue'
import RepairStatusBadges from '@/components/repairs/RepairStatusBadges.vue'
import { normalizeRepairStatus, repairPlannedPlacesLabel, repairStatusBadgeLabel, repairStatusLabel } from '@/utils/repairPresentation'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppTabs from '@/components/ui/AppTabs.vue'
import RepairCreateModal from '@/components/repairs/RepairCreateModal.vue'
import { useAuthStore } from '@/stores/authStore'
import { useFleetStore } from '@/stores/fleetStore'
import { useRepairStore } from '@/stores/repairStore'
import { useUiStore } from '@/stores/uiStore'
import type { Repair, RepairStatus } from '@/types/repair'

type RepairColumnKey = 'new' | 'progress' | 'done'

interface RepairColumn {
  key: RepairColumnKey
  label: string
  shortLabel: string
  icon: Component
  targetStatus: RepairStatus
  repairs: Repair[]
}

const router = useRouter()
const authStore = useAuthStore()
const fleetStore = useFleetStore()
const repairStore = useRepairStore()
const uiStore = useUiStore()
const repairsViewRoot = ref<HTMLElement | null>(null)
const {
  repairs,
  isLoading,
  isMutating,
} = storeToRefs(repairStore)
const repairSearch = ref('')
const normalizedRepairSearch = computed(() => normalizeSearchValue(repairSearch.value.trim()))
const boardMedia = window.matchMedia('(min-width: 1024px)')
const wideBoard = ref(boardMedia.matches)
const mobileRepairStatus = ref<RepairStatus>('ready_to_be_repaired')
const draggedRepairId = ref<number | null>(null)
const draggedRepair = ref<Repair | null>(null)
const dragPreview = reactive({ x: 0, y: 0 })
const dragOverColumn = ref<RepairColumnKey | null>(null)
const collapsedRepairColumnKeys = ref<Set<RepairColumnKey>>(new Set())
const visibleRepairLimits = reactive<Record<RepairColumnKey, number>>({
  new: 15,
  progress: 15,
  done: 15,
})
const isCreateModalOpen = ref(false)

const REPAIRS_PAGE_SIZE = 15
const visibleSearchLimit = ref(REPAIRS_PAGE_SIZE)

const canCreateRepairs = computed(() => hasPermission('repairs.create'))
const canUpdateRepairs = computed(() => hasPermission('repairs.update'))
const canDragRepairs = computed(() => wideBoard.value && canUpdateRepairs.value && !isMutating.value)
const sortedRepairs = computed(() => uniqueRepairs(repairs.value))
const searchResults = computed(() => sortedRepairs.value.filter(repairMatchesSearch))

const repairColumns = computed<RepairColumn[]>(() => {
  const newRepairs: RepairColumn = { key: 'new', label: 'Nowe naprawy', shortLabel: 'Nowe', icon: ListChecks, targetStatus: 'new', repairs: [] }
  const ready: RepairColumn = { key: 'progress', label: 'Gotowe do naprawy', shortLabel: 'Gotowe', icon: Clock, targetStatus: 'ready_to_be_repaired', repairs: [] }
  const done: RepairColumn = { key: 'done', label: 'Zakończone', shortLabel: 'Zakończone', icon: CircleCheck, targetStatus: 'done', repairs: [] }
  const columns = { new: newRepairs, progress: ready, done }

  for (const repair of sortedRepairs.value) {
    columns[columnKeyForRepair(repair)].repairs.push(repair)
  }

  ready.repairs.sort((first, second) => Number(Boolean(second.urgent)) - Number(Boolean(first.urgent)))
  return [newRepairs, ready, done]
})

const mobileStatusTabs = computed(() => {
  const [newRepairs, ready, done] = repairColumns.value
  return [ready, newRepairs, done].map(column => ({
    value: column.targetStatus,
    label: column.shortLabel + ' · ' + column.repairs.length,
  }))
})

const displayedRepairColumns = computed(() => wideBoard.value
  ? repairColumns.value
  : repairColumns.value.filter(column => column.targetStatus === mobileRepairStatus.value))

function selectMobileStatus(value: string) {
  const column = repairColumns.value.find(item => item.targetStatus === value)
  if (column) mobileRepairStatus.value = column.targetStatus
}

const RepairCardContent = defineComponent({
  props: {
    repair: {
      type: Object as PropType<Repair>,
      required: true,
    },
    showCountryFlag: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    return () => {
      const faults = props.repair.faults || []
      const totalFaults = props.repair.totalFaults || faults.length
      const isDone = normalizeRepairStatus(props.repair.status) === 'done'
      const countryCode = repairCountryCode(props.repair)

      return h('div', { class: 'min-w-0 max-w-full overflow-hidden' }, [
        h('div', { class: 'flex min-w-0 items-start justify-between gap-2' }, [
          h('div', { class: 'flex min-w-0 items-center gap-2' }, [
            props.showCountryFlag && countryCode
              ? h('img', {
                class: 'h-4 w-4 shrink-0 rounded-full object-cover',
                src: `https://flagsapi.com/${countryCode}/flat/64.png`,
                alt: countryCode,
                loading: 'lazy',
                referrerpolicy: 'no-referrer',
              })
              : null,
            h('p', { class: 'min-w-0 truncate text-base font-semibold text-slate-950 dark:text-slate-50' }, repairVehicleLabel(props.repair)),
          ]),
          h('div', { class: 'flex min-w-0 flex-wrap justify-end gap-1.5' }, [
            isDone ? h(CircleCheck, { class: 'h-5 w-5 text-success-600 dark:text-success-400' }) : null,
            h(RepairStatusBadges, { repair: props.repair }),
          ]),
        ]),
        h('div', { class: 'mt-2 min-w-0 space-y-1 text-xs leading-5 text-slate-600 dark:text-slate-300' }, [
          h('p', { class: 'truncate' }, `Planowane miejsca: ${repairPlannedPlacesLabel(props.repair)}`),
        ]),
        h('p', { class: 'mt-2 text-[11px] font-semibold text-ui-mutedText' }, `Usterki ${props.repair.doneFaults || 0}/${totalFaults}`),
        h('ul', { class: 'mt-2 min-w-0 space-y-1 text-xs text-ui-text-secondary' }, faults.length
          ? faults.map((fault) => h('li', { key: fault.id, class: 'flex min-w-0 items-start gap-2' }, [
            fault.status === 'DONE'
              ? h(CircleCheck, { class: 'mt-0.5 h-3.5 w-3.5 shrink-0 text-success-600 dark:text-success-400' })
              : h('span', { class: 'mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-ui-border-strong' }),
            h('span', { class: 'min-w-0 whitespace-pre-wrap break-words' }, fault.description),
          ]))
          : [h('li', { class: 'text-ui-mutedText' }, 'Brak usterek w tej naprawie.')]),
      ])
    }
  },
})

function hasPermission(permission: string) {
  return authStore.canManageCompany || authStore.hasActiveCompanyPermission(permission)
}

function columnKeyForRepair(repair: Repair): RepairColumnKey {
  return columnKeyForStatus(normalizeRepairStatus(repair.status))
}

function columnKeyForStatus(status: RepairStatus): RepairColumnKey {
  if (status === 'done') return 'done'
  return status === 'ready_to_be_repaired' ? 'progress' : 'new'
}
function repairVehicleLabel(repair: Repair) {
  return repair.vehicle?.licensePlate || repair.vehicleLicensePlate || `Pojazd #${repair.vehicleId}`
}

function repairFleetVehicle(repair: Repair) {
  const vehicleId = repair.vehicle?.id ?? repair.vehicleId
  return fleetStore.vehicles.find((vehicle) => String(vehicle.backendId) === String(vehicleId)) || null
}

function repairCountryCode(repair: Repair) {
  return repairFleetVehicle(repair)?.countryCode?.toUpperCase() || null
}

function normalizeSearchValue(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pl-PL')
}

function repairMatchesSearch(repair: Repair) {
  const query = normalizedRepairSearch.value

  if (!query) {
    return true
  }

  const createdBy = repair.createdBy as { username?: string | null } | null | undefined
  const searchText = [
    repair.id,
    repairVehicleLabel(repair),
    repairPlannedPlacesLabel(repair),
    ...(repair.currentPlaces || []).map(place => place.name),
    repairStatusLabel(repair.status),
    repairStatusBadgeLabel(repair),
    repair.description,
    repair.plannedArrivalAt,
    repair.plannedDepartureAt,
    createdBy?.username,
    ...(repair.faults || []).map((fault) => fault.description),
  ].join(' ')

  return normalizeSearchValue(searchText).includes(query)
}

function repairTimestamp(repair: Repair) {
  const timestamp = new Date(repair.plannedArrivalAt || '').getTime()
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp
}

function uniqueRepairs(items: Repair[]) {
  const repairsById = new Map<number, Repair>()
  items.forEach((repair) => repairsById.set(repair.id, repair))
  return Array.from(repairsById.values()).sort((first, second) => repairTimestamp(first) - repairTimestamp(second))
}

function openCreateModal() {
  if (canCreateRepairs.value) isCreateModalOpen.value = true
}

function closeCreateModal() {
  if (!isMutating.value) isCreateModalOpen.value = false
}

function openRepairFromCreate(repair: Repair) {
  closeCreateModal()
  openRepairDetails(repair)
}

async function handleCreatedRepair() {
  await refreshAfterMutation()
}
function captureRepairsReturnPosition() {
  const contentScrollTop = document.querySelector<HTMLElement>('[data-app-scroll-container]')?.scrollTop || 0
  const nestedScrollTops: Record<string, number> = {}

  repairsViewRoot.value?.querySelectorAll<HTMLElement>('[data-repairs-scroll-key]').forEach((element) => {
    const key = element.dataset.repairsScrollKey

    if (key) {
      nestedScrollTops[key] = element.scrollTop
    }
  })

  repairStore.setRepairsReturnPosition({
    contentScrollTop,
    nestedScrollTops,
    mobileRepairStatus: mobileRepairStatus.value,
    repairSearch: repairSearch.value,
    visibleRepairCount: normalizedRepairSearch.value
      ? visibleSearchLimit.value
      : visibleRepairLimits[columnKeyForStatus(mobileRepairStatus.value)],
  })
}

async function restoreRepairsReturnPosition() {
  const position = repairStore.consumeRepairsReturnPosition()

  if (!position) {
    return
  }

  if (!wideBoard.value) {
    mobileRepairStatus.value = position.mobileRepairStatus
    repairSearch.value = position.repairSearch
    await nextTick()
    if (normalizedRepairSearch.value) visibleSearchLimit.value = position.visibleRepairCount
    else visibleRepairLimits[columnKeyForStatus(mobileRepairStatus.value)] = position.visibleRepairCount
  }

  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

  const contentScroller = document.querySelector<HTMLElement>('[data-app-scroll-container]')
  if (contentScroller) {
    contentScroller.scrollTop = position.contentScrollTop
  }

  repairsViewRoot.value?.querySelectorAll<HTMLElement>('[data-repairs-scroll-key]').forEach((element) => {
    const key = element.dataset.repairsScrollKey

    if (key && position.nestedScrollTops[key] !== undefined) {
      element.scrollTop = position.nestedScrollTops[key]
    }
  })
}

async function openRepairDetails(repair: Repair) {
  captureRepairsReturnPosition()
  await router.push({ name: 'repair-detail', params: { id: repair.id } })
  document.querySelector<HTMLElement>('[data-app-scroll-container]')?.scrollTo({ top: 0 })
}

function isRepairColumnCollapsed(columnKey: RepairColumnKey) {
  return wideBoard.value && collapsedRepairColumnKeys.value.has(columnKey)
}

function toggleRepairColumn(columnKey: RepairColumnKey) {
  const nextCollapsedKeys = new Set(collapsedRepairColumnKeys.value)

  if (nextCollapsedKeys.has(columnKey)) {
    nextCollapsedKeys.delete(columnKey)
  } else {
    nextCollapsedKeys.add(columnKey)
  }

  collapsedRepairColumnKeys.value = nextCollapsedKeys
}

function visibleColumnRepairs(column: { key: RepairColumnKey; repairs: Repair[] }) {
  return column.repairs.slice(0, visibleRepairLimits[column.key])
}

function hasMoreColumnRepairs(column: { key: RepairColumnKey; repairs: Repair[] }) {
  return column.repairs.length > visibleRepairLimits[column.key]
}

function remainingColumnRepairs(column: { key: RepairColumnKey; repairs: Repair[] }) {
  return Math.max(0, column.repairs.length - visibleRepairLimits[column.key])
}

function loadMoreColumnRepairs(columnKey: RepairColumnKey) {
  visibleRepairLimits[columnKey] += REPAIRS_PAGE_SIZE
}

function updateRepairDragPreview(event: DragEvent) {
  if (event.clientX || event.clientY) {
    dragPreview.x = event.clientX
    dragPreview.y = event.clientY
  }
}

function startRepairDrag(repair: Repair, event: DragEvent) {
  if (!canDragRepairs.value) {
    event.preventDefault()
    return
  }

  draggedRepairId.value = repair.id
  draggedRepair.value = repair
  updateRepairDragPreview(event)

  const emptyDragImage = document.createElement('div')
  emptyDragImage.style.width = '1px'
  emptyDragImage.style.height = '1px'
  emptyDragImage.style.opacity = '0'
  document.body.appendChild(emptyDragImage)
  event.dataTransfer?.setDragImage(emptyDragImage, 0, 0)
  window.setTimeout(() => emptyDragImage.remove(), 0)
}

function endRepairDrag() {
  draggedRepairId.value = null
  draggedRepair.value = null
  dragOverColumn.value = null
}

function hasOpenFaults(repair: Repair) {
  if ((repair.totalFaults || 0) > (repair.doneFaults || 0)) {
    return true
  }

  return (repair.faults || []).some((fault) => fault.status !== 'DONE')
}

async function dropRepairOnColumn(column: { key: RepairColumnKey; targetStatus: RepairStatus }) {
  const repairId = draggedRepairId.value
  endRepairDrag()
  if (!canDragRepairs.value || !repairId) {
    return
  }

  const repair = repairs.value.find((item) => item.id === repairId)

  if (!repair || columnKeyForRepair(repair) === column.key) {
    return
  }

  if (column.targetStatus === 'done' && hasOpenFaults(repair)) {
    uiStore.addToast({
      type: 'warning',
      title: 'Nie można zakończyć',
      message: 'Najpierw oznacz wszystkie usterki jako zrobione.',
    })
    return
  }

  isMutating.value = true

  try {
    await repairStore.updateRepair(repair.id, { status: column.targetStatus })
    await refreshAfterMutation()
    uiStore.addToast({
      type: 'success',
      title: 'Status zmieniony',
      message: `Przeniesiono naprawę do sekcji „${repairStatusLabel(column.targetStatus)}”.`,
    })
  } finally {
    isMutating.value = false
  }
}

async function loadRepairs(options?: { silent?: boolean }) {
  await repairStore.loadRepairs(options)
}

async function loadData() {
  await Promise.allSettled([
    repairStore.loadListData(),
    fleetStore.loadFleetData({ silent: true }),
  ])
}

async function refreshAfterMutation() {
  await Promise.allSettled([
    loadRepairs({ silent: true }),
    fleetStore.loadFleetData({ silent: true }),
  ])
}

watch(normalizedRepairSearch, () => {
  visibleSearchLimit.value = REPAIRS_PAGE_SIZE
})

function updateBoardWidth() {
  wideBoard.value = boardMedia.matches
  if (!wideBoard.value) endRepairDrag()
}

boardMedia.addEventListener('change', updateBoardWidth)
onBeforeUnmount(() => boardMedia.removeEventListener('change', updateBoardWidth))

onMounted(async () => {
  await loadData()
  await restoreRepairsReturnPosition()
})

useWorkspacePolling(async () => {
  if (!isLoading.value && !isMutating.value) await repairStore.loadRepairs({ silent: true, background: true })
}, 30_000)

const workspacePortal = useWorkspacePortal()
useWorkspaceViewState({ repairSearch })
</script>

<style scoped>
.repair-board-card {
  @apply min-w-0 overflow-hidden rounded-xl border border-ui-border bg-ui-surface p-3 text-ui-text transition hover:border-ui-border-strong hover:bg-ui-hover;
}
</style>
