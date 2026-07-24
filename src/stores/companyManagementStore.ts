import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { companyManagementService } from '@/services/companyManagementService'
import type {
  CompanyManagedUser,
  CompanyPermission,
  CompanyRole,
  CompanyRolePayload,
  CompanyUserCreatePayload,
  CompanyUserPatchPayload,
  CompanyUserPermissionOverride,
} from '@/types/companyManagement'

export const useCompanyManagementStore = defineStore('companyManagement', () => {
  const permissions = ref<CompanyPermission[]>([])
  const roles = ref<CompanyRole[]>([])
  const users = ref<CompanyManagedUser[]>([])
  const isLoading = ref(false)
  const isMutating = ref(false)

  const permissionOptions = computed(() => permissions.value.map((permission) => ({
    value: permission.code,
    label: permission.name || permission.code,
    description: permission.description || permission.category || undefined,
  })))

  const roleOptions = computed(() => roles.value.map((role) => ({
    value: role.id,
    label: role.name,
    description: role.code,
  })))

  function upsertRole(role: CompanyRole) {
    const index = roles.value.findIndex((item) => item.id === role.id)

    if (index >= 0) {
      roles.value.splice(index, 1, role)
    } else {
      roles.value = [...roles.value, role]
    }
  }

  function upsertUser(user: CompanyManagedUser) {
    const index = users.value.findIndex((item) => item.id === user.id)

    if (index >= 0) {
      users.value.splice(index, 1, user)
    } else {
      users.value = [...users.value, user]
    }
  }

  function mergePermissions(items: CompanyPermission[]) {
    const permissionsByCode = new Map<string, CompanyPermission>()

    items.forEach((permission) => {
      const code = permission.code?.trim()

      if (!code) {
        return
      }

      const existingPermission = permissionsByCode.get(code)
      const normalizedName = permission.name?.trim()
      const shouldUseIncomingName = Boolean(normalizedName && normalizedName !== code)
      permissionsByCode.set(code, {
        code,
        name: shouldUseIncomingName ? normalizedName : existingPermission?.name || normalizedName || code,
        description: permission.description || existingPermission?.description || null,
        category: permission.category || existingPermission?.category || null,
      })
    })

    return [...permissionsByCode.values()].sort((first, second) => first.code.localeCompare(second.code))
  }

  function permissionsFromAssignedData(nextRoles: CompanyRole[], nextUsers: CompanyManagedUser[]) {
    return mergePermissions([
      ...nextRoles.flatMap((role) => role.permissions.map((permission) => ({ code: permission }))),
      ...nextUsers.flatMap((user) => (user.permissionOverrides || []).map((override) => ({
        code: override.permission,
      }))),
    ])
  }

  async function loadAll(options?: { silent?: boolean }) {
    isLoading.value = true

    try {
      const [permissionsResult, rolesResult, usersResult] = await Promise.allSettled([
        companyManagementService.getPermissions(options),
        companyManagementService.getRoles(options),
        companyManagementService.getUsers(options),
      ])
      const nextPermissions = permissionsResult.status === 'fulfilled' ? permissionsResult.value : []
      const nextRoles = rolesResult.status === 'fulfilled' ? rolesResult.value : roles.value
      const nextUsers = usersResult.status === 'fulfilled' ? usersResult.value : users.value

      roles.value = nextRoles
      users.value = nextUsers
      permissions.value = mergePermissions([
        ...nextPermissions,
        ...permissionsFromAssignedData(nextRoles, nextUsers),
      ])

      if (
        permissionsResult.status === 'rejected' &&
        rolesResult.status === 'rejected' &&
        usersResult.status === 'rejected'
      ) {
        throw permissionsResult.reason
      }
    } finally {
      isLoading.value = false
    }
  }

  async function createRole(payload: Required<Pick<CompanyRolePayload, 'code' | 'name' | 'permissions'>>) {
    isMutating.value = true

    try {
      const role = await companyManagementService.createRole(payload)
      upsertRole(role)
      return role
    } finally {
      isMutating.value = false
    }
  }

  async function updateRole(roleId: number | string, payload: CompanyRolePayload) {
    isMutating.value = true

    try {
      const role = await companyManagementService.updateRole(roleId, payload)
      upsertRole(role)
      return role
    } finally {
      isMutating.value = false
    }
  }

  async function updateRolePermissions(roleId: number | string, permissions: string[]) {
    isMutating.value = true

    try {
      const role = await companyManagementService.updateRolePermissions(roleId, permissions)
      upsertRole(role)
      return role
    } finally {
      isMutating.value = false
    }
  }

  async function deleteRole(roleId: number | string) {
    isMutating.value = true

    try {
      await companyManagementService.deleteRole(roleId)
      roles.value = roles.value.filter((role) => String(role.id) !== String(roleId))
      users.value = users.value.map((user) => ({
        ...user,
        roleIds: (user.roleIds || []).filter((id) => String(id) !== String(roleId)),
        roles: (user.roles || []).filter((role) => String(role.id) !== String(roleId)),
      }))
    } finally {
      isMutating.value = false
    }
  }

  async function createUser(payload: CompanyUserCreatePayload) {
    isMutating.value = true

    try {
      const user = await companyManagementService.createUser(payload)
      upsertUser(user)
      return user
    } finally {
      isMutating.value = false
    }
  }

  async function updateUser(userId: number | string, payload: CompanyUserPatchPayload) {
    isMutating.value = true

    try {
      const user = await companyManagementService.updateUser(userId, payload)
      upsertUser(user)
      return user
    } finally {
      isMutating.value = false
    }
  }

  async function updateUserRoles(userId: number | string, roleIds: number[]) {
    isMutating.value = true

    try {
      await companyManagementService.updateUserRoles(userId, roleIds)
      users.value = users.value.map((user) => String(user.id) === String(userId)
        ? { ...user, roleIds, roles: roles.value.filter((role) => roleIds.includes(role.id)) }
        : user)
    } finally {
      isMutating.value = false
    }
  }

  async function updateUserPermissionOverrides(userId: number | string, overrides: CompanyUserPermissionOverride[]) {
    isMutating.value = true

    try {
      await companyManagementService.updateUserPermissionOverrides(userId, overrides)
      users.value = users.value.map((user) => String(user.id) === String(userId)
        ? { ...user, permissionOverrides: overrides }
        : user)
    } finally {
      isMutating.value = false
    }
  }

  async function deleteUser(userId: number | string) {
    isMutating.value = true

    try {
      await companyManagementService.deleteUser(userId)
      users.value = users.value.map((user) => String(user.id) === String(userId)
        ? { ...user, active: false, roleIds: [], roles: [], permissionOverrides: [] }
        : user)
    } finally {
      isMutating.value = false
    }
  }

  function resetApiState() {
    permissions.value = []
    roles.value = []
    users.value = []
    isLoading.value = false
    isMutating.value = false
  }

  return {
    permissions,
    roles,
    users,
    isLoading,
    isMutating,
    permissionOptions,
    roleOptions,
    loadAll,
    createRole,
    updateRole,
    updateRolePermissions,
    deleteRole,
    createUser,
    updateUser,
    updateUserRoles,
    updateUserPermissionOverrides,
    deleteUser,
    resetApiState,
  }
})
