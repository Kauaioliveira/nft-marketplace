import type { Nft } from '@/api/contracts'
import { readJson, removeKey, writeJson } from '@/lib/storage'
import { createCouponFixtures, type CouponRecord } from './fixtures/coupons'
import { createNftFixtures } from './fixtures/nfts'
import { createUserFixtures, type UserRecord } from './fixtures/users'

const STORAGE_KEY = 'kurio.mock-db'
const SCHEMA_VERSION = 1

export type SessionRecord = { userId: string; expiresAt: string }

export type MockState = {
  schemaVersion: number
  nfts: Nft[]
  users: UserRecord[]
  coupons: CouponRecord[]
  sessions: Record<string, SessionRecord>
  favorites: Record<string, string[]>
}

function seed(): MockState {
  return {
    schemaVersion: SCHEMA_VERSION,
    nfts: createNftFixtures(),
    users: createUserFixtures(),
    coupons: createCouponFixtures(),
    sessions: {},
    favorites: {},
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
