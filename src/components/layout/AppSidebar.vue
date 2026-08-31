<template>
  <div
    v-if="uiStore.mobileSidebarOpen"
    class="fixed inset-0 z-40 bg-ui-overlay/35 md:hidden"
    @click="uiStore.setMobileSidebarOpen(false)"
  ></div>

  <aside
    class="app-sidebar flex h-dvh min-h-0 shrink-0 flex-col overflow-visible border-r border-ui-border bg-ui-sidebar px-3 py-3 shadow-soft"
    :class="[
      uiStore.mobileSidebarOpen ? 'app-sidebar--mobile-open' : 'app-sidebar--mobile-closed',
      uiStore.sidebarCollapsed ? 'app-sidebar--desktop-collapsed' : 'app-sidebar--desktop-expanded',
    ]"
  >
    <section
      class="relative flex h-14 shrink-0 items-center border-b border-ui-border"
      :class="displaySidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-2 pr-10'"
    >
      <div
        class="sidebar-avatar flex h-9 w-9 min-w-9 shrink-0 items-center justify-center overflow-hidden border border-ui-border-strong bg-ui-surface text-ui-text-secondary shadow-soft"
        :title="displaySidebarCollapsed ? authStore.displayName : undefined"
        aria-hidden="true"
      >
        <UserRound class="h-4 w-4" />
      </div>

      <div v-if="!displaySidebarCollapsed" class="min-w-0 flex-1">
        <p class="truncate text-[9px] font-semibold uppercase leading-none text-ui-mutedText">
          {{ companyRoleLabel }}
        </p>
        <p class="mt-0.5 truncate text-sm font-semibold leading-tight text-ui-text">
          {{ authStore.displayName }}
        </p>
      </div>

      <button
        type="button"
        class="sidebar-collapse-button hidden md:inline-flex"
        :aria-label="displaySidebarCollapsed ? 'Rozwiń menu' : 'Zwiń menu'"
        @click="handleSidebarToggle"
      >
        <ChevronRight v-if="displaySidebarCollapsed" class="h-3.5 w-3.5" />
        <ChevronLeft v-else class="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        class="ui-icon-button absolute right-2 top-2 !h-8 !w-8 md:hidden"
        aria-label="Zamknij menu"
        @click="uiStore.setMobileSidebarOpen(false)"
      >
        <X class="h-4 w-4" />
      </button>
    </section>

    <nav class="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pt-5">
      <p v-if="!displaySidebarCollapsed" class="mb-2 px-3 text-[10px] font-semibold uppercase text-ui-mutedText">
        Menu
      </p>
      <div class="flex flex-col gap-1">
        <SidebarItem
          v-for="item in mainNavigation"
          :key="item.to"
          :to="item.to"
          :label="item.label"
          :icon="item.icon"
          :collapsed="displaySidebarCollapsed"
          @click="uiStore.setMobileSidebarOpen(false)"
        />
      </div>

      <div v-if="settingsNavigation.length" class="mt-5 border-t border-ui-border pt-4">
        <p v-if="!displaySidebarCollapsed" class="mb-2 px-3 text-[10px] font-semibold uppercase text-ui-mutedText">
          Ustawienia
        </p>
        <SidebarItem
          v-for="item in settingsNavigation"
          :key="item.to"
          :to="item.to"
          :label="item.label"
          :icon="item.icon"
          :collapsed="displaySidebarCollapsed"
          @click="uiStore.setMobileSidebarOpen(false)"
        />
      </div>
    </nav>

    <div class="mt-4 shrink-0 space-y-1 border-t border-ui-border pt-3">
      <button
        type="button"
        class="sidebar-bottom-action text-danger-600 hover:bg-danger-50 hover:text-danger-600 dark:text-danger-400 dark:hover:bg-danger-500/10 dark:hover:text-danger-300"
        :class="displaySidebarCollapsed ? 'justify-center px-0' : 'px-3'"
        :title="displaySidebarCollapsed ? 'Wyloguj się' : undefined"
        @click="handleLogout"
      >
        <LogOut class="h-4 w-4 shrink-0" />
        <span v-if="!displaySidebarCollapsed">Wyloguj się</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useRouter } from 'vue-router'
import {
  ChevronLeft,
  ChevronRight,
  Cpu,
  LogOut,
  MapPinned,
  Settings,
  Truck,
  UserRound,
  Wrench,
  X,
} from 'lucide-vue-next'
import SidebarItem from './SidebarItem.vue'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'

const uiStore = useUiStore()
const authStore = useAuthStore()
const router = useRouter()

const baseNavigation: Array<{ to: string; label: string; icon: Component; group: 'main' | 'settings' }> = [
  { to: '/map', label: 'Mapa', icon: MapPinned, group: 'main' },
  { to: '/vehicles', label: 'Pojazdy', icon: Truck, group: 'main' },
  { to: '/devices', label: 'Urządzenia', icon: Cpu, group: 'main' },
  { to: '/repairs', label: 'Naprawy', icon: Wrench, group: 'main' },
  { to: '/settings', label: 'Ustawienia', icon: Settings, group: 'settings' },
]

