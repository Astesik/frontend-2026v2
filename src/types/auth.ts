export interface AuthUser {
  id?: string | number
  userId?: string | number
  uid?: string | number
  name?: string
  username?: string
  email?: string
  login?: string
  role?: string
  firstName?: string
  lastName?: string
  companyId?: string | number
  activeCompanyId?: string | number
  currentCompanyId?: string | number
  ccid?: string | number
  sysAdmin?: boolean
  globalRoles?: string[]
  companyRoles?: Record<string, string[]>
  companyPermissions?: Record<string, string[]>
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
