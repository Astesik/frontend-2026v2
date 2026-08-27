<template>
  <div
    v-if="uiStore.mobileSidebarOpen"
    class="fixed inset-0 z-40 bg-ui-overlay/35 md:hidden"
    @click="uiStore.setMobileSidebarOpen(false)"
  ></div>

  <aside
    class="flex h-screen min-h-0 shrink-0 flex-col overflow-visible border-r border-ui-border bg-ui-sidebar py-4 shadow-soft transition-all duration-200"
    :class="sidebarClasses"
  >
    <div
      class="flex items-center"
      :class="displaySidebarCollapsed ? 'h-auto flex-col justify-start gap-2 px-0' : 'h-12 justify-between gap-2 px-2'"
    >
      <div
        class="flex min-w-0 items-center gap-3"
        :class="displaySidebarCollapsed ? 'justify-center' : ''"
      >
        <div
          class="flex shrink-0 items-center justify-center border border-ui-border bg-ui-surface text-ui-text shadow-soft"
          :class="displaySidebarCollapsed ? 'h-8 w-8 rounded-[var(--rw-radius-item)]' : 'h-10 w-10 rounded-[var(--rw-radius-control)]'"
        >
          <Route class="h-5 w-5" />
        </div>
        <p v-if="!displaySidebarCollapsed" class="truncate ui-card-title">
          Routewise
        </p>
      </div>

      <button
        type="button"
        class="ui-icon-button"
        :class="displaySidebarCollapsed ? '!h-8 !w-8' : ''"
        aria-label="Przelacz menu"
        @click="handleSidebarToggle"
      >
        <PanelLeftOpen v-if="displaySidebarCollapsed" class="h-4 w-4" />
        <PanelLeftClose v-else class="h-4 w-4" />
      </button>
    </div>

    <nav
      class="mt-6 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
      :class="displaySidebarCollapsed ? 'px-0' : 'pr-1'"
    >
      <SidebarItem
        v-for="item in navigation"
        :key="item.to"
        :to="item.to"
        :label="item.label"
        :icon="item.icon"
        :collapsed="displaySidebarCollapsed"
        @click="uiStore.setMobileSidebarOpen(false)"
      />
    </nav>

    <div ref="userMenuElement" class="relative mt-6 shrink-0 border-t border-ui-border pt-4">
      <button
        type="button"
        class="flex w-full items-center rounded-[var(--rw-radius-control)] py-2 transition hover:bg-ui-hover"
        :class="displaySidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-2'"
        :title="displaySidebarCollapsed ? authStore.displayName : undefined"
        @click="isUserMenuOpen = !isUserMenuOpen"
      >
        <div
          class="flex shrink-0 items-center justify-center rounded-full border border-ui-border bg-ui-surface font-semibold text-ui-text-secondary"
          :class="displaySidebarCollapsed ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'"
        >
          {{ initials }}
        </div>
        <div v-if="!displaySidebarCollapsed" class="min-w-0 flex-1 text-left">
          <p class="truncate text-sm font-medium text-ui-text">
            {{ authStore.displayName }}
          </p>
          <p class="truncate text-xs text-ui-mutedText">
            Aktywna sesja
          </p>
        </div>
        <ChevronUp
          v-if="!displaySidebarCollapsed"
          class="h-4 w-4 shrink-0 text-ui-icon transition"
          :class="isUserMenuOpen ? '' : 'rotate-180'"
        />
      </button>

      <div
        v-if="isUserMenuOpen"
        class="sidebar-user-menu absolute z-[70] rounded-[var(--rw-radius-control)] border p-1 shadow-popover"
        :class="displaySidebarCollapsed ? 'bottom-0 left-full ml-2 w-60' : 'bottom-full left-0 right-0 mb-2'"
      >
        <button type="button" class="sidebar-menu-action" @click="toggleTheme">
          <Sun v-if="uiStore.isDark" class="h-4 w-4" />
          <Moon v-else class="h-4 w-4" />
          <span>{{ uiStore.isDark ? 'Jasny motyw' : 'Ciemny motyw' }}</span>
        </button>

        <button type="button" class="sidebar-menu-action" @click="goTo('/dashboard')">
          <LayoutDashboard class="h-4 w-4" />
          <span>Dashboard floty</span>
        </button>

        <button type="button" class="sidebar-menu-action" @click="goTo('/settings')">
          <UserCog class="h-4 w-4" />
          <span>Ustawienia konta</span>
        </button>

        <button
          type="button"
          class="sidebar-menu-action"
          @click="handleLogout"
        >
          <LogOut class="h-4 w-4" />
          <span>Wyloguj</span>
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type Component } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronUp,
  Cpu,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Route,
  Settings,
  Sun,
  Truck,
  UserCog,
  Wrench,
} from 'lucide-vue-next'
import SidebarItem from './SidebarItem.vue'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'

