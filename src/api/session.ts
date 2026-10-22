import { queryOptions } from '@tanstack/react-query'
import { sessionSchema, type Session } from './contracts'
import { ApiError, parseResponse } from './errors'
import { http } from './http'
import { sessionToken } from './session-token'

export const sessionKeys = {
  current: (token: string | null) => ['session', token] as const,
}

/** Resolves the current session, or null for visitors and expired tokens. */
export function sessionQuery() {
  const token = sessionToken.get()
  return queryOptions({
    queryKey: sessionKeys.current(token),
    queryFn: async ({ signal }): Promise<Session | null> => {
      if (!token) return null
      try {
        const { data } = await http.get('/auth/session', { signal })
        return parseResponse(sessionSchema, data)
      } catch (error) {
        if (error instanceof ApiError && error.code === 'UNAUTHORIZED') return null
        throw error
      }
    },
    staleTime: 5 * 60_000,
  })
}

export type LoginInput = { email: string; password: string }
export type RegisterInput = { username: string; email: string; password: string }

export async function login(input: LoginInput) {
  const { data } = await http.post('/auth/login', input)
  return parseResponse(sessionSchema, data)
}

export async function register(input: RegisterInput) {
  const { data } = await http.post('/auth/register', input)
  return parseResponse(sessionSchema, data)
}

export async function logout() {
  await http.post('/auth/logout')
}