function hasPermissionPrefix(prefix: string) {
  const normalizedPrefix = prefix.toLowerCase()
  return authStore.canManageCompany || authStore.activeCompanyPermissions.some((permission) => (
    permission.toLowerCase().startsWith(normalizedPrefix)
  ))
}

function canSeeNavigationItem(path: string) {
  if (path === '/vehicles') return hasPermissionPrefix('vehicles.')
  if (path === '/devices') return hasPermissionPrefix('devices.')
  if (path === '/repairs') return hasPermissionPrefix('repairs.')

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

function humanizeRole(value: string) {
  const knownRoles: Record<string, string> = {
    COMPANY_ADMIN: 'Administrator firmy',
    GLOBAL_ADMIN: 'Administrator globalny',
    SYS_ADMIN: 'Administrator systemu',
    USER: 'Użytkownik',
  }
  const normalizedRole = value.trim().toUpperCase()

  if (knownRoles[normalizedRole]) return knownRoles[normalizedRole]

  const readableRole = value.replace(/[_-]+/g, ' ').trim().toLocaleLowerCase('pl-PL')
  return readableRole ? readableRole.charAt(0).toLocaleUpperCase('pl-PL') + readableRole.slice(1) : 'Użytkownik'
}

const visibleNavigation = computed(() => baseNavigation.filter((item) => canSeeNavigationItem(item.to)))
const mainNavigation = computed(() => visibleNavigation.value.filter((item) => item.group === 'main'))
const settingsNavigation = computed(() => visibleNavigation.value.filter((item) => item.group === 'settings'))
const displaySidebarCollapsed = computed(() => uiStore.sidebarCollapsed && !uiStore.mobileSidebarOpen)
const companyRoleLabel = computed(() => {
  if (authStore.user?.sysAdmin) return 'Administrator systemu'
  const role = authStore.activeCompanyRoles[0] || authStore.user?.globalRoles?.[0] || authStore.user?.role
  return role ? humanizeRole(role) : 'Użytkownik firmy'
})
function handleSidebarToggle() {
  if (uiStore.mobileSidebarOpen && window.innerWidth < 768) {
    uiStore.setMobileSidebarOpen(false)
    return
  }

  uiStore.toggleSidebar()
}

async function handleLogout() {
  uiStore.setMobileSidebarOpen(false)

  try {
    await authStore.logout()
  } catch {
    // API errors are handled globally; local session is cleared in the store.
  } finally {
    await router.push('/login')
  }
}
</script>

<style scoped>
.app-sidebar {
  position: fixed;
  inset: 0;
  z-index: 50;
  width: 100vw;
  pointer-events: none;
  transform: translateX(-100%);
  transition: width 200ms ease, transform 200ms ease, padding 200ms ease;
}

.app-sidebar--mobile-open {
  pointer-events: auto;
  transform: translateX(0);
}

@media (min-width: 768px) {
  .app-sidebar {
    position: relative;
    inset: auto;
    z-index: 30;
    width: 16rem;
    pointer-events: auto;
    transform: none;
  }

  .app-sidebar--desktop-expanded {
    width: 16rem;
    padding-right: 0.75rem;
    padding-left: 0.75rem;
  }

  .app-sidebar--desktop-collapsed {
    width: 50px;
    padding-right: 0.5rem;
    padding-left: 0.5rem;
  }
}

.sidebar-avatar {
  aspect-ratio: 1 / 1;
  border-radius: 9999px;
}

.sidebar-collapse-button {
  position: absolute;
  top: 50% !important;
  right: -14px;
  z-index: 10;
  height: 2rem;
  width: 1.125rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(var(--rw-border));
  border-radius: 6px;
  background-color: rgb(var(--rw-sidebar));
  color: rgb(var(--rw-icon));
  transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
  transform: translateY(-50%);
}

.sidebar-collapse-button:hover {
  border-color: rgb(var(--rw-border-strong));
  background-color: rgb(var(--rw-surface-hover));
  color: rgb(var(--rw-text-primary));
}

.sidebar-collapse-button:focus-visible {
  outline: 2px solid rgb(var(--rw-focus-ring));
  outline-offset: 2px;
}

.sidebar-bottom-action {
  display: flex;
  min-height: 2.25rem;
  width: 100%;
  align-items: center;
  gap: 0.75rem;
  border-radius: var(--rw-radius-item);
  color: rgb(var(--rw-text-secondary));
  font-size: 0.8125rem;
  font-weight: 500;
  transition: background-color 150ms ease, color 150ms ease;
}

.sidebar-bottom-action:hover {
  background-color: rgb(var(--rw-surface-hover));
  color: rgb(var(--rw-text-primary));
}
</style>
