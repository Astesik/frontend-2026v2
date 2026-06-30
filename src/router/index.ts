import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import AppLayout from '@/layouts/AppLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

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
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
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

router.beforeEach((to) => {
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

  return true
})

export default router
