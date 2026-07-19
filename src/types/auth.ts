export interface AuthUser {
  id?: string | number
  name?: string
  email?: string
  login?: string
  role?: string
}

export interface LoginPayload {
  login: string
  password: string
}

export interface AuthSession {
  token: string
  user: AuthUser | null
  accessTokenExpiresAt?: string | number | null
}

export interface AuthSessionState {
  token?: string
  accessToken?: string
  access_token?: string
  jwt?: string
  bearerToken?: string
  bearer_token?: string
  accessTokenExpiresAt?: string | number | null
  access_token_expires_at?: string | number | null
  expiresAt?: string | number | null
  expires_at?: string | number | null
  user?: AuthUser | null
  data?: AuthSessionState
}

export type LoginResponse = AuthSession | AuthSessionState

export type RefreshResponse = AuthSessionState

export type SessionResponse = Partial<AuthSessionState>
