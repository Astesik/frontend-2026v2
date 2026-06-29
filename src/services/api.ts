import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { useUiStore } from '@/stores/uiStore'

const AUTH_TOKEN_KEY = 'routewise.auth.token'
const DEFAULT_API_BASE_URL = 'http://localhost:8080'

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipErrorToast?: boolean
  }
}

interface ApiRequestConfig extends InternalAxiosRequestConfig {
  skipErrorToast?: boolean
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

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

  return 'Nie udalo sie polaczyc z backendem. Sprobuj ponownie.'
}

api.interceptors.request.use((config) => {
  const token = getStoredToken()

  if (token) {
    const headers = AxiosHeaders.from(config.headers)
    headers.set('Authorization', `Bearer ${token}`)
    config.headers = headers
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const config = error.config as ApiRequestConfig | undefined

    if (!config?.skipErrorToast) {
      const uiStore = useUiStore()
      uiStore.addToast({
        type: 'error',
        title: 'Blad API',
        message: resolveApiErrorMessage(error),
      })
    }

    if (error.response?.status === 401 && !config?.url?.includes('/api/auth/login')) {
      setAuthToken(null)
      localStorage.removeItem('routewise.auth.user')
    }

    return Promise.reject(error)
  },
)
