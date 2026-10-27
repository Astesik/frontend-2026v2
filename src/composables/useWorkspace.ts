import { computed, inject, nextTick, onBeforeUnmount, onMounted, watch, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import { useWorkspaceTabsStore, type WorkspaceSafeState } from '@/stores/workspaceTabsStore'

export interface WorkspaceContext { id: string; active: Ref<boolean>; portal: HTMLElement; registerDirty: (key: symbol, value: boolean) => void }
export const workspaceContextKey: InjectionKey<WorkspaceContext> = Symbol('workspace-view')
export function useWorkspaceActive() { const context = inject(workspaceContextKey, null); return context?.active || computed(() => true) }
export function useWorkspacePortal() { return inject(workspaceContextKey, null)?.portal || 'body' }
export function useWorkspaceTitle(title: ComputedRef<string | null | undefined>) {
  const context = inject(workspaceContextKey, null)
  if (!context) return
  const store = useWorkspaceTabsStore(), ownerEpoch = store.epoch
  watch(title, value => { if (value && store.epoch === ownerEpoch) store.setTitle(context.id, value) }, { immediate: true })
}
export function useWorkspaceDirty(value: ComputedRef<boolean> | Ref<boolean>) {
  const context = inject(workspaceContextKey, null), key = Symbol('unsaved-form')
  if (!context) return
  watch(value, dirty => context.registerDirty(key, dirty), { immediate: true, flush: 'sync' })
  onBeforeUnmount(() => context.registerDirty(key, false))
}
export function useWorkspaceViewState(bindings: Record<string, Ref<WorkspaceSafeState[string]>>, defaults: WorkspaceSafeState = {}) {
  const context = inject(workspaceContextKey, null)
  if (!context) return
  const store = useWorkspaceTabsStore(), saved = { ...defaults, ...store.viewState[context.id] }
  const ownerEpoch = store.epoch
  for (const [key, binding] of Object.entries(bindings)) {
    const item = saved[key]
    if (item !== undefined && (Array.isArray(binding.value) ? Array.isArray(item) : typeof item === typeof binding.value)) binding.value = item
  }
  let ready = false
  onMounted(async () => {
    await nextTick()
    if (store.epoch !== ownerEpoch || !store.tabs.some(tab => tab.id === context.id)) return
    if (saved?.currentPage !== undefined && bindings.currentPage && typeof saved.currentPage === 'number') bindings.currentPage.value = Math.max(1, saved.currentPage)
    ready = true
    store.viewState[context.id] = { ...store.viewState[context.id], ...Object.fromEntries(Object.entries(bindings).map(([key, binding]) => [key, binding.value])) }
  })
  watch(() => Object.fromEntries(Object.entries(bindings).map(([key, binding]) => [key, binding.value])), value => {
    if (ready && store.epoch === ownerEpoch && store.tabs.some(tab => tab.id === context.id)) store.viewState[context.id] = { ...store.viewState[context.id], ...value }
  }, { deep: true, immediate: true, flush: 'post' })
}
