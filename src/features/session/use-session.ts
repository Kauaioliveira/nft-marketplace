import { useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { sessionQuery } from '@/api/session'
import { sessionToken } from '@/api/session-token'

export function useSessionToken() {
  return useSyncExternalStore(sessionToken.subscribe, sessionToken.get)
}

/** Current session. `user` is null for visitors; `isPending` is true while it is being checked. */
export function useSession() {
  // Reading the token here re-renders consumers when it changes (login, logout, expiry).
  useSessionToken()
  const query = useQuery(sessionQuery())
  return {
    session: query.data ?? null,
    user: query.data?.user ?? null,
    isPending: query.isPending,
  }
}

/** Cache owner for the cart: each user and the anonymous visitor have separate entries. */
export function useCartOwner() {
  const { user, isPending } = useSession()
  return { owner: user?.id ?? 'visitor', isPending }
}
