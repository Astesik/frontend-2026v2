import type { RouteLocationNormalizedLoaded, RouteLocationNormalized } from 'vue-router'

export interface WorkspaceAccess {
  canManageCompany: boolean
  hasActiveCompanyPermission: (permission: string) => boolean
  hasActiveCompanyRole: (role: string) => boolean
}
export const workspaceViews = {
  map: { title: 'Mapa', path: '/map', icon: 'map', permissions: ['positions.read'] },
  dashboard: { title: 'Strona główna', path: '/dashboard', icon: 'home', permissions: ['dashboard.read', 'positions.read'] },
  drivers: { title: 'Kierowcy', path: '/drivers', icon: 'drivers', permissions: ['drivers.read'] },
  vehicles: { title: 'Pojazdy', path: '/vehicles', icon: 'vehicles', permissions: ['vehicles.read'] },
  'vehicle-detail': { title: 'Pojazd', path: '/vehicles/:id', icon: 'vehicles', permissions: ['vehicles.read'] },
  devices: { title: 'Urządzenia', path: '/devices', icon: 'devices', permissions: ['devices.read'] },
  'device-detail': { title: 'Urządzenie', path: '/devices/:id', icon: 'devices', permissions: ['devices.read'] },
  repairs: { title: 'Naprawy', path: '/repairs', icon: 'repairs', permissions: ['repairs.read'] },
  'repair-detail': { title: 'Naprawa', path: '/repairs/:id', icon: 'repairs', permissions: ['repairs.read'] },
  trips: { title: 'Zjazdy i wyjazdy', path: '/trips', icon: 'trips', permissions: ['vehicle_returns.read'] },
  'fuel-stations': { title: 'Stacje paliw', path: '/fuel-stations', icon: 'fuel', permissions: ['fuel_stations.read'] },
  refueling: { title: 'Tankowania', path: '/refueling', icon: 'fuel', permissions: ['fuel_stations.read', 'positions.read', 'vehicles.read'], all: true },
  'route-calculator': { title: 'Kalkulator tras', path: '/route-calculator', icon: 'trips', permissions: ['positions.read', 'vehicles.read'], all: true },
  reports: { title: 'Raporty', path: '/reports', icon: 'reports', permissions: ['reports.read'] },
  settings: { title: 'Ustawienia', path: '/settings', icon: 'settings', permissions: ['settings.read', 'settings.manage', 'vehicle_groups.read', 'notifications.read', 'company.manage', 'roles.read', 'users.read'] },
} satisfies Record<string, { title: string; path: string; icon: string; permissions: string[]; all?: boolean }>
export type WorkspaceViewName = keyof typeof workspaceViews
export type WorkspaceDescriptor = { id: string; name: WorkspaceViewName; recordId?: string; title: string; icon: string; path: string }

export function workspaceDescriptor(name: unknown, recordId?: unknown): WorkspaceDescriptor | null {
  if (typeof name !== 'string' || !Object.hasOwn(workspaceViews, name)) return null
  const key = name as WorkspaceViewName, definition = workspaceViews[key]
  const record = definition.path.includes(':id')
  const id = recordId == null ? '' : String(recordId)
  if (record && !/^[1-9]\d*$/.test(id)) return null
  return { id: record ? `${name}:${id}` : name, name: key, ...(record ? { recordId: id } : {}), title: definition.title, icon: definition.icon, path: definition.path.replace(':id', id) }
}
export function describeWorkspaceRoute(route: RouteLocationNormalizedLoaded | RouteLocationNormalized) { return workspaceDescriptor(route.name, route.params.id) }
export function canOpenWorkspace(name: WorkspaceViewName, access: WorkspaceAccess) {
  if (access.canManageCompany || access.hasActiveCompanyRole('COMPANY_ADMIN')) return true
  const view = workspaceViews[name]
  return 'all' in view && view.all ? view.permissions.every(access.hasActiveCompanyPermission) : view.permissions.some(access.hasActiveCompanyPermission)
}
