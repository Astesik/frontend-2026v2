<template>
  <nav ref="tabBar" aria-label="Otwarte zakładki" class="workspace-tabs flex h-9 shrink-0 items-stretch overflow-x-auto overflow-y-hidden border-b border-ui-border bg-ui-sidebar px-2" role="tablist" @wheel="scrollTabs" @scroll="closeContextMenu(false)" @click.capture="preventDraggedClick">
    <TransitionGroup name="workspace-tab">
    <div v-for="tab in orderedTabs" :key="tab.id" :data-workspace-tab="tab.id" :data-pinned="tab.pinned" :draggable="false" class="group relative my-0.5 flex max-w-64 shrink-0 cursor-pointer touch-none select-none items-center gap-0.5 rounded-md border pr-1 transition-colors"
      :class="[tabClasses(tab), draggedId === tab.id ? 'opacity-0' : '']"
      @pointerdown="startTabDrag($event, tab)" @dragstart.prevent
      @mousedown.middle.prevent @auxclick.middle.prevent.stop="requestClose(tab.id)"
      @contextmenu="openContextMenu($event, tab.id)">
      <button type="button" role="tab" :aria-selected="tab.id === store.activeId" :aria-label="tab.title" :title="tab.title" :aria-haspopup="tab.id !== 'map' ? 'menu' : undefined" class="flex h-full min-w-0 cursor-[inherit] items-center gap-1.5 px-2 text-xs font-medium text-ui-text-secondary" @click="activate(tab)" @keydown="navigateByKey($event, tab.id)" :tabindex="tab.id === store.activeId ? 0 : -1">
        <WorkspaceTabLabel :icon="icons[tab.icon] || MapPinned" :title="tab.title" :pinned="tab.pinned" :dirty="store.dirtyIds.includes(tab.id)" />
      </button>
      <template v-if="tab.id !== 'map'">
        <button type="button" :draggable="false" class="flex h-5 w-5 shrink-0 items-center justify-center text-ui-mutedText hover:bg-ui-hover hover:text-ui-text" :aria-label="`Zamknij zakładkę ${tab.title}`" title="Zamknij zakładkę" @pointerdown.stop @dragstart.prevent.stop @click="requestClose(tab.id)"><X class="h-3.5 w-3.5" /></button>
      </template>
    </div>
    </TransitionGroup>
  </nav>
  <Teleport to="body">
    <div v-if="draggedTab" data-workspace-tab-preview aria-hidden="true" class="pointer-events-none fixed z-[350] flex select-none items-center gap-0.5 rounded-md border pr-1 shadow-popover" :class="tabClasses(draggedTab)" :style="ghostStyle">
      <span class="flex h-full min-w-0 items-center gap-1.5 px-2 text-xs font-medium text-ui-text-secondary">
        <WorkspaceTabLabel :icon="icons[draggedTab.icon] || MapPinned" :title="draggedTab.title" :pinned="draggedTab.pinned" :dirty="store.dirtyIds.includes(draggedTab.id)" />
      </span>
      <span class="flex h-5 w-5 shrink-0 items-center justify-center text-ui-mutedText"><X class="h-3.5 w-3.5" /></span>
    </div>
  </Teleport>
  <span ref="contextAnchor" class="pointer-events-none fixed h-px w-px" :style="{ left: `${contextPoint.x}px`, top: `${contextPoint.y}px` }" aria-hidden="true" />
  <AppDropdown :open="Boolean(contextTab)" :anchor="contextAnchor" role="menu" :match-width="false" :use-anchor-min-width="false" :max-height="96" :min-height="32" content-class="min-w-40 p-1" @close="closeContextMenu">
    <AppDropdownItem v-if="contextTab" ref="contextAction" role="menuitem" @click="togglePin" @keydown.tab="closeContextMenu(false)">
      <component :is="contextTab.pinned ? PinOff : Pin" class="h-3.5 w-3.5 shrink-0" />
      {{ contextTab.pinned ? 'Odepnij' : 'Przypnij' }}
    </AppDropdownItem>
  </AppDropdown>
  <AppConfirmModal :open="Boolean(store.pendingCloseId)" title="Zamknąć zakładkę?" description="Ta zakładka zawiera niezapisane zmiany. Zamknięcie spowoduje ich utratę." confirm-label="Zamknij bez zapisywania" confirm-variant="danger" @close="store.pendingCloseId = null" @confirm="closeTab(store.pendingCloseId!)" />
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { Cpu, Fuel, House, MapPinned, Pin, PinOff, Route, Settings, Truck, UserRound, Wrench, X, ChartNoAxesCombined } from 'lucide-vue-next'
import AppConfirmModal from '@/components/ui/AppConfirmModal.vue'
import AppDropdown from '@/components/ui/AppDropdown.vue'
import AppDropdownItem from '@/components/ui/AppDropdownItem.vue'
import WorkspaceTabLabel from './WorkspaceTabLabel.vue'
import { useHorizontalTabDrag } from '@/composables/useHorizontalTabDrag'
import { useWorkspaceTabsStore, type WorkspaceTab } from '@/stores/workspaceTabsStore'
const store = useWorkspaceTabsStore(), router = useRouter()
const icons: Record<string, Component> = { map: MapPinned, home: House, devices: Cpu, fuel: Fuel, trips: Route, settings: Settings, vehicles: Truck, drivers: UserRound, repairs: Wrench, reports: ChartNoAxesCombined }
const tabBar = ref<HTMLElement | null>(null)
const { orderedTabs, draggedId, draggedTab, ghostStyle, start: startDrag, cancel: cancelDrag, preventDraggedClick } = useHorizontalTabDrag(tabBar, computed(() => store.tabs), store.reorder)
watch(draggedId, id => document.documentElement.classList.toggle('workspace-tab-dragging', Boolean(id)), { flush: 'sync' })
onBeforeUnmount(() => document.documentElement.classList.remove('workspace-tab-dragging'))
function tabClasses(tab: WorkspaceTab) {
  return [tab.id === store.activeId ? 'border-ui-border-strong bg-ui-surface shadow-soft dark:border-ui-mutedText' : tab.pinned ? 'border-ui-border bg-ui-muted hover:border-ui-border-strong' : 'border-ui-border bg-ui-sidebar text-ui-mutedText hover:border-ui-border-strong hover:bg-ui-hover', tab.pinned ? 'workspace-tab-pinned' : '']
}
function startTabDrag(event: PointerEvent, tab: WorkspaceTab) { closeContextMenu(false); startDrag(event, tab) }
const contextAnchor = ref<HTMLElement | null>(null)
const contextAction = ref<InstanceType<typeof AppDropdownItem> | null>(null)
const contextPoint = ref({ x: 0, y: 0 })
const contextId = ref<string | null>(null)
const contextTab = computed(() => store.tabs.find(tab => tab.id === contextId.value))
let contextSource: HTMLElement | null = null
watch(() => router.currentRoute.value.fullPath, () => { closeContextMenu(false); cancelDrag() })
watch(() => store.epoch, () => closeContextMenu(false))
async function openContextMenu(event: MouseEvent | KeyboardEvent, id: string) {
  if (id === 'map') return
  event.preventDefault()
  cancelDrag()
  closeContextMenu(false)
  const source = event.currentTarget as HTMLElement
  contextSource = source.matches('[role="tab"]') ? source : source.querySelector<HTMLElement>('[role="tab"]')
  const rect = source.getBoundingClientRect()
  contextPoint.value = 'clientX' in event && (event.clientX !== 0 || event.clientY !== 0) ? { x: event.clientX, y: event.clientY } : { x: rect.left, y: rect.bottom }
  // Reopen after moving the anchor so the shared floating layer recalculates its bounds.
  await nextTick()
  contextId.value = id
  await nextTick()
  contextAction.value?.$el?.focus()
}
function closeContextMenu(restoreFocus = true) {
  if (!contextId.value) return
  contextId.value = null
  if (restoreFocus) contextSource?.focus()
}
function togglePin() { if (contextTab.value) store.pin(contextTab.value.id); closeContextMenu() }
async function activate(tab: WorkspaceTab) { await router.push(tab.target) }
function requestClose(id: string) {
  if (id === 'map') return
  closeContextMenu(false); cancelDrag()
  if (store.dirtyIds.includes(id)) store.pendingCloseId = id
  else void closeTab(id)
}
async function closeTab(id: string) {
  if (id === 'map') return
  if (store.activeId === id) {
    const fallback = [...store.tabs].filter(tab => tab.id !== id).sort((a, b) => b.lastUsed - a.lastUsed)[0]
    if (!fallback || await router.push(fallback.target)) return
  }
  store.close(id)
}
function moveWithKeyboard(id: string, direction: number) { const next = store.tabs[store.tabs.findIndex(tab => tab.id === id) + direction]; if (next) store.move(id, next.id) }
function scrollTabs(event: WheelEvent) { const element = event.currentTarget as HTMLElement; if (element.scrollWidth > element.clientWidth && Math.abs(event.deltaY) > Math.abs(event.deltaX)) { event.preventDefault(); element.scrollLeft += event.deltaY } }
async function navigateByKey(event: KeyboardEvent, id: string) {
  if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) { await openContextMenu(event, id); return }
  if (event.ctrlKey && event.shiftKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    const button = event.currentTarget as HTMLElement
    event.preventDefault(); moveWithKeyboard(id, event.key === 'ArrowLeft' ? -1 : 1)
    await nextTick(); button.focus(); return
  }
  const tabList = (event.currentTarget as HTMLElement).closest('[role="tablist"]')
  const index = store.tabs.findIndex(tab => tab.id === id)
  if (event.key === 'Delete' && id !== 'map') { event.preventDefault(); requestClose(id); return }
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? store.tabs.length - 1 : event.key === 'ArrowRight' ? (index + 1) % store.tabs.length : event.key === 'ArrowLeft' ? (index + store.tabs.length - 1) % store.tabs.length : -1
  if (next < 0) return
  event.preventDefault(); await activate(store.tabs[next]); await nextTick()
  const tabs = tabList?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
  tabs?.[next]?.focus()
}
</script>
<style scoped>
.workspace-tabs { scrollbar-width: none; }
.workspace-tabs::-webkit-scrollbar { display: none; }
:global(.workspace-tab-dragging), :global(.workspace-tab-dragging *) { cursor: grabbing !important; }
.workspace-tab-move { transition: transform 180ms ease-in-out; }
.workspace-tab-pinned::after { content: ''; position: absolute; bottom: 0; left: 0.5rem; right: 0.5rem; height: 2px; border-radius: 1px; background: rgb(var(--rw-text-muted)); pointer-events: none; }
@media (prefers-reduced-motion: reduce) { .workspace-tab-move { transition: none; } }
</style>
