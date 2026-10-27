<template>
  <div ref="scroller" data-app-scroll-container class="h-full min-h-0 min-w-0 overflow-y-auto" @scroll.passive="saveScroll" @wheel.passive="pendingRestore = false" @pointerdown="pendingRestore = false">
    <div ref="content" :class="pageRoute.meta.fullBleed ? 'h-full w-full' : 'h-full min-h-0 w-full px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 lg:px-8'">
      <component :is="view" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { nextTick, onActivated, onBeforeUnmount, onDeactivated, onMounted, onUnmounted, provide, ref, shallowReactive, watch, type VNode } from 'vue'
import { routeLocationKey, type RouteLocationNormalizedLoaded } from 'vue-router'
import { useWorkspaceTabsStore } from '@/stores/workspaceTabsStore'
import { workspaceContextKey } from '@/composables/useWorkspace'

const props = defineProps<{ view: VNode; pageRoute: RouteLocationNormalizedLoaded; tabId: string }>()
const store = useWorkspaceTabsStore(), active = ref(true), scroller = ref<HTMLElement>(), content = ref<HTMLElement>()
const ownerEpoch = store.epoch
const localRoute = shallowReactive({ ...props.pageRoute })
provide(routeLocationKey, localRoute)
watch(() => props.pageRoute, route => Object.assign(localRoute, route))
const portal = document.createElement('div')
portal.dataset.workspacePortal = props.tabId
const dirtySources = new Map<symbol, boolean>()
provide(workspaceContextKey, { id: props.tabId, active, portal, registerDirty(key, value) { if (store.epoch !== ownerEpoch) return; if (value) dirtySources.set(key, true); else dirtySources.delete(key); store.markDirty(props.tabId, dirtySources.size > 0) } })
let observer: ResizeObserver | undefined, restoreFrame = 0
let boundsObserver: ResizeObserver | undefined
const pendingRestore = ref(true)
function saveScroll() {
  if (store.epoch === ownerEpoch && active.value && !pendingRestore.value && scroller.value && store.tabs.some(tab => tab.id === props.tabId)) store.scrollPositions[props.tabId] = scroller.value.scrollTop
}
function restoreScroll() {
  const target = store.scrollPositions[props.tabId] || 0
  if (!pendingRestore.value || !scroller.value) return
  scroller.value.scrollTop = target
  if (Math.abs(scroller.value.scrollTop - target) < 2) pendingRestore.value = false
}
function activate() {
  active.value = true; portal.style.display = ''; pendingRestore.value = true
  void nextTick(() => { updatePortalBounds(); restoreFrame = requestAnimationFrame(restoreScroll) })
}
function updatePortalBounds() {
  const bounds = scroller.value?.getBoundingClientRect()
  if (!bounds) return
  portal.style.setProperty('--workspace-top', `${bounds.top}px`)
  portal.style.setProperty('--workspace-left', `${bounds.left}px`)
}
onMounted(() => {
  document.body.appendChild(portal)
  if (typeof ResizeObserver !== 'undefined' && content.value) { observer = new ResizeObserver(restoreScroll); observer.observe(content.value) }
  if (typeof ResizeObserver !== 'undefined' && scroller.value) { boundsObserver = new ResizeObserver(updatePortalBounds); boundsObserver.observe(scroller.value) }
  activate()
})
onActivated(activate)
onDeactivated(() => {
  saveScroll(); active.value = false; portal.style.display = 'none'; cancelAnimationFrame(restoreFrame)
})
onBeforeUnmount(() => { observer?.disconnect(); boundsObserver?.disconnect(); cancelAnimationFrame(restoreFrame) })
onUnmounted(() => portal.remove())
</script>
<style>
/* Full-screen dialogs belong to the content area, leaving workspace navigation usable. */
[data-workspace-portal] > .fixed.inset-0 { top: var(--workspace-top, 0px); left: var(--workspace-left, 0px); }
[data-workspace-portal] .ui-modal-panel { max-height: calc(100dvh - var(--workspace-top, 0px) - 1.5rem); }
</style>
