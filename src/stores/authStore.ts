import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { refreshAccessToken, registerAuthSessionHandlers, setAuthToken } from '@/services/api'
import { authService } from '@/services/authService'
import { useCompanyManagementStore } from './companyManagementStore'
import { useDeviceStore } from './deviceStore'
import { useFleetStore } from './fleetStore'
import { useNotificationStore } from './notificationStore'
import { usePlaceStore } from './placeStore'
import { useRepairStore } from './repairStore'
import { useUiStore } from './uiStore'
import type { AuthSession, AuthUser, LoginPayload } from '@/types/auth'

const AUTH_TOKEN_KEY = 'routewise.auth.token'
const AUTH_USER_KEY = 'routewise.auth.user'

function readStoredUser(): AuthUser | null {
  const storedUser = localStorage.getItem(AUTH_USER_KEY)

  if (!storedUser) {
    return null
  }

  try {
    return JSON.parse(storedUser) as AuthUser
  } catch {
    localStorage.removeItem(AUTH_USER_KEY)
    return null
  }
}

function decodeJwtPayload(tokenValue: string | null) {
  const payload = tokenValue?.split('.')[1]

  if (!payload) {
    return null
  }

  try {
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=')
    const decodedPayload = window.atob(paddedPayload)
    const bytes = Uint8Array.from(decodedPayload, (character) => character.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>
  } catch {
    return null
  }
}

function isStringOrNumber(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number'
}

function readCompanyId(value: Record<string, unknown>) {
  const companyId = value.currentCompanyId ?? value.activeCompanyId ?? value.companyId ?? value.ccid
  return isStringOrNumber(companyId) ? companyId : undefined
}

function normalizeStringArrayMap(value: unknown): Record<string, string[]> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }

  const normalizedMap: Record<string, string[]> = {}

  Object.entries(value as Record<string, unknown>).forEach(([key, items]) => {
    if (!Array.isArray(items)) {
      return
    }

    const normalizedItems = items
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim())

    if (normalizedItems.length) {
      normalizedMap[String(key)] = normalizedItems
    }
  })

  return Object.keys(normalizedMap).length ? normalizedMap : undefined
}

function normalizeAuthUser(userValue: AuthUser | null | undefined): AuthUser | null {
  if (!userValue) {
    return null
  }

  const userId = isStringOrNumber(userValue.id)
    ? userValue.id
    : isStringOrNumber(userValue.userId)
      ? userValue.userId
      : isStringOrNumber(userValue.uid)
        ? userValue.uid
        : undefined
  const companyId = userValue.currentCompanyId ?? userValue.activeCompanyId ?? userValue.companyId ?? userValue.ccid
  const normalizedCompanyId = isStringOrNumber(companyId) ? companyId : undefined
  const name = userValue.name || userValue.username || userValue.login || undefined

  return {
    ...userValue,
    id: userId,
    userId: userValue.userId ?? userId,
    uid: userValue.uid ?? userId,
    name,
    username: userValue.username || userValue.login || name,
    login: userValue.login || userValue.username || name,
    ccid: userValue.ccid ?? normalizedCompanyId,
    companyId: userValue.companyId ?? normalizedCompanyId,
    currentCompanyId: userValue.currentCompanyId ?? normalizedCompanyId,
    activeCompanyId: userValue.activeCompanyId ?? normalizedCompanyId,
    globalRoles: Array.isArray(userValue.globalRoles)
      ? userValue.globalRoles.filter((role): role is string => typeof role === 'string')
      : undefined,
    companyRoles: normalizeStringArrayMap(userValue.companyRoles),
    companyPermissions: normalizeStringArrayMap(userValue.companyPermissions),
  }
}

function userFromJwt(tokenValue: string | null): AuthUser | null {
  const payload = decodeJwtPayload(tokenValue)

  if (!payload) {
    return null
  }

  const userName = typeof payload.uname === 'string' ? payload.uname : null
  const userId = isStringOrNumber(payload.uid)
    ? payload.uid
    : isStringOrNumber(payload.userId)
      ? payload.userId
      : isStringOrNumber(payload.sub)
      ? payload.sub
      : undefined
  const companyId = readCompanyId(payload)

  if (!userName && !userId) {
    return null
  }

  return {
    id: userId,
    userId,
    uid: isStringOrNumber(payload.uid) ? payload.uid : undefined,
    name: userName || undefined,
    username: userName || undefined,
    login: userName || undefined,
    ccid: isStringOrNumber(payload.ccid) ? payload.ccid : undefined,
    companyId,
    currentCompanyId: companyId,
    activeCompanyId: companyId,
    sysAdmin: typeof payload.sysAdmin === 'boolean' ? payload.sysAdmin : undefined,
    globalRoles: Array.isArray(payload.globalRoles)
      ? payload.globalRoles.filter((role): role is string => typeof role === 'string')
      : undefined,
    companyRoles: normalizeStringArrayMap(payload.companyRoles ?? payload.croles),
    companyPermissions: normalizeStringArrayMap(payload.companyPermissions),
  }
}

