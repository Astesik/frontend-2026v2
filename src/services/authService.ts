import { api } from './api'
import type { AuthSession, AuthSessionState, LoginPayload, LoginResponse, SessionResponse } from '@/types/auth'

function tokenFromAuthResponse(response: AuthSessionState) {
  const nestedData = 'data' in response ? response.data : null
  return (
    ('token' in response ? response.token : undefined) ??
    ('accessToken' in response ? response.accessToken : undefined) ??
    ('access_token' in response ? response.access_token : undefined) ??
    ('jwt' in response ? response.jwt : undefined) ??
    ('bearerToken' in response ? response.bearerToken : undefined) ??
    ('bearer_token' in response ? response.bearer_token : undefined) ??
    nestedData?.token ??
    nestedData?.accessToken ??
    nestedData?.access_token ??
    nestedData?.jwt ??
    nestedData?.bearerToken ??
    nestedData?.bearer_token
  )
}

function userFromAuthResponse(response: AuthSessionState) {
  const nestedData = 'data' in response ? response.data : null
  return ('user' in response ? response.user : undefined) ?? nestedData?.user ?? null
}

function expiresAtFromAuthResponse(response: AuthSessionState) {
  const nestedData = 'data' in response ? response.data : null
  return (
    response.accessTokenExpiresAt ??
    response.access_token_expires_at ??
    response.expiresAt ??
    response.expires_at ??
    nestedData?.accessTokenExpiresAt ??
    nestedData?.access_token_expires_at ??
    nestedData?.expiresAt ??
    nestedData?.expires_at ??
    null
  )
}

export function normalizeAuthResponse(response: LoginResponse): AuthSession {
  const token = tokenFromAuthResponse(response)

  if (!token) {
    throw new Error('Backend nie zwrocil tokenu autoryzacyjnego.')
  }

  return {
    token,
    user: userFromAuthResponse(response),
    accessTokenExpiresAt: expiresAtFromAuthResponse(response),
  }
}

function normalizeSessionResponse(response: SessionResponse) {
  const token = tokenFromAuthResponse(response)

  return {
    token: token || null,
    user: userFromAuthResponse(response),
    accessTokenExpiresAt: expiresAtFromAuthResponse(response),
  }
}

export const authService = {
  async login(payload: LoginPayload) {
    const { data } = await api.post<LoginResponse>('/api/auth/login', payload)
    return normalizeAuthResponse(data)
  },

  async getSession(options?: { silent?: boolean }) {
    const { data } = await api.get<SessionResponse>('/api/auth/session', {
      skipErrorToast: options?.silent,
    })
    return normalizeSessionResponse(data)
  },

  async logout() {
    await api.post('/api/auth/logout')
  },
}
