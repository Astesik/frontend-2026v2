import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { setAuthToken } from '@/services/api'
import { authService } from '@/services/authService'
import { useUiStore } from './uiStore'
import type { AuthUser, LoginPayload } from '@/types/auth'

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

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const user = ref<AuthUser | null>(null)
  const isLoading = ref(false)
  const isRestored = ref(false)

  const isAuthenticated = computed(() => Boolean(token.value))
  const displayName = computed(() => user.value?.name || user.value?.login || user.value?.email || 'Operator')

  function restoreSession() {
    token.value = localStorage.getItem(AUTH_TOKEN_KEY)
    user.value = mergeUserWithJwt(readStoredUser(), token.value)
    setAuthToken(token.value)
    isRestored.value = true
  }

  async function login(payload: LoginPayload) {
    const uiStore = useUiStore()
    isLoading.value = true

    try {
      const session = await authService.login(payload)
      token.value = session.token
      user.value = mergeUserWithJwt(session.user, session.token)
      setAuthToken(session.token)

      if (session.user) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user))
      } else {
        localStorage.removeItem(AUTH_USER_KEY)
      }

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
      token.value = null
      user.value = null
      setAuthToken(null)
      localStorage.removeItem(AUTH_USER_KEY)
      uiStore.addToast({
        type: 'info',
        title: 'Wylogowano',
        message: 'Sesja zostala zakonczona.',
      })
    }
  }

  return {
    token,
    user,
    isLoading,
    isRestored,
    isAuthenticated,
    displayName,
    restoreSession,
    login,
    logout,
  }
})
