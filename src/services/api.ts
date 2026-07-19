import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { useUiStore } from '@/stores/uiStore'
import type { AuthUser, RefreshResponse } from '@/types/auth'

const AUTH_TOKEN_KEY = 'routewise.auth.token'
const AUTH_USER_KEY = 'routewise.auth.user'
const DEFAULT_API_BASE_URL = ''

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipErrorToast?: boolean
  }
}

interface ApiRequestConfig extends InternalAxiosRequestConfig {
  skipErrorToast?: boolean
  _retry?: boolean
}

interface RefreshedAuthSession {
  token: string
  user: AuthUser | null
  accessTokenExpiresAt?: string | number | null
}

interface AuthSessionHandlers {
  setSession: (session: RefreshedAuthSession) => void
  clearSession: () => void
}

let authSessionHandlers: AuthSessionHandlers | null = null
let refreshPromise: Promise<string | null> | null = null

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
})

export function registerAuthSessionHandlers(handlers: AuthSessionHandlers) {
  authSessionHandlers = handlers
}

function normalizeToken(token: string | null) {
  const normalizedToken = token?.replace(/^Bearer\s+/i, '').trim()
  return normalizedToken || null
}

export function getStoredToken() {
  return normalizeToken(localStorage.getItem(AUTH_TOKEN_KEY))
}

export function setAuthToken(token: string | null) {
  const normalizedToken = normalizeToken(token)

  if (normalizedToken) {
    localStorage.setItem(AUTH_TOKEN_KEY, normalizedToken)
    api.defaults.headers.common.Authorization = `Bearer ${normalizedToken}`
    return
  }

  localStorage.removeItem(AUTH_TOKEN_KEY)
  delete api.defaults.headers.common.Authorization
}

function tokenFromRefreshResponse(response: RefreshResponse) {
  const nestedData = response.data
  return (
    response.accessToken ??
    response.access_token ??
    response.token ??
    response.jwt ??
    response.bearerToken ??
    response.bearer_token ??
    nestedData?.accessToken ??
    nestedData?.access_token ??
    nestedData?.token ??
    nestedData?.jwt ??
    nestedData?.bearerToken ??
    nestedData?.bearer_token ??
    null
  )
}

function userFromRefreshResponse(response: RefreshResponse) {
  return response.user ?? response.data?.user ?? null
}

function expiresAtFromRefreshResponse(response: RefreshResponse) {
  return (
    response.accessTokenExpiresAt ??
    response.access_token_expires_at ??
    response.expiresAt ??
    response.expires_at ??
    response.data?.accessTokenExpiresAt ??
    response.data?.access_token_expires_at ??
    response.data?.expiresAt ??
    response.data?.expires_at ??
    null
  )
}

function clearStoredAuthSession() {
  setAuthToken(null)
  localStorage.removeItem(AUTH_USER_KEY)
  authSessionHandlers?.clearSession()
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = refreshClient.post<RefreshResponse>('/api/auth/refresh', null, { withCredentials: true })
      .then(({ data }) => {
        const token = tokenFromRefreshResponse(data)

        if (!token) {
          throw new Error('Backend nie zwrocil tokenu odswiezenia sesji.')
        }

        const session = {
          token,
          user: userFromRefreshResponse(data),
          accessTokenExpiresAt: expiresAtFromRefreshResponse(data),
        }

        setAuthToken(session.token)
        authSessionHandlers?.setSession(session)
        return session.token
      })
      .catch(() => {
        clearStoredAuthSession()
        return null
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

function isAuthPath(url: string | undefined, path: string) {
  return Boolean(url?.includes(path))
}

function shouldAttemptRefresh(error: AxiosError, config: ApiRequestConfig | undefined) {
  if (error.response?.status !== 401 || !config || config._retry) {
    return false
  }

  if (
    isAuthPath(config.url, '/api/auth/login') ||
    isAuthPath(config.url, '/api/auth/refresh') ||
    isAuthPath(config.url, '/api/auth/logout')
  ) {
    return false
  }

  return Boolean(getStoredToken())
}

function resolveApiErrorMessage(error: AxiosError) {
  const data = error.response?.data

  if (typeof data === 'string') {
    return data
  }

  if (data && typeof data === 'object') {
    const possibleMessage =
      'message' in data
        ? data.message
        : 'error' in data
          ? data.error
          : 'detail' in data
            ? data.detail
            : null

    if (typeof possibleMessage === 'string') {
      return possibleMessage
    }
  }

  if (error.response?.status === 401) {
    return 'Sesja wygasla albo dane logowania sa niepoprawne.'
  }

  if (error.response?.status === 403) {
    return 'Brak uprawnien do wykonania tej operacji.'
  }

  if (error.response?.status === 413) {
    return 'Zdjęcie może mieć maksymalnie 20 MB.'
  }

  return 'Nie udalo sie polaczyc z backendem. Sprobuj ponownie.'
}

api.interceptors.request.use((config) => {
  const token = getStoredToken()
  const headers = AxiosHeaders.from(config.headers)

  if (config.data instanceof FormData) {
    headers.delete('Content-Type')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  config.headers = headers

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as ApiRequestConfig | undefined

    if (shouldAttemptRefresh(error, config)) {
      config!._retry = true
      const token = await refreshAccessToken()

      if (token) {
        const headers = AxiosHeaders.from(config!.headers)
        headers.set('Authorization', `Bearer ${token}`)
        config!.headers = headers
        return api(config!)
      }
    }

    if (!config?.skipErrorToast) {
      const uiStore = useUiStore()
      uiStore.addToast({
        type: 'error',
        title: 'Blad API',
        message: resolveApiErrorMessage(error),
      })
    }

    if (error.response?.status === 401 && !config?.url?.includes('/api/auth/login')) {
      clearStoredAuthSession()
    }

    return Promise.reject(error)
  },
)
