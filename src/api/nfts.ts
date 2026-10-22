import { queryOptions } from '@tanstack/react-query'
import { nftListSchema, nftSchema, type NftListParams } from './contracts'
import { parseResponse } from './errors'
import { http } from './http'

export const nftKeys = {
  all: ['nfts'] as const,
  lists: () => [...nftKeys.all, 'list'] as const,
  list: (params: NftListParams) => [...nftKeys.lists(), params] as const,
  detail: (id: string) => [...nftKeys.all, 'detail', id] as const,
}

export function nftListQuery(params: NftListParams) {
  return queryOptions({
    queryKey: nftKeys.list(params),
    // The signal lets TanStack Query cancel a request when the params change mid-flight.
    queryFn: async ({ signal }) => {
      const { data } = await http.get('/nfts', {
        params: {
          ...params,
          category: params.category?.join(',') || undefined,
          network: params.network?.join(',') || undefined,
        },
        signal,
      })
      return parseResponse(nftListSchema, data)
    },
  })
}

export function nftDetailQuery(id: string) {
  return queryOptions({
    queryKey: nftKeys.detail(id),
    queryFn: async ({ signal }) => {
      const { data } = await http.get(`/nfts/${encodeURIComponent(id)}`, { signal })
      return parseResponse(nftSchema, data)
    },
  })
}
