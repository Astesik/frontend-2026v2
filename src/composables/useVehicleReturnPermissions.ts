import { computed } from 'vue'
import { useAuthStore } from '@/stores/authStore'

export function useVehicleReturnPermissions() {
  const auth = useAuthStore()
  const has = (permission: string) => auth.hasActiveCompanyPermission(permission) || auth.hasActiveCompanyRole('COMPANY_ADMIN') || auth.user?.sysAdmin === true || (auth.user?.globalRoles || []).some((role) => ['SYS_ADMIN', 'GLOBAL_ADMIN'].includes(role))
  const canRead = computed(() => Boolean(auth.isAuthenticated && auth.activeCompanyId && has('vehicle_returns.read')))
  return {
    canRead,
    canCreate: computed(() => canRead.value && has('vehicle_returns.create')),
    canUpdate: computed(() => canRead.value && has('vehicle_returns.update')),
    canDelete: computed(() => canRead.value && has('vehicle_returns.delete')),
    canReadVehicles: computed(() => has('vehicles.read')),
    canReadDrivers: computed(() => has('drivers.read')),
    canReadPositions: computed(() => has('positions.read')),
    canReadRepairs: computed(() => has('repairs.read')),
  }
}
