import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { cartKeys, mergeVisitorCart } from '@/api/cart'
import type { Session } from '@/api/contracts'
import { logout, sessionKeys } from '@/api/session'
import { sessionToken } from '@/api/session-token'
import { visitorCart } from '@/api/visitor-cart'
import { clearCheckoutDraft } from '@/features/checkout/checkout-storage'

export function useAuthActions() {
  const queryClient = useQueryClient()

  /** Starts a session: drops every cached entry of the previous owner and merges the visitor cart. */
  const startSession = useCallback(
    async (session: Session) => {
      const visitorCartId = visitorCart.get()
      queryClient.clear()
      sessionToken.set(session.token)
      queryClient.setQueryData(sessionKeys.current(session.token), session)
      if (!visitorCartId) return
      try {
        const cart = await mergeVisitorCart(visitorCartId)
        queryClient.setQueryData(cartKeys.current(session.user.id), cart)
      } finally {
        // Merged or not, the visitor cart must not leak into the next visitor session.
        visitorCart.clear()
      }
    },
    [queryClient],
  )

  const endSession = useCallback(async () => {
    try {
      await logout()
    } catch {
      // The token is discarded locally even if the API call fails.
    }
    sessionToken.clear()
    clearCheckoutDraft()
    queryClient.clear()
  }, [queryClient])

  return { startSession, endSession }
}
