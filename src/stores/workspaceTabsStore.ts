import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { workspaceDescriptor, type WorkspaceDescriptor, type WorkspaceViewName } from '@/workspace/registry'

export type WorkspaceTab = WorkspaceDescriptor & { pinned: boolean; target: string; lastUsed: number }
export type WorkspaceSafeState = Record<string, string | number | boolean | string[]>
export const MAX_WORKSPACE_TABS = 20

export const useWorkspaceTabsStore = defineStore('workspaceTabs', () => {
  const tabs = ref<WorkspaceTab[]>([]), activeId = ref(''), scope = ref(''), epoch = ref(0)
  const dirtyIds = ref<string[]>([])
  const scrollPositions = ref<Record<string, number>>({})
  const viewState = ref<Record<string, WorkspaceSafeState>>({})
  const pendingCloseId = ref<string | null>(null)
  const activeTab = computed(() => tabs.value.find(tab => tab.id === activeId.value))
  let clock = 0
  const storageKey = () => `routewise.workspace.v1.${scope.value}`
  function persist() {
    if (!scope.value) return
    try {
      const retained = tabs.value.filter(tab => tab.pinned || tab.id === activeId.value)
      const ids = new Set(retained.map(tab => tab.id))
      sessionStorage.setItem(storageKey(), JSON.stringify({
        tabs: retained.map(({ name, recordId, title, pinned, lastUsed }) => ({ name, recordId, title, pinned, lastUsed })),
        activeId: ids.has(activeId.value) ? activeId.value : retained[0]?.id || '',
        scroll: Object.fromEntries(Object.entries(scrollPositions.value).filter(([id]) => ids.has(id))),
        state: Object.fromEntries(Object.entries(viewState.value).filter(([id]) => ids.has(id))),
      }))
    } catch { /* A full or unavailable storage must not interrupt navigation. */ }
  }
  watch([tabs, activeId, scrollPositions, viewState], persist, { deep: true, flush: 'post' })
  function ensureContext(userId: string, companyId: string, allowed: (name: WorkspaceViewName) => boolean) {
    const nextScope = `${encodeURIComponent(userId)}.${encodeURIComponent(companyId)}`
    if (scope.value === nextScope) { reconcile(allowed); return }
    tabs.value = []; activeId.value = ''; dirtyIds.value = []; scrollPositions.value = {}; viewState.value = {}; pendingCloseId.value = null
    scope.value = nextScope; epoch.value++; clock = 0
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey()) || 'null')
      if (saved && Array.isArray(saved.tabs)) {
        for (const value of saved.tabs.slice(0, MAX_WORKSPACE_TABS)) {
          const descriptor = workspaceDescriptor(value?.name, value?.recordId)
          if (!descriptor || (descriptor.id !== 'map' && value.pinned !== true && descriptor.id !== saved.activeId) || !allowed(descriptor.name) || tabs.value.some(tab => tab.id === descriptor.id)) continue
          let title = typeof value.title === 'string' && value.title.trim().length <= 180 ? value.title.trim() || descriptor.title : descriptor.title
          if (/^(Pojazd|Urządzenie) #\d+$/.test(title)) title = descriptor.title
          if (descriptor.name === 'vehicle-detail' && title !== descriptor.title && !title.startsWith('Pojazd - ')) title = `Pojazd - ${title}`.slice(0, 180)
          tabs.value.push({ ...descriptor, title, target: descriptor.path, pinned: descriptor.id === 'map' || value.pinned === true, lastUsed: Number.isFinite(value.lastUsed) ? value.lastUsed : 0 })
          const scroll = saved.scroll?.[descriptor.id]
          if (typeof scroll === 'number' && Number.isFinite(scroll) && scroll >= 0) scrollPositions.value[descriptor.id] = scroll
          // Only explicitly registered, small, scalar UI preferences are persisted.
          const state = saved.state?.[descriptor.id]
          if (state && typeof state === 'object') {
            const safe: WorkspaceSafeState = {}
            for (const [key, item] of Object.entries(state)) {
              if (key.length > 80) continue
              if ((typeof item === 'string' && item.length <= 2000) || typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item)) || (Array.isArray(item) && item.length <= 100 && item.every(value => typeof value === 'string' && value.length <= 100))) safe[key] = item as WorkspaceSafeState[string]
            }
            viewState.value[descriptor.id] = safe
          }
        }
        if (tabs.value.some(tab => tab.id === saved.activeId)) activeId.value = saved.activeId
        clock = Math.max(0, ...tabs.value.map(tab => tab.lastUsed))
      }
    } catch { /* Malformed saved workspaces are discarded. */ }
    reconcile(allowed)
  }
  function reconcile(allowed: (name: WorkspaceViewName) => boolean) {
    tabs.value = tabs.value.filter(tab => allowed(tab.name))
    if (allowed('map') && !tabs.value.some(tab => tab.id === 'map')) {
      const map = workspaceDescriptor('map')!
      tabs.value.unshift({ ...map, pinned: true, target: map.path, lastUsed: 0 })
    }
    tabs.value = [...tabs.value.filter(tab => tab.id === 'map'), ...tabs.value.filter(tab => tab.id !== 'map' && tab.pinned), ...tabs.value.filter(tab => !tab.pinned && tab.id !== 'map')].slice(0, MAX_WORKSPACE_TABS)
    const ids = new Set(tabs.value.map(tab => tab.id))
    dirtyIds.value = dirtyIds.value.filter(id => ids.has(id))
    for (const id of Object.keys(viewState.value)) if (!ids.has(id)) delete viewState.value[id]
    for (const id of Object.keys(scrollPositions.value)) if (!ids.has(id)) delete scrollPositions.value[id]
    if (!ids.has(activeId.value)) activeId.value = tabs.value[0]?.id || ''
  }
  function activate(descriptor: WorkspaceDescriptor, target = descriptor.path) {
    let tab = tabs.value.find(tab => tab.id === descriptor.id)
    if (!tab) {
      if (tabs.value.length >= MAX_WORKSPACE_TABS) return false
      tab = { ...descriptor, pinned: descriptor.id === 'map', target, lastUsed: 0 }
      tabs.value.push(tab)
    }
    tab.target = target; tab.lastUsed = ++clock; activeId.value = tab.id
    return true
  }
  function close(id: string) {
    if (id === 'map') return
    tabs.value = tabs.value.filter(tab => tab.id !== id)
    dirtyIds.value = dirtyIds.value.filter(value => value !== id)
    delete scrollPositions.value[id]; delete viewState.value[id]
    if (activeId.value === id) activeId.value = [...tabs.value].sort((a, b) => b.lastUsed - a.lastUsed)[0]?.id || ''
    pendingCloseId.value = null
  }
  function pin(id: string) {
    const tab = tabs.value.find(tab => tab.id === id)
    if (!tab || id === 'map') return
    tab.pinned = !tab.pinned
    tabs.value = [...tabs.value.filter(tab => tab.id === 'map'), ...tabs.value.filter(tab => tab.pinned && tab.id !== 'map'), ...tabs.value.filter(tab => !tab.pinned)]
  }
  function move(id: string, beforeId: string) {
    const source = tabs.value.find(tab => tab.id === id), target = tabs.value.find(tab => tab.id === beforeId)
    if (!source || !target || id === beforeId || id === 'map' || beforeId === 'map' || source.pinned !== target.pinned) return
    const from = tabs.value.indexOf(source), to = tabs.value.indexOf(target)
    tabs.value.splice(from, 1); tabs.value.splice(to, 0, source)
  }
  function reorder(ids: string[]) {
    if (ids.length !== tabs.value.length || new Set(ids).size !== ids.length) return false
    const next = ids.map(id => tabs.value.find(tab => tab.id === id))
    if (next.some(tab => !tab)) return false
    const ordered = next as WorkspaceTab[]
    if (ordered.some((tab, index) => (tab.id === 'map' && index !== 0) || (tab.pinned && ordered.slice(0, index).some(previous => !previous.pinned)))) return false
    tabs.value = ordered
    return true
  }
  function setTitle(id: string, value: string) {
    const title = value.trim().slice(0, 180)
    const tab = tabs.value.find(tab => tab.id === id)
    if (tab && title && tab.title !== title) tab.title = title
  }
  function markDirty(id: string, dirty: boolean) {
    if (!tabs.value.some(tab => tab.id === id)) return
    dirtyIds.value = dirty ? [...new Set([...dirtyIds.value, id])] : dirtyIds.value.filter(value => value !== id)
  }
  function resetApiState() {
    if (scope.value) { try { sessionStorage.removeItem(storageKey()) } catch { /* Optional storage. */ } }
    scope.value = ''; tabs.value = []; activeId.value = ''; dirtyIds.value = []; viewState.value = {}; scrollPositions.value = {}; pendingCloseId.value = null; epoch.value++
  }
  return { tabs, activeId, activeTab, scope, epoch, dirtyIds, scrollPositions, viewState, pendingCloseId, ensureContext, reconcile, activate, close, pin, move, reorder, setTitle, markDirty, resetApiState }
})
