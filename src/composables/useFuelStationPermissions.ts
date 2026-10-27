import { computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
export function useFuelStationPermissions() {
  const auth = useAuthStore()
  const has = (code: string) => Boolean(auth.isAuthenticated && auth.activeCompanyId && (auth.hasActiveCompanyRole('COMPANY_ADMIN') || auth.hasActiveCompanyPermission(code)))
  return {
    canRead: computed(() => Boolean(auth.isAuthenticated && auth.activeCompanyId && has('fuel_stations.read'))),
    canImport: computed(() => has('fuel_stations.import')),
    canManage: computed(() => has('fuel_stations.manage')),
  }
}
