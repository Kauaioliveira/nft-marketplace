import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import { parseResponse } from './errors'
import { http } from './http'

const favoritesSchema = z.object({ nftIds: z.array(z.string()) })

export const favoriteKeys = {
  list: (userId: string) => ['favorites', userId] as const,
}

export function favoritesQuery(userId: string) {
  return queryOptions({
    queryKey: favoriteKeys.list(userId),
    queryFn: async ({ signal }) => {
      const { data } = await http.get('/favorites', { signal })
      return parseResponse(favoritesSchema, data).nftIds
    },
  })
}

export async function setFavorite(nftId: string, favorite: boolean) {
  const url = `/favorites/${encodeURIComponent(nftId)}`
  const { data } = favorite ? await http.put(url) : await http.delete(url)
  return parseResponse(favoritesSchema, data).nftIds
}
