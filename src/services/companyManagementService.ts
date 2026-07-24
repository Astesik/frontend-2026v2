import { api } from './api'
import type {
  CompanyManagedUser,
  CompanyPermission,
  CompanyRole,
  CompanyRolePayload,
  CompanyUserCreatePayload,
  CompanyUserPatchPayload,
  CompanyUserPermissionOverride,
} from '@/types/companyManagement'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizePermission(value: unknown, fallbackCode?: string, fallbackCategory?: string): CompanyPermission {
  if (typeof value === 'string') {
    return { code: value, name: value }
  }

  if (!isRecord(value)) {
    return { code: fallbackCode || '', name: fallbackCode || '' }
  }

  const code =
    stringValue(value.code) ||
    stringValue(value.permission) ||
    stringValue(value.key) ||
    stringValue(value.value) ||
    fallbackCode ||
    ''
  const name =
    stringValue(value.name) ||
    stringValue(value.label) ||
    stringValue(value.displayName) ||
    code

  return {
    code,
    category: stringValue(value.category) || stringValue(value.group) || fallbackCategory || null,
    name,
    description: stringValue(value.description),
  }
}

function extractPermissions(value: unknown, fallbackCategory?: string): CompanyPermission[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractPermissions(item, fallbackCategory))
  }

  if (!isRecord(value)) {
    return [normalizePermission(value, undefined, fallbackCategory)].filter((permission) => permission.code)
  }

  const collectionKeys = ['permissions', 'items', 'content', 'data', 'result']

  for (const key of collectionKeys) {
    if (key in value) {
      return extractPermissions(value[key], fallbackCategory)
    }
  }

  if (
    'code' in value ||
    'permission' in value ||
    'key' in value ||
    'value' in value
  ) {
      return [normalizePermission(value, undefined, fallbackCategory)].filter((permission) => permission.code)
  }

  return Object.entries(value).flatMap(([key, item]) => {
    if (Array.isArray(item)) {
        return item.flatMap((nestedItem) => extractPermissions(nestedItem, key))
    }

    if (isRecord(item)) {
      if (
        'code' in item ||
        'permission' in item ||
        'name' in item ||
        'label' in item ||
        'displayName' in item ||
        'description' in item
      ) {
        return [normalizePermission(item, key, fallbackCategory)]
      }

      return extractPermissions(item, key)
    }

    if (typeof item === 'string') {
      return [normalizePermission({ code: key, name: item }, key, fallbackCategory)]
    }

    if (typeof item === 'boolean' && item) {
      return [normalizePermission(key, key, fallbackCategory)]
    }

    return []
  }).filter((permission) => permission.code)
}

function uniquePermissions(value: unknown) {
  const permissions = extractPermissions(value)
  const permissionsByCode = new Map<string, CompanyPermission>()

  permissions.forEach((permission) => {
    const code = permission.code.trim()

    if (!code) {
      return
    }

    const existingPermission = permissionsByCode.get(code)
    permissionsByCode.set(code, {
      code,
      name: permission.name || existingPermission?.name || code,
      description: permission.description || existingPermission?.description || null,
      category: permission.category || existingPermission?.category || null,
    })
  })

  return [...permissionsByCode.values()].sort((first, second) => first.code.localeCompare(second.code))
}

function normalizePermissionCodes(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return [...new Set(value.map((item) => normalizePermission(item).code).filter(Boolean))]
}

function extractCollection<T>(value: unknown, collectionKeys: string[]) {
  if (Array.isArray(value)) {
    return value as T[]
  }

  if (!isRecord(value)) {
    return []
  }

  for (const key of collectionKeys) {
    if (Array.isArray(value[key])) {
      return value[key] as T[]
    }
  }

  return Object.values(value).filter(isRecord) as T[]
}

function normalizeRole(value: CompanyRole): CompanyRole {
  return {
    ...value,
    systemRole: Boolean(value.systemRole),
    editable: value.editable !== false,
    permissions: normalizePermissionCodes(value.permissions),
  }
}

function normalizeUser(value: CompanyManagedUser): CompanyManagedUser {
  const roleIds = Array.isArray(value.roleIds)
    ? value.roleIds
    : (value.roles || []).map((role) => role.id)

  return {
    ...value,
    roleIds,
    roles: (value.roles || []).map(normalizeRole),
    permissionOverrides: Array.isArray(value.permissionOverrides)
      ? value.permissionOverrides.map((override) => ({
          permission: override.permission,
          effect: String(override.effect).toUpperCase() === 'DENY' ? 'DENY' : 'GRANT',
        })).filter((override) => override.permission)
      : [],
  }
}

export const companyManagementService = {
  async getPermissions(options?: { silent?: boolean }) {
    const { data } = await api.get<unknown>('/api/company-management/permissions', {
      skipErrorToast: options?.silent,
    })
    return uniquePermissions(data)
  },

  async getRoles(options?: { silent?: boolean }) {
    const { data } = await api.get<unknown>('/api/company-management/roles', {
      skipErrorToast: options?.silent,
    })
    return extractCollection<CompanyRole>(data, ['roles', 'items', 'content', 'data', 'result']).map(normalizeRole)
  },

  async createRole(payload: Required<Pick<CompanyRolePayload, 'code' | 'name' | 'permissions'>>) {
    const { data } = await api.post<CompanyRole>('/api/company-management/roles', payload)
    return normalizeRole(data)
  },

  async updateRole(roleId: number | string, payload: CompanyRolePayload) {
    const { data } = await api.patch<CompanyRole>(`/api/company-management/roles/${roleId}`, payload)
    return normalizeRole(data)
  },

  async updateRolePermissions(roleId: number | string, permissions: string[]) {
    const { data } = await api.put<CompanyRole>(`/api/company-management/roles/${roleId}/permissions`, { permissions })
    return normalizeRole(data)
  },

  async deleteRole(roleId: number | string) {
    await api.delete(`/api/company-management/roles/${roleId}`)
  },

  async getUsers(options?: { silent?: boolean }) {
    const { data } = await api.get<unknown>('/api/company-management/users', {
      skipErrorToast: options?.silent,
    })
    return extractCollection<CompanyManagedUser>(data, ['users', 'items', 'content', 'data', 'result']).map(normalizeUser)
  },

  async createUser(payload: CompanyUserCreatePayload) {
    const { data } = await api.post<CompanyManagedUser>('/api/company-management/users', payload)
    return normalizeUser(data)
  },

  async updateUser(userId: number | string, payload: CompanyUserPatchPayload) {
    const { data } = await api.patch<CompanyManagedUser>(`/api/company-management/users/${userId}`, payload)
    return normalizeUser(data)
  },

  async updateUserRoles(userId: number | string, roleIds: number[]) {
    await api.put(`/api/company-management/users/${userId}/roles`, { roleIds })
  },

  async updateUserPermissionOverrides(userId: number | string, overrides: CompanyUserPermissionOverride[]) {
    await api.put(`/api/company-management/users/${userId}/permission-overrides`, { overrides })
  },

  async deleteUser(userId: number | string) {
    await api.delete(`/api/company-management/users/${userId}`)
  },
}
