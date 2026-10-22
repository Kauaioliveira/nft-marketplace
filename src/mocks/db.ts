import type { Coupon, Network, Nft, Order, Wallet, WalletProvider } from '@/api/contracts'
import { readJson, removeKey, writeJson } from '@/lib/storage'
import { createCouponFixtures, type CouponRecord } from './fixtures/coupons'
import { createNftFixtures } from './fixtures/nfts'
import { createUserFixtures, type UserRecord } from './fixtures/users'
import { createWalletFixtures } from './fixtures/wallets'

const STORAGE_KEY = 'kurio.mock-db'
const SCHEMA_VERSION = 2

export type SessionRecord = { userId: string; expiresAt: string }

export type CartLineRecord = { id: string; nftId: string; editionId: string; quantity: number }

export type CartRecord = {
  id: string
  /** null for a visitor cart, identified only by its id. */
  userId: string | null
  lines: CartLineRecord[]
  coupon: Coupon | null
}

export type QuoteRecord = {
  id: string
  userId: string
  cartId: string
  network: Network
  /** Prices and quantities frozen when the quote was issued. */
  lines: { nftId: string; editionId: string; quantity: number; unitPriceEth: string }[]
  coupon: Coupon | null
  expiresAt: string
}

export type OrderRecord = Order & {
  userId: string
  cartId: string
  /** When the simulated payment settles. Resolution is lazy so it survives a page refresh. */
  resolvesAt: string
  outcome: 'confirmed' | 'declined'
}

export type IdempotencyRecord = { orderId: string; fingerprint: string }

export type MockState = {
  schemaVersion: number
  nfts: Nft[]
  users: UserRecord[]
  coupons: CouponRecord[]
  sessions: Record<string, SessionRecord>
  favorites: Record<string, string[]>
  carts: Record<string, CartRecord>
  quotes: Record<string, QuoteRecord>
  orders: Record<string, OrderRecord>
  idempotency: Record<string, IdempotencyRecord>
  wallets: Record<string, Wallet[]>
  /** Wallets the simulated extension has authorized, per user. */
  connectedWallets: Record<string, WalletProvider[]>
}

function seed(): MockState {
  return {
    schemaVersion: SCHEMA_VERSION,
    nfts: createNftFixtures(),
    users: createUserFixtures(),
    coupons: createCouponFixtures(),
    sessions: {},
    favorites: { 'user-ana': ['nft-3'] },
    carts: {},
    quotes: {},
    orders: {},
    idempotency: {},
    wallets: createWalletFixtures(),
    connectedWallets: {},
  }
}

function load(): MockState {
  const stored = readJson<MockState>(STORAGE_KEY)
  // A schema bump discards old data instead of trying to migrate it.
  return stored?.schemaVersion === SCHEMA_VERSION ? stored : seed()
}

let state = load()

/**
 * In-memory database of the mock backend, persisted to localStorage so a refresh keeps
 * carts, orders and sessions. Handlers read with `db.read()` and write with `db.write()`.
 */
export const db = {
  read: (): Readonly<MockState> => state,
  write<T>(mutate: (draft: MockState) => T): T {
    const result = mutate(state)
    writeJson(STORAGE_KEY, state)
    return result
  },
  reset() {
    state = seed()
    removeKey(STORAGE_KEY)
    writeJson(STORAGE_KEY, state)
  },
}

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}