const uiStore = useUiStore()
const authStore = useAuthStore()
const router = useRouter()
const isUserMenuOpen = ref(false)
const userMenuElement = ref<HTMLElement | null>(null)

const baseNavigation: Array<{ to: string; label: string; icon: Component }> = [
  { to: '/map', label: 'Mapa', icon: MapPinned },
  { to: '/vehicles', label: 'Pojazdy', icon: Truck },
  { to: '/devices', label: 'Urządzenia', icon: Cpu },
  { to: '/repairs', label: 'Naprawy', icon: Wrench },
  { to: '/settings', label: 'Ustawienia', icon: Settings },
]

function hasPermissionPrefix(prefix: string) {
  const normalizedPrefix = prefix.toLowerCase()
  return authStore.canManageCompany || authStore.activeCompanyPermissions.some((permission) => (
    permission.toLowerCase().startsWith(normalizedPrefix)
  ))
}

function canSeeNavigationItem(path: string) {
  if (path === '/vehicles') {
    return hasPermissionPrefix('vehicles.')
  }

  if (path === '/devices') {
    return hasPermissionPrefix('devices.')
  }

  if (path === '/repairs') {
    return hasPermissionPrefix('repairs.')
  }

  if (path === '/settings') {
    return (
      authStore.canManageCompany ||
      hasPermissionPrefix('settings.') ||
      hasPermissionPrefix('vehicle_groups.') ||
      hasPermissionPrefix('notifications.') ||
      hasPermissionPrefix('vignettes.')
    )
  }

  return true
}

const navigation = computed(() => baseNavigation.filter((item) => canSeeNavigationItem(item.to)))
const initials = computed(() => authStore.displayName.slice(0, 2).toUpperCase())
const displaySidebarCollapsed = computed(() => uiStore.sidebarCollapsed && !uiStore.mobileSidebarOpen)
const sidebarClasses = computed(() => {
  const mobileState = uiStore.mobileSidebarOpen
    ? 'fixed inset-y-0 left-0 z-50 flex w-screen px-3'
    : 'pointer-events-none fixed inset-y-0 left-0 z-50 w-screen -translate-x-full px-3'
  const desktopState = uiStore.sidebarCollapsed ? 'md:w-[50px] md:px-2' : 'md:w-72 md:px-3'

  return `${mobileState} md:pointer-events-auto md:relative md:inset-auto md:z-30 md:flex md:translate-x-0 ${desktopState}`
})

function toggleTheme() {
  uiStore.toggleTheme()
  isUserMenuOpen.value = false
}

async function goTo(path: string) {
  isUserMenuOpen.value = false
  uiStore.setMobileSidebarOpen(false)
  await router.push(path)
}

function handleSidebarToggle() {
  if (uiStore.mobileSidebarOpen && window.innerWidth < 768) {
    uiStore.setMobileSidebarOpen(false)
    return
  }

  uiStore.toggleSidebar()
}

async function handleLogout() {
  isUserMenuOpen.value = false
  uiStore.setMobileSidebarOpen(false)

  try {
    await authStore.logout()
  } catch {
    // API error is already shown by the global interceptor; local session is cleared anyway.
  } finally {
    await router.push('/login')
  }
}

function onDocumentClick(event: MouseEvent) {
  if (!userMenuElement.value?.contains(event.target as Node)) {
    isUserMenuOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<style scoped>
.sidebar-menu-action {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.625rem;
  border-radius: var(--rw-radius-item);
  padding: 0.625rem 0.75rem;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--rw-text-secondary));
  transition: background-color 150ms ease, color 150ms ease;
}

.sidebar-menu-action span,
.sidebar-menu-action svg {
  color: inherit;
}

.sidebar-menu-action:hover {
  background-color: rgb(var(--rw-surface-hover));
  color: rgb(var(--rw-text-primary));
}

:global(.dark) .sidebar-menu-action span,
:global(.dark) .sidebar-menu-action svg {
  color: inherit !important;
}

.sidebar-user-menu {
  border-color: rgb(var(--rw-border));
  background-color: rgb(var(--rw-dropdown-background));
  color: rgb(var(--rw-text-primary));
}
</style>
