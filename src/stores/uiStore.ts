import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Theme, Toast } from '@/types/ui'

const THEME_KEY = 'routewise.ui.theme'
const SIDEBAR_KEY = 'routewise.ui.sidebarCollapsed'

function readStoredTheme(): Theme {
  const storedTheme = localStorage.getItem(THEME_KEY)

  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStoredSidebarState() {
  return localStorage.getItem(SIDEBAR_KEY) === 'true'
}

function createToastId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<Theme>('light')
  const sidebarCollapsed = ref(false)
  const mobileSidebarOpen = ref(false)
  const toasts = ref<Toast[]>([])

  const isDark = computed(() => theme.value === 'dark')

  function applyTheme() {
    document.documentElement.classList.toggle('dark', theme.value === 'dark')
  }

  function restoreClientPreferences() {
    theme.value = readStoredTheme()
    sidebarCollapsed.value = readStoredSidebarState()
    applyTheme()
  }

  function setTheme(nextTheme: Theme) {
    theme.value = nextTheme
    localStorage.setItem(THEME_KEY, nextTheme)
    applyTheme()
  }

  function toggleTheme() {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  function setSidebarCollapsed(value: boolean) {
    sidebarCollapsed.value = value
    localStorage.setItem(SIDEBAR_KEY, String(value))
  }

  function toggleSidebar() {
    setSidebarCollapsed(!sidebarCollapsed.value)
  }

  function setMobileSidebarOpen(value: boolean) {
    mobileSidebarOpen.value = value
  }

  function toggleMobileSidebar() {
    mobileSidebarOpen.value = !mobileSidebarOpen.value
  }

  function addToast(toast: Omit<Toast, 'id'>) {
    const nextToast: Toast = {
      id: createToastId(),
      timeout: 4200,
      ...toast,
    }

    toasts.value.push(nextToast)

    if (nextToast.timeout && nextToast.timeout > 0) {
      window.setTimeout(() => removeToast(nextToast.id), nextToast.timeout)
    }
  }

  function removeToast(id: string) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  return {
    theme,
    sidebarCollapsed,
    mobileSidebarOpen,
    toasts,
    isDark,
    restoreClientPreferences,
    setTheme,
    toggleTheme,
    setSidebarCollapsed,
    toggleSidebar,
    setMobileSidebarOpen,
    toggleMobileSidebar,
    addToast,
    removeToast,
  }
})
