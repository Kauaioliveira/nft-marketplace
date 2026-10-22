import axios from 'axios'
import { toApiError } from './errors'
import { sessionToken } from './session-token'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
})

type UnauthorizedListener = () => void
const unauthorizedListeners = new Set<UnauthorizedListener>()

/** Lets the session layer react to an expired token without the HTTP client knowing about React. */
export function onUnauthorized(listener: UnauthorizedListener) {
  unauthorizedListeners.add(listener)
  return () => unauthorizedListeners.delete(listener)
}

http.interceptors.request.use((config) => {
  const token = sessionToken.get()
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

http.interceptors.response.use(undefined, (error: unknown) => {
  const apiError = toApiError(error)
  if (apiError.code === 'UNAUTHORIZED' && sessionToken.get()) {
    unauthorizedListeners.forEach((listener) => listener())
  }
  return Promise.reject(apiError)
})
