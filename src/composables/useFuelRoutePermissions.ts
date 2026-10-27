import { computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'
export function useFuelRoutePermissions() {
  const auth = useAuthStore()
  return { canRead: computed(() => Boolean(auth.isAuthenticated && auth.activeCompanyId && (auth.hasActiveCompanyRole('COMPANY_ADMIN') || ['fuel_stations.read', 'positions.read', 'vehicles.read'].every(p => auth.hasActiveCompanyPermission(p))))) }
}
