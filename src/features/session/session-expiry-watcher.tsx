import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { onUnauthorized } from '@/api/http'
import { sessionToken } from '@/api/session-token'

/**
 * Reacts to a 401 on an authenticated request: forgets the session and its cached data, then
 * sends private screens to the login page with a redirect back. The checkout draft stays in
 * sessionStorage, so the user resumes where they stopped.
 */
export function SessionExpiryWatcher() {
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(
    () =>
      onUnauthorized(() => {
        if (!sessionToken.get()) return
        sessionToken.clear()
        queryClient.clear()

        const { location, matches } = router.state
        const onPrivateRoute = matches.some((match) => match.routeId.startsWith('/_authenticated'))
        toast.warning('Sua sessão expirou. Entre novamente para continuar.')
        if (onPrivateRoute) {
          void router.navigate({
            to: '/login',
            search: { redirect: location.href, reason: 'expired' },
          })
        }
      }),
    [queryClient, router],
  )

  return null
}
