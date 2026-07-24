export interface CompanyPermission {
  code: string
  category?: string | null
  name?: string | null
  description?: string | null
}

export interface CompanyRole {
  id: number
  code: string
  name: string
  systemRole?: boolean
  editable?: boolean
  permissions: string[]
  createdAt?: string | null
  updatedAt?: string | null
}

export interface CompanyUserPermissionOverride {
  permission: string
  effect: 'GRANT' | 'DENY'
}

export interface CompanyManagedUser {
  id: number
  username: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  active?: boolean
  roles?: CompanyRole[]
  roleIds?: number[]
  permissions?: string[]
  permissionOverrides?: CompanyUserPermissionOverride[]
  createdAt?: string | null
  updatedAt?: string | null
}

export interface CompanyRolePayload {
  code?: string
  name?: string
  permissions?: string[]
}

export interface CompanyUserCreatePayload {
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
  roleIds: number[]
  permissionOverrides: CompanyUserPermissionOverride[]
}

export interface CompanyUserPatchPayload {
  username?: string
  email?: string
  firstName?: string
  lastName?: string
  active?: boolean
}
