import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { MobileNav } from '@/components/mobile-nav'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { Toaster } from '@/components/ui/sonner'
import { SessionExpiryWatcher } from '@/features/session/session-expiry-watcher'

type RouterContext = { queryClient: QueryClient }

// Loaded only when the mock layer is on, so it never ships in a build that talks to a real API.
const DevPanel =
  import.meta.env.VITE_ENABLE_MOCKS === 'true'
    ? lazy(() => import('@/components/dev-panel').then((m) => ({ default: m.DevPanel })))
    : null

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

function RootLayout() {
  return (
    <div className="flex min-h-dvh flex-col pb-20 md:pb-0">
      <a
        href="#conteudo"
        className="focus:bg-brand focus:text-ink sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:px-3 focus:py-2"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader />
      {/* At least one screen tall: the footer starts below the fold, so it does not jump into
          view while a page swaps its skeleton for the real content (CLS). */}
      <main id="conteudo" className="min-h-dvh flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <MobileNav />
      <SessionExpiryWatcher />
      <Toaster position="top-center" />
      {DevPanel && (
        <Suspense fallback={null}>
          <DevPanel />
        </Suspense>
      )}
    </div>
  )
}
