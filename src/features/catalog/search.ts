import { z } from 'zod'
import {
  networkSchema,
  nftCategorySchema,
  nftSortSchema,
  nftTabSchema,
  type NftListParams,
} from '@/api/contracts'

export const CATALOG_PAGE_SIZE = 9

const decimal = z.string().regex(/^\d+(\.\d+)?$/)

/**
 * Catalog state lives in the URL, so refresh, sharing and back/forward restore it. Every field
 * is optional and falls back to undefined when the URL holds garbage.
 */
export const catalogSearchSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  tab: nftTabSchema.optional().catch(undefined),
  category: z.array(nftCategorySchema).optional().catch(undefined),
  network: z.array(networkSchema).optional().catch(undefined),
  minPrice: decimal.optional().catch(undefined),
  maxPrice: decimal.optional().catch(undefined),
  sort: nftSortSchema.optional().catch(undefined),
  page: z.number().int().min(1).optional().catch(undefined),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export function toListParams(search: CatalogSearch): NftListParams {
  return {
    q: search.q || undefined,
    tab: search.tab ?? 'all',
    category: search.category?.length ? [...search.category].sort() : undefined,
    network: search.network?.length ? [...search.network].sort() : undefined,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    sort: search.sort ?? 'recent',
    page: search.page ?? 1,
    pageSize: CATALOG_PAGE_SIZE,
  }
}
