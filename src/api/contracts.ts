import { z } from 'zod'

/** ETH amounts travel as decimal strings to avoid floating point errors. */
export const ethAmountSchema = z.string().regex(/^\d+(\.\d+)?$/, 'Valor em ETH inválido')

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export const nftCategories = [
  'digital-art',
  'photography',
  'music',
  '3d',
  'collectibles',
  'generative',
  'gaming',
  'subscriptions',
  'utility',
] as const
export const nftCategorySchema = z.enum(nftCategories)
export type NftCategory = z.infer<typeof nftCategorySchema>

export const networks = ['ethereum', 'polygon', 'solana'] as const
export const networkSchema = z.enum(networks)
export type Network = z.infer<typeof networkSchema>

export const nftSortOptions = ['recent', 'price-asc', 'price-desc', 'name'] as const
export const nftSortSchema = z.enum(nftSortOptions)
export type NftSort = z.infer<typeof nftSortSchema>

export const nftTabs = ['all', 'new', 'trending'] as const
export const nftTabSchema = z.enum(nftTabs)
export type NftTab = z.infer<typeof nftTabSchema>

export const editionSchema = z.object({
  id: z.string(),
  /** Label shown in the UI, e.g. "1/10" or "Aberta". */
  label: z.string(),
  priceEth: ethAmountSchema,
  supply: z.number().int().nonnegative(),
  available: z.number().int().nonnegative(),
})
export type Edition = z.infer<typeof editionSchema>

export const nftSchema = z.object({
  id: z.string(),
  tokenId: z.string(),
  name: z.string(),
  description: z.string(),
  collection: z.string(),
  creator: z.string(),
  category: nftCategorySchema,
  network: networkSchema,
  images: z.array(z.string()).min(1),
  /** Price of the default edition, used by the catalog cards and the price filter. */
  priceEth: ethAmountSchema,
  compareAtPriceEth: ethAmountSchema.nullable(),
  rare: z.boolean(),
  trending: z.boolean(),
  attributes: z.array(z.string()),
  rating: z.object({ average: z.number(), count: z.number().int() }),
  editions: z.array(editionSchema).min(1),
  createdAt: z.string(),
  /** Incremented on every change; realtime events carry the same number. */
  version: z.number().int(),
})
export type Nft = z.infer<typeof nftSchema>

export const facetCountSchema = z.record(z.string(), z.number().int())

export const nftListSchema = z.object({
  items: z.array(nftSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
  facets: z.object({ category: facetCountSchema, network: facetCountSchema }),
})
export type NftList = z.infer<typeof nftListSchema>

export type NftListParams = {
  q?: string
  tab?: NftTab
  category?: NftCategory[]
  network?: Network[]
  minPrice?: string
  maxPrice?: string
  sort?: NftSort
  page?: number
  pageSize?: number
}

// ---------------------------------------------------------------------------
// Session and account
// ---------------------------------------------------------------------------

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  email: z.string(),
  avatar: z.string().nullable(),
})
export type User = z.infer<typeof userSchema>

export const profileSchema = userSchema.extend({
  ensName: z.string(),
  walletNickname: z.string(),
})
export type Profile = z.infer<typeof profileSchema>

export const sessionSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
  user: userSchema,
})
export type Session = z.infer<typeof sessionSchema>

// ---------------------------------------------------------------------------
// Cart and quote
// ---------------------------------------------------------------------------

export const summarySchema = z.object({
  subtotalEth: ethAmountSchema,
  discountEth: ethAmountSchema,
  networkFeeEth: ethAmountSchema,
  totalEth: ethAmountSchema,
})
export type Summary = z.infer<typeof summarySchema>

export const cartItemSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: z.string(),
  editionLabel: z.string(),
  unitPriceEth: ethAmountSchema,
  quantity: z.number().int().positive(),
  available: z.number().int().nonnegative(),
  lineTotalEth: ethAmountSchema,
})
export type CartItem = z.infer<typeof cartItemSchema>

export const couponSchema = z.object({ code: z.string(), percentOff: z.number() })
export type Coupon = z.infer<typeof couponSchema>

export const cartSchema = z.object({
  id: z.string(),
  items: z.array(cartItemSchema),
  coupon: couponSchema.nullable(),
  summary: summarySchema,
  itemCount: z.number().int(),
})
export type Cart = z.infer<typeof cartSchema>

export const quoteSchema = z.object({
  id: z.string(),
  items: z.array(cartItemSchema),
  coupon: couponSchema.nullable(),
  summary: summarySchema,
  network: networkSchema,
  expiresAt: z.string(),
})
export type Quote = z.infer<typeof quoteSchema>

// ---------------------------------------------------------------------------
// Wallets and orders
// ---------------------------------------------------------------------------

export const walletProviders = ['metamask', 'walletconnect', 'coinbase'] as const
export const walletProviderSchema = z.enum(walletProviders)
export type WalletProvider = z.infer<typeof walletProviderSchema>

export const walletSchema = z.object({
  id: z.string(),
  role: z.enum(['primary', 'secondary']),
  label: z.string(),
  provider: walletProviderSchema,
  network: networkSchema,
  address: z.string(),
})
export type Wallet = z.infer<typeof walletSchema>

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'declined'])
export type OrderStatus = z.infer<typeof orderStatusSchema>

export const orderSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  /** Snapshot taken when the order was created; later catalog changes never touch it. */
  items: z.array(cartItemSchema),
  summary: summarySchema,
  coupon: couponSchema.nullable(),
  network: networkSchema,
  wallet: z.object({ provider: walletProviderSchema, address: z.string() }),
  transactionHash: z.string().nullable(),
  explorerUrl: z.string().nullable(),
  declineReason: z.string().nullable(),
  version: z.number().int(),
})
export type Order = z.infer<typeof orderSchema>

// ---------------------------------------------------------------------------
// Realtime events
// ---------------------------------------------------------------------------

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

export const orderUpdatedEventSchema = realtimeEventSchema.extend({
  type: z.literal('order.updated'),
  payload: orderSchema,
})
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>