function mergeUserWithJwt(userValue: AuthUser | null, tokenValue: string | null) {
  const jwtUser = userFromJwt(tokenValue)
  const normalizedUser = normalizeAuthUser(userValue)

  if (!normalizedUser) {
    return jwtUser
  }

  if (!jwtUser) {
    return normalizedUser
  }

  return normalizeAuthUser({
    ...jwtUser,
    ...normalizedUser,
    name: normalizedUser.name || jwtUser.name,
    login: normalizedUser.login || jwtUser.login,
  })
}

function jwtExpiresAt(tokenValue: string | null) {
  const payload = decodeJwtPayload(tokenValue)
  const exp = payload?.exp

  if (typeof exp === 'number') {
    return exp * 1000
  }

  if (typeof exp === 'string') {
    const parsed = Number(exp)
    return Number.isFinite(parsed) ? parsed * 1000 : null
  }

  return null
}

function expiresAtToTimestamp(value: string | number | null | undefined, tokenValue: string | null) {
  if (typeof value === 'number') {
    return value > 10_000_000_000 ? value : value * 1000
  }

  if (typeof value === 'string' && value.trim()) {
    const numericValue = Number(value)

    if (Number.isFinite(numericValue)) {
      return numericValue > 10_000_000_000 ? numericValue : numericValue * 1000
    }

    const parsedDate = new Date(value).getTime()
    return Number.isNaN(parsedDate) ? jwtExpiresAt(tokenValue) : parsedDate
  }

  return jwtExpiresAt(tokenValue)
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const user = ref<AuthUser | null>(null)
  const accessTokenExpiresAt = ref<number | null>(null)
  const isLoading = ref(false)
  const isRestored = ref(false)
  let proactiveRefreshTimer: ReturnType<typeof window.setTimeout> | null = null

  const isAuthenticated = computed(() => Boolean(token.value))
  const displayName = computed(() => user.value?.name || user.value?.username || user.value?.login || user.value?.email || 'Operator')
  const activeCompanyId = computed(() => {
    const explicitCompanyId = user.value?.currentCompanyId ?? user.value?.activeCompanyId ?? user.value?.companyId ?? user.value?.ccid

    if (explicitCompanyId !== undefined && explicitCompanyId !== null && String(explicitCompanyId)) {
      return String(explicitCompanyId)
    }

    const firstCompanyId = Object.keys(user.value?.companyPermissions || {})[0] || Object.keys(user.value?.companyRoles || {})[0]
    return firstCompanyId || null
  })
  const activeCompanyPermissions = computed(() => {
    const companyId = activeCompanyId.value
    return companyId ? user.value?.companyPermissions?.[companyId] || [] : []
  })
  const activeCompanyRoles = computed(() => {
    const companyId = activeCompanyId.value
    return companyId ? user.value?.companyRoles?.[companyId] || [] : []
  })
  const allCompanyRoles = computed(() => Object.values(user.value?.companyRoles || {}).flat())

  function hasActiveCompanyPermission(permission: string) {
    const normalizedPermission = permission.trim().toLowerCase()
    return activeCompanyPermissions.value.some((item) => item.toLowerCase() === normalizedPermission)
  }

  function hasActiveCompanyRole(role: string) {
    const normalizedRole = role.trim().toLowerCase()
    return activeCompanyRoles.value.some((item) => item.toLowerCase() === normalizedRole)
  }

  const canManageCompany = computed(() => (
    user.value?.sysAdmin === true ||
    (user.value?.globalRoles || []).some((role) => ['GLOBAL_ADMIN', 'SYS_ADMIN'].includes(role.toUpperCase())) ||
    hasActiveCompanyRole('COMPANY_ADMIN') ||
    (!activeCompanyId.value && allCompanyRoles.value.some((role) => role.toLowerCase() === 'company_admin')) ||
    hasActiveCompanyPermission('company.manage')
  ))

  function clearProactiveRefreshTimer() {
    if (proactiveRefreshTimer) {
      window.clearTimeout(proactiveRefreshTimer)
      proactiveRefreshTimer = null
    }
  }

  function scheduleProactiveRefresh() {
    clearProactiveRefreshTimer()

    if (!token.value || !accessTokenExpiresAt.value) {
      return
    }

    const refreshAt = accessTokenExpiresAt.value - Date.now() - 2 * 60 * 1000

    if (refreshAt <= 0) {
      void refreshAccessToken()
      return
    }

    proactiveRefreshTimer = window.setTimeout(() => {
      void refreshAccessToken()
    }, refreshAt)
  }

  function persistUser(nextUser: AuthUser | null) {
    if (nextUser) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser))
      return
    }

    localStorage.removeItem(AUTH_USER_KEY)
  }

  function applySession(session: AuthSession, options?: { preserveExistingUser?: boolean }) {
    token.value = session.token
    user.value = mergeUserWithJwt(
      options?.preserveExistingUser && !session.user ? user.value : session.user,
      session.token,
    )
    accessTokenExpiresAt.value = expiresAtToTimestamp(session.accessTokenExpiresAt, session.token)
    setAuthToken(session.token)
    persistUser(user.value)
    scheduleProactiveRefresh()
  }

  function clearLocalSession() {
    useFleetStore().resetApiState()
    useDeviceStore().resetApiState()
    useRepairStore().resetApiState()
    usePlaceStore().resetApiState()
    useNotificationStore().resetApiState()
    useCompanyManagementStore().resetApiState()
    token.value = null
    user.value = null
    accessTokenExpiresAt.value = null
    clearProactiveRefreshTimer()
    setAuthToken(null)
    localStorage.removeItem(AUTH_USER_KEY)
  }

  async function restoreBackendSession() {
    if (!token.value) {
      return
    }

    try {
      const session = await authService.getSession({ silent: true })

      if (session.token) {
        applySession({
          token: session.token,
          user: session.user,
          accessTokenExpiresAt: session.accessTokenExpiresAt,
        }, { preserveExistingUser: true })
        return
      }

      if (session.user) {
        user.value = mergeUserWithJwt(session.user, token.value)
        persistUser(user.value)
      }
    } catch {
      // 401 and refresh failure are handled by the API interceptor.
    }
  }

  function restoreSession() {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY)
    token.value = storedToken
    user.value = mergeUserWithJwt(readStoredUser(), storedToken)
    accessTokenExpiresAt.value = expiresAtToTimestamp(null, storedToken)
    setAuthToken(storedToken)
    scheduleProactiveRefresh()
    isRestored.value = true

    if (storedToken) {
      void restoreBackendSession()
    }
  }

  async function login(payload: LoginPayload) {
    const uiStore = useUiStore()
    isLoading.value = true

    try {
      const session = await authService.login(payload)
      applySession(session)

      uiStore.addToast({
        type: 'success',
        title: 'Zalogowano',
        message: 'Sesja zostala poprawnie rozpoczęta.',
      })
    } catch (error) {
      if (!(error && typeof error === 'object' && 'isAxiosError' in error)) {
        uiStore.addToast({
          type: 'error',
          title: 'Logowanie nieudane',
          message: error instanceof Error ? error.message : 'Nie udalo sie zalogowac.',
        })
      }

      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    const uiStore = useUiStore()

    try {
      await authService.logout()
    } finally {
      clearLocalSession()
      uiStore.addToast({
        type: 'info',
        title: 'Wylogowano',
        message: 'Sesja zostala zakonczona.',
      })
    }
  }

  async function refreshSessionToken() {
    return refreshAccessToken()
  }

  registerAuthSessionHandlers({
    setSession: (session) => applySession(session, { preserveExistingUser: true }),
    clearSession: clearLocalSession,
  })

  return {
    token,
    user,
    accessTokenExpiresAt,
    isLoading,
    isRestored,
    isAuthenticated,
    displayName,
    activeCompanyId,
    activeCompanyPermissions,
    activeCompanyRoles,
    canManageCompany,
    hasActiveCompanyPermission,
    hasActiveCompanyRole,
    restoreSession,
    restoreBackendSession,
    refreshSessionToken,
    login,
    logout,
  }
})
