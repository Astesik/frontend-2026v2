<template>
  <div
    v-if="uiStore.mobileSidebarOpen"
    class="fixed inset-0 z-40 bg-slate-950/30 md:hidden"
    @click="uiStore.setMobileSidebarOpen(false)"
  ></div>

  <aside
    class="flex h-screen min-h-0 shrink-0 flex-col overflow-visible border-r border-slate-200 bg-app-sidebar py-4 shadow-sm transition-all duration-200 dark:border-app-border"
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
          class="flex shrink-0 items-center justify-center border border-slate-200 bg-white text-slate-950 dark:border-app-border dark:bg-app-panel dark:text-slate-50"
          :class="displaySidebarCollapsed ? 'h-8 w-8 rounded-xl' : 'h-10 w-10 rounded-2xl'"
        >
          <Route class="h-5 w-5" />
        </div>
        <p v-if="!displaySidebarCollapsed" class="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">
          Routewise
        </p>
      </div>

      <button
        type="button"
        class="flex shrink-0 items-center justify-center border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 dark:border-app-border dark:bg-app-panel dark:text-app-muted dark:hover:bg-app-elevated dark:hover:text-slate-50"
        :class="displaySidebarCollapsed ? 'h-8 w-8 rounded-xl' : 'h-9 w-9 rounded-2xl'"
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

    <div ref="userMenuElement" class="relative mt-6 shrink-0 border-t border-slate-200 pt-4 dark:border-app-border">
      <button
        type="button"
        class="flex w-full items-center rounded-2xl py-2 transition hover:bg-white dark:hover:bg-app-panel"
        :class="displaySidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-2'"
        :title="displaySidebarCollapsed ? authStore.displayName : undefined"
        @click="isUserMenuOpen = !isUserMenuOpen"
      >
        <div
          class="flex shrink-0 items-center justify-center rounded-full bg-white font-semibold text-slate-700 dark:bg-app-panel dark:text-slate-200"
          :class="displaySidebarCollapsed ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm'"
        >
          {{ initials }}
        </div>
        <div v-if="!displaySidebarCollapsed" class="min-w-0 flex-1 text-left">
          <p class="truncate text-sm font-medium text-slate-950 dark:text-slate-50">
            {{ authStore.displayName }}
          </p>
          <p class="truncate text-xs text-slate-500 dark:text-slate-400">
            Aktywna sesja
          </p>
        </div>
        <ChevronUp
          v-if="!displaySidebarCollapsed"
          class="h-4 w-4 shrink-0 text-slate-400 transition"
          :class="isUserMenuOpen ? '' : 'rotate-180'"
        />
      </button>

      <div
        v-if="isUserMenuOpen"
        class="sidebar-user-menu absolute z-[70] rounded-2xl border p-1 shadow-sm"
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
  Calculator,
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

const navigation: Array<{ to: string; label: string; icon: Component }> = [
  { to: '/map', label: 'Mapa', icon: MapPinned },
  { to: '/route-calculator', label: 'Kalkulator tras - BETA', icon: Calculator },
  { to: '/vehicles', label: 'Pojazdy', icon: Truck },
  { to: '/devices', label: 'Urządzenia', icon: Cpu },
  { to: '/repairs', label: 'Naprawy', icon: Wrench },
  { to: '/settings', label: 'Ustawienia', icon: Settings },
]

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
  border-radius: 0.75rem;
  padding: 0.625rem 0.75rem;
  text-align: left;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(var(--rw-app-text));
  transition: background-color 150ms ease, color 150ms ease;
}

.sidebar-menu-action span,
.sidebar-menu-action svg {
  color: inherit;
}

.sidebar-menu-action:hover {
  background-color: rgb(var(--rw-app-hover));
  color: rgb(var(--rw-app-text));
}

:global(.dark) .sidebar-menu-action span,
:global(.dark) .sidebar-menu-action svg {
  color: inherit !important;
}

.sidebar-user-menu {
  border-color: rgb(var(--rw-app-border));
  background-color: rgb(var(--rw-app-panel));
  color: rgb(var(--rw-app-text));
}
</style>
