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
}

export type LoginResponse = AuthSession | {
  token?: string
  accessToken?: string
  access_token?: string
  jwt?: string
  bearerToken?: string
  bearer_token?: string
  user?: AuthUser
  data?: {
    token?: string
    accessToken?: string
    access_token?: string
    jwt?: string
    bearerToken?: string
    bearer_token?: string
    user?: AuthUser
  }
}
