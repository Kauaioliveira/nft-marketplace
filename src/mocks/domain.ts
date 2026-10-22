import Big from 'big.js'
import type { Cart, CartItem, Coupon, Network, Nft, Summary } from '@/api/contracts'
import { db, type CartLineRecord, type CartRecord, type MockState } from './db'
import { errorResponse } from './network'

/** Network fee estimates per chain, in ETH. */
export const NETWORK_FEES: Record<Network, string> = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.001',
}

/** Per-order cap on a single edition, on top of the stock limit. */
export const MAX_QUANTITY_PER_EDITION = 10

export function findEdition(state: Readonly<MockState>, nftId: string, editionId: string) {
  const nft = state.nfts.find((item) => item.id === nftId)
  const edition = nft?.editions.find((item) => item.id === editionId)
  return nft && edition ? { nft, edition } : null
}

export function maxQuantityFor(available: number) {
  return Math.min(available, MAX_QUANTITY_PER_EDITION)
}

export function summarize(
  lines: { unitPriceEth: string; quantity: number }[],
  coupon: Coupon | null,
  network: Network,
): Summary {
  const subtotal = lines.reduce(
    (sum, line) => sum.plus(new Big(line.unitPriceEth).times(line.quantity)),
    new Big(0),
  )
  const discount = coupon
    ? subtotal.times(coupon.percentOff).div(100).round(6, Big.roundDown)
    : new Big(0)
  const fee = lines.length > 0 ? new Big(NETWORK_FEES[network]) : new Big(0)
  return {
    subtotalEth: subtotal.toFixed(),
    discountEth: discount.toFixed(),
    networkFeeEth: fee.toFixed(),
    totalEth: subtotal.minus(discount).plus(fee).toFixed(),
  }
}

export function toCartItem(
  line: CartLineRecord,
  nft: Nft,
  editionId: string,
  unitPriceEth?: string,
): CartItem {
  const edition = nft.editions.find((item) => item.id === editionId)!
  const price = unitPriceEth ?? edition.priceEth
  return {
    id: line.id,
    nftId: nft.id,
    editionId,
    name: nft.name,
    tokenId: nft.tokenId,
    image: nft.images[0] ?? '',
    editionLabel: edition.label,
    unitPriceEth: price,
    quantity: line.quantity,
    available: edition.available,
    lineTotalEth: new Big(price).times(line.quantity).toFixed(),
  }
}

/** Cart response with live catalog prices. The cart estimate uses the Ethereum fee. */
export function buildCart(cart: CartRecord): Cart {
  const state = db.read()
  const items = cart.lines.flatMap((line) => {
    const found = findEdition(state, line.nftId, line.editionId)
    return found ? [toCartItem(line, found.nft, line.editionId)] : []
  })
  return {
    id: cart.id,
    items,
    coupon: cart.coupon,
    summary: summarize(items, cart.coupon, 'ethereum'),
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  }
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

export function readToken(request: Request) {
  const header = request.headers.get('Authorization') ?? ''
  return header.startsWith('Bearer ') ? header.slice(7) : null
}

/** Resolves the user of a request, or null when there is no valid session. */
export function currentUserId(request: Request): string | null {
  const token = readToken(request)
  if (!token) return null
  const session = db.read().sessions[token]
  if (!session) return null
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    db.write((state) => {
      delete state.sessions[token]
    })
    return null
  }
  return session.userId
}

export function unauthorized() {
  return errorResponse(401, 'UNAUTHORIZED', 'Sua sessão expirou. Entre novamente.')
}

export async function sha256(text: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
