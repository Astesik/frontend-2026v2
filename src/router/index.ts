import { createRouter, createWebHistory, START_LOCATION, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import AppLayout from '@/layouts/AppLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { h } from 'vue'
import { useWorkspaceTabsStore, MAX_WORKSPACE_TABS } from '@/stores/workspaceTabsStore'
import { useUiStore } from '@/stores/uiStore'
import { canOpenWorkspace, describeWorkspaceRoute } from '@/workspace/registry'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/map',
  },
  {
    path: '/login',
    component: AuthLayout,
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('@/views/LoginView.vue'),
        meta: { guestOnly: true },
      },
    ],
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: 'access-denied',
        name: 'access-denied',
        component: { render: () => h('p', { class: 'p-6 text-sm text-ui-mutedText' }, 'Brak dostępu do tego widoku. Wybierz dostępną pozycję w menu.') },
      },
      {
        path: 'dashboard',
        alias: '/home',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
      },
      {
        path: 'fuel-stations',
        name: 'fuel-stations',
        component: () => import('@/views/FuelStationsView.vue'),
      },
      {
        path: 'refueling',
        name: 'refueling',
        component: () => import('@/views/RefuelingView.vue'),
        meta: { fullBleed: true },
      },
      {
        path: 'map',
        name: 'map',
        component: () => import('@/views/MapView.vue'),
        meta: { fullBleed: true },
      },
      {
        path: 'route-calculator',
        name: 'route-calculator',
        component: () => import('@/views/RouteCalculatorView.vue'),
        meta: { fullBleed: true },
      },
      {
        path: 'vehicles',
        name: 'vehicles',
        component: () => import('@/views/VehiclesView.vue'),
      },
      {
        path: 'vehicles/:id',
        name: 'vehicle-detail',
        component: () => import('@/views/VehicleDetailView.vue'),
      },
      {
        path: 'devices',
        name: 'devices',
        component: () => import('@/views/DevicesView.vue'),
      },
      {
        path: 'devices/:id',
        name: 'device-detail',
        component: () => import('@/views/DeviceDetailView.vue'),
      },
      {
        path: 'repairs',
        name: 'repairs',
        component: () => import('@/views/RepairsView.vue'),
      },
      {
        path: 'repairs/:id',
        name: 'repair-detail',
        component: () => import('@/views/RepairDetailView.vue'),
      },
      {
        path: 'trips',
        name: 'trips',
        component: () => import('@/views/TripsView.vue'),
      },
      {
        path: 'trips/:id',
        name: 'trip-detail',
        redirect: (to) => ({ name: 'trips', query: { entry: String(to.params.id) } }),
      },
      {
        path: 'drivers',
        name: 'drivers',
        component: () => import('@/views/DriversView.vue'),
      },
      {
        path: 'reports',
        name: 'reports',
        component: () => import('@/views/ReportsView.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/views/SettingsView.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/map',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to, from) => {
  const authStore = useAuthStore()

  if (!authStore.isRestored) {
    authStore.restoreSession()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      path: '/login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return '/map'
  }

  if (to.meta.requiresAuth && authStore.isAuthenticated) {
    const descriptor = describeWorkspaceRoute(to)
    if (descriptor && !canOpenWorkspace(descriptor.name, authStore)) return '/access-denied'
    if (window.matchMedia('(min-width: 768px)').matches) {
      const workspace = useWorkspaceTabsStore()
      workspace.ensureContext(String(authStore.user?.userId ?? authStore.user?.id ?? authStore.user?.uid ?? ''), String(authStore.activeCompanyId ?? ''), name => canOpenWorkspace(name, authStore))
      if (descriptor && from === START_LOCATION) {
        for (const tab of [...workspace.tabs]) {
          if (!tab.pinned && tab.id !== descriptor.id) workspace.close(tab.id)
        }
      }
      if (descriptor && !workspace.tabs.some(tab => tab.id === descriptor.id) && workspace.tabs.length >= MAX_WORKSPACE_TABS) {
        useUiStore().addToast({ type: 'info', title: 'Limit otwartych zakładek', message: `Zamknij jedną z ${MAX_WORKSPACE_TABS} zakładek, aby otworzyć kolejną.` })
        return false
      }
    }
  }

  return true
})

router.afterEach((to, from, failure) => {
  if (failure) return
  if (to.meta.requiresAuth && window.matchMedia('(min-width: 768px)').matches) {
    const descriptor = describeWorkspaceRoute(to)
    if (descriptor) useWorkspaceTabsStore().activate(descriptor, to.fullPath)
    return
  }
  if (to.fullPath === from.fullPath) {
    return
  }

  requestAnimationFrame(() => {
    const contentScroller = document.querySelector<HTMLElement>('[data-app-scroll-container]')

    if (contentScroller) {
      contentScroller.scrollTop = 0
    }
  })
})

export default router
