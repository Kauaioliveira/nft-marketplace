import { QueryClient } from '@tanstack/react-query'
import { toApiError } from './errors'

const MAX_RETRIES = 2

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        // Retry only transient failures; a 404 or 401 will not change on its own.
        retry: (failureCount, error) => toApiError(error).isRetryable && failureCount < MAX_RETRIES,
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4000),
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Mutations are never retried automatically: orders rely on explicit idempotent retries.
        retry: false,
      },
    },
  })
}
