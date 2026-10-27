<template>
  <div class="flex h-dvh overflow-hidden bg-ui-canvas text-ui-text">
    <AppSidebar />
    <main class="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-ui-canvas">
      <header class="flex h-14 shrink-0 items-center justify-between border-b border-ui-border bg-ui-surface px-3 md:hidden">
        <AppIconButton label="Otwórz menu" size="lg" @click="uiStore.toggleMobileSidebar()">
          <Menu class="h-5 w-5" />
        </AppIconButton>
        <p class="ui-card-title">Routewise</p>
        <span class="h-10 w-10" aria-hidden="true"></span>
      </header>
      <template v-if="desktop">
        <WorkspaceTabs />
        <div class="min-h-0 flex-1 overflow-hidden"><WorkspaceOutlet /></div>
      </template>
      <div v-else data-app-scroll-container class="min-h-0 flex-1 overflow-y-auto">
        <div :class="contentClasses">
          <RouterView />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { Menu } from 'lucide-vue-next'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import AppIconButton from '@/components/ui/AppIconButton.vue'
import WorkspaceTabs from '@/components/workspace/WorkspaceTabs.vue'
import WorkspaceOutlet from '@/components/workspace/WorkspaceOutlet.vue'
import { useWorkspaceTabsStore } from '@/stores/workspaceTabsStore'
import { useAuthStore } from '@/stores/authStore'
import { canOpenWorkspace, describeWorkspaceRoute } from '@/workspace/registry'
import { useFleetStore } from '@/stores/fleetStore'
import { useUiStore } from '@/stores/uiStore'

const route = useRoute()
const fleetStore = useFleetStore()
const uiStore = useUiStore()
const auth = useAuthStore(), workspace = useWorkspaceTabsStore(), router = useRouter()
const desktopMedia = window.matchMedia('(min-width: 768px)')
const desktop = ref(desktopMedia.matches)
function updateDesktop() { desktop.value = desktopMedia.matches }
desktopMedia.addEventListener('change', updateDesktop)
onBeforeUnmount(() => desktopMedia.removeEventListener('change', updateDesktop))
watch([desktop, () => auth.activeCompanyId, () => auth.user, () => route.fullPath], () => {
  if (!desktop.value || !auth.isAuthenticated) return
  workspace.ensureContext(String(auth.user?.userId ?? auth.user?.id ?? auth.user?.uid ?? ''), String(auth.activeCompanyId ?? ''), name => canOpenWorkspace(name, auth))
  const descriptor = describeWorkspaceRoute(route)
  if (descriptor && canOpenWorkspace(descriptor.name, auth)) workspace.activate(descriptor, route.fullPath)
  else if (descriptor) void router.replace(workspace.tabs[0]?.target || '/access-denied')
}, { immediate: true })

const contentClasses = computed(() => route.meta.fullBleed
  ? 'h-full w-full'
  : 'w-full px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 lg:px-8')

onMounted(() => {
  void fleetStore.loadFleetData()
})
watch(() => auth.activeCompanyId, (next, previous) => { if (next && previous && next !== previous) void fleetStore.loadFleetData() })
</script>
