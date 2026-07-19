import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { refreshAccessToken, registerAuthSessionHandlers, setAuthToken } from '@/services/api'
import { authService } from '@/services/authService'
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

function userFromJwt(tokenValue: string | null): AuthUser | null {
  const payload = decodeJwtPayload(tokenValue)

  if (!payload) {
    return null
  }

  const userName = typeof payload.uname === 'string' ? payload.uname : null
  const userId = typeof payload.uid === 'string' || typeof payload.uid === 'number'
    ? payload.uid
    : typeof payload.sub === 'string' || typeof payload.sub === 'number'
      ? payload.sub
      : undefined

  if (!userName && !userId) {
    return null
  }

  return {
    id: userId,
    name: userName || undefined,
    login: userName || undefined,
  }
}

function mergeUserWithJwt(userValue: AuthUser | null, tokenValue: string | null) {
  const jwtUser = userFromJwt(tokenValue)

  if (!userValue) {
    return jwtUser
  }

  if (!jwtUser) {
    return userValue
  }

  return {
    ...jwtUser,
    ...userValue,
    name: userValue.name || jwtUser.name,
    login: userValue.login || jwtUser.login,
  }
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
  const displayName = computed(() => user.value?.name || user.value?.login || user.value?.email || 'Operator')

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
    restoreSession,
    restoreBackendSession,
    login,
    logout,
  }
})
