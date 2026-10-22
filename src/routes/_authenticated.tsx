import { createFileRoute, Navigate, Outlet, redirect, useRouterState } from '@tanstack/react-router'
import { sessionQuery } from '@/api/session'
import { useSession } from '@/features/session/use-session'

/**
 * Pathless layout for every private screen (checkout, orders, profile, wallets). The guard runs
 * before the route loads, so a visitor never sees private content flash, and it keeps the
 * requested URL to return to after login.
 */
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    const session = await context.queryClient.ensureQueryData(sessionQuery())
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } })
    }
    return { session }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { user, isPending } = useSession()
  const href = useRouterState({ select: (state) => state.location.href })
  // Covers a session that ends while the page is open (logout in another tab, expiry).
  if (!isPending && !user) return <Navigate to="/login" search={{ redirect: href }} replace />
  return <Outlet />
}
