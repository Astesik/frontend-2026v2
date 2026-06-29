import { api } from './api'
import type { AuthSession, LoginPayload, LoginResponse } from '@/types/auth'

function normalizeAuthResponse(response: LoginResponse): AuthSession {
  const nestedData = 'data' in response ? response.data : null
  const token =
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

  if (!token) {
    throw new Error('Backend nie zwrocil tokenu autoryzacyjnego.')
  }

  const user = ('user' in response ? response.user : undefined) ?? nestedData?.user ?? null

  return {
    token,
    user,
  }
}

export const authService = {
  async login(payload: LoginPayload) {
    const { data } = await api.post<LoginResponse>('/api/auth/login', payload)
    return normalizeAuthResponse(data)
  },

  async logout() {
    await api.post('/api/auth/logout')
  },
}
