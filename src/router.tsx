import { createRouter } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { NotFound } from '@/components/not-found'
import { parseSearch, stringifySearch } from '@/lib/search-params'
import { routeTree } from './routeTree.gen'

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    // Freshness is handled by TanStack Query, so the router always calls the loaders.
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: () => <NotFound />,
    scrollRestoration: true,
    parseSearch,
    stringifySearch,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
