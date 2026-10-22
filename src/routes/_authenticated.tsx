import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
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
  // When the session ends while the page is open, private content disappears at once. The
  // navigation itself belongs to whoever ended it (logout or SessionExpiryWatcher): two
  // competing redirects here would chain `redirect=/login?redirect=...` endlessly.
  if (!isPending && !user) return null
  return <Outlet />
}
