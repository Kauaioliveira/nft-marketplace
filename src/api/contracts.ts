import { z } from 'zod'

/** ETH amounts travel as decimal strings to avoid floating point errors. */
export const ethAmountSchema = z.string().regex(/^\d+(\.\d+)?$/, 'Valor em ETH inválido')

export const nftCategories = [
  'art',
  'collectibles',
  'gaming',
  'music',
  'photography',
  'pfp',
] as const
export const nftCategorySchema = z.enum(nftCategories)
export type NftCategory = z.infer<typeof nftCategorySchema>

export const nftSortOptions = ['recent', 'price-asc', 'price-desc', 'name'] as const
export const nftSortSchema = z.enum(nftSortOptions)
export type NftSort = z.infer<typeof nftSortSchema>

export const editionSchema = z.object({
  id: z.string(),
  name: z.string(),
  priceEth: ethAmountSchema,
  supply: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
})
export type Edition = z.infer<typeof editionSchema>

export const nftSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  collection: z.string(),
  creator: z.object({ name: z.string(), avatar: z.string() }),
  category: nftCategorySchema,
  images: z.array(z.string()).min(1),
  priceEth: ethAmountSchema,
  editions: z.array(editionSchema),
  featured: z.boolean(),
  createdAt: z.string(),
  /** Incremented on every change; realtime events carry the same number. */
  version: z.number().int(),
})
export type Nft = z.infer<typeof nftSchema>

export const nftListSchema = z.object({
  items: z.array(nftSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
})
export type NftList = z.infer<typeof nftListSchema>

export type NftListParams = {
  q?: string
  category?: NftCategory[]
  sort?: NftSort
  page?: number
  pageSize?: number
}

/** Envelope shared by every Socket.IO event. */
export const realtimeEventSchema = z.object({
  eventId: z.string(),
  type: z.string(),
  resource: z.object({ type: z.string(), id: z.string() }),
  version: z.number().int(),
  occurredAt: z.string(),
  userId: z.string().optional(),
  payload: z.unknown(),
})
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>

export const nftUpdatedEventSchema = realtimeEventSchema.extend({
  type: z.literal('nft.updated'),
  payload: nftSchema,
})
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>
