import Big from 'big.js'
import { delay, http, HttpResponse } from 'msw'
import { z } from 'zod'
import { networkSchema, walletProviderSchema, type Order, type Quote } from '@/api/contracts'
import { createId, db, type OrderRecord, type QuoteRecord } from '../db'
import {
  currentUserId,
  findEdition,
  maxQuantityFor,
  summarize,
  toCartItem,
  unauthorized,
} from '../domain'
import { errorResponse, simulateNetwork } from '../network'
import { publishNftUpdated, publishOrderUpdated } from '../realtime'
import { scenario } from '../scenarios'

const QUOTE_TTL_MS = 5 * 60_000
const SETTLEMENT_MS = 2500
const TIMEOUT_DELAY_MS = 10_000

const quoteRequestSchema = z.object({ network: networkSchema })
const orderRequestSchema = z.object({
  quoteId: z.string(),
  wallet: z.object({
    provider: walletProviderSchema,
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  }),
  buyer: z.object({ name: z.string().min(1), email: z.email() }),
})
const connectSchema = z.object({ provider: walletProviderSchema })

function userCart(userId: string) {
  return Object.values(db.read().carts).find((cart) => cart.userId === userId) ?? null
}

function toQuote(record: QuoteRecord): Quote {
  const state = db.read()
  const items = record.lines.flatMap((line, index) => {
    const found = findEdition(state, line.nftId, line.editionId)
    if (!found) return []
    const item = toCartItem(
      { id: `q${index}`, ...line },
      found.nft,
      line.editionId,
      line.unitPriceEth,
    )
    return [item]
  })
  return {
    id: record.id,
    items,
    coupon: record.coupon,
    summary: summarize(items, record.coupon, record.network),
    network: record.network,
    expiresAt: record.expiresAt,
  }
}

type QuoteIssue = {
  nftId: string
  name?: string
  reason: 'removed' | 'unavailable' | 'price_changed'
  available?: number
  priceEth?: string
}

/** Compares a quote with the live catalog. Any difference makes the quote unusable. */
function quoteIssues(record: QuoteRecord): QuoteIssue[] {
  const state = db.read()
  return record.lines.flatMap((line): QuoteIssue[] => {
    const found = findEdition(state, line.nftId, line.editionId)
    if (!found) return [{ nftId: line.nftId, reason: 'removed' }]
    if (found.edition.available < line.quantity) {
      return [
        {
          nftId: line.nftId,
          name: found.nft.name,
          reason: 'unavailable',
          available: found.edition.available,
        },
      ]
    }
    if (!new Big(found.edition.priceEth).eq(line.unitPriceEth)) {
      return [
        {
          nftId: line.nftId,
          name: found.nft.name,
          reason: 'price_changed',
          priceEth: found.edition.priceEth,
        },
      ]
    }
    return []
  })
}

/** Mutates the catalog after a quote, like another buyer or the creator would. */
function scheduleCatalogChange(record: QuoteRecord) {
  const first = record.lines[0]
  if (!first) return
  const priceChange = scenario.takeOnce('price-change', 'bump-after-quote')
  const soldOut = scenario.takeOnce('sold-out', 'sell-out-after-quote')
  if (!priceChange && !soldOut) return

  setTimeout(() => {
    const nft = db.write((state) => {
      const target = state.nfts.find((item) => item.id === first.nftId)
      const edition = target?.editions.find((item) => item.id === first.editionId)
      if (!target || !edition) return null
      if (priceChange) {
        edition.priceEth = new Big(edition.priceEth)
          .times('1.15')
          .round(4, Big.roundHalfUp)
          .toFixed()
        if (target.editions.indexOf(edition) === 2) target.priceEth = edition.priceEth
      } else {
        edition.available = 0
      }
      target.version += 1
      return structuredClone(target)
    })
    if (nft) publishNftUpdated(nft)
  }, 1200)
}

/** Settles pending orders whose time has come. Safe to call often; it is idempotent. */
export function settleDueOrders() {
  const due = Object.values(db.read().orders).filter(
    (order) => order.status === 'pending' && new Date(order.resolvesAt).getTime() <= Date.now(),
  )
  for (const pending of due) {
    const changedNfts = new Set<string>()
    const settled = db.write((state) => {
      const order = state.orders[pending.id]!
      const now = new Date().toISOString()
      order.updatedAt = now
      order.version += 1

      const outOfStock = order.items.some((item) => {
        const found = findEdition(state, item.nftId, item.editionId)
        return !found || found.edition.available < item.quantity
      })

      if (order.outcome === 'declined' || outOfStock) {
        order.status = 'declined'
        order.declineReason = outOfStock
          ? 'Uma das edições esgotou antes da confirmação.'
          : 'Pagamento recusado pela carteira.'
        return structuredClone(order)
      }

      order.status = 'confirmed'
      order.transactionHash = `0x${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}`
      order.explorerUrl = `https://etherscan.io/tx/${order.transactionHash}`
      for (const item of order.items) {
        const found = findEdition(state, item.nftId, item.editionId)!
        found.edition.available -= item.quantity
        found.nft.version += 1
        changedNfts.add(found.nft.id)
      }
      // Only what was bought leaves the cart; anything added meanwhile stays.
      const cart = state.carts[order.cartId]
      if (cart) {
        cart.lines = cart.lines.flatMap((line) => {
          const bought = order.items.find((item) => item.editionId === line.editionId)
          if (!bought) return [line]
          const remaining = line.quantity - bought.quantity
          return remaining > 0 ? [{ ...line, quantity: remaining }] : []
        })
        if (cart.lines.length === 0) cart.coupon = null
      }
      return structuredClone(order)
    })

    for (const nftId of changedNfts) {
      const nft = db.read().nfts.find((item) => item.id === nftId)
      if (nft) publishNftUpdated(structuredClone(nft))
    }
    publishOrderUpdated(toOrder(settled), settled.userId)
  }
}

function toOrder(record: OrderRecord): Order {
  const {
    userId: _userId,
    cartId: _cartId,
    resolvesAt: _resolvesAt,
    outcome: _outcome,
    ...order
  } = record
  return order
}

export const checkoutHandlers = [
  http.post('*/api/quote', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const userId = currentUserId(request)
    if (!userId) return unauthorized()
    const parsed = quoteRequestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success)
      return errorResponse(422, 'VALIDATION', 'Selecione uma rede.', {
        fields: { network: 'Selecione uma rede.' },
      })

    const cart = userCart(userId)
    if (!cart || cart.lines.length === 0) {
      return errorResponse(422, 'VALIDATION', 'Seu carrinho está vazio.')
    }
    const state = db.read()
    const issues = cart.lines.flatMap((line) => {
      const found = findEdition(state, line.nftId, line.editionId)
      if (!found) return [{ nftId: line.nftId, reason: 'removed' }]
      if (line.quantity > maxQuantityFor(found.edition.available)) {
        return [
          {
            nftId: line.nftId,
            name: found.nft.name,
            reason: 'unavailable',
            available: found.edition.available,
          },
        ]
      }
      return []
    })
    if (issues.length > 0) {
      return errorResponse(409, 'CONFLICT', 'Alguns itens não estão mais disponíveis.', {
        details: { reason: 'cart_unavailable', issues },
      })
    }

    const record: QuoteRecord = {
      id: createId('quote'),
      userId,
      cartId: cart.id,
      network: parsed.data.network,
      lines: cart.lines.map((line) => ({
        nftId: line.nftId,
        editionId: line.editionId,
        quantity: line.quantity,
        unitPriceEth: findEdition(state, line.nftId, line.editionId)!.edition.priceEth,
      })),
      coupon: cart.coupon,
      expiresAt: new Date(Date.now() + QUOTE_TTL_MS).toISOString(),
    }
    db.write((draft) => {
      draft.quotes[record.id] = record
    })
    scheduleCatalogChange(record)
    return HttpResponse.json(toQuote(record), { status: 201 })
  }),

  http.post('*/api/orders', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const userId = currentUserId(request)
    if (!userId) return unauthorized()

    const key = request.headers.get('Idempotency-Key')
    if (!key) return errorResponse(422, 'VALIDATION', 'O cabeçalho Idempotency-Key é obrigatório.')
    const body: unknown = await request.json().catch(() => null)
    const fingerprint = JSON.stringify(body)

    // Same key + same body returns the original order; same key + different body is a conflict.
    const previous = db.read().idempotency[`${userId}:${key}`]
    if (previous) {
      if (previous.fingerprint !== fingerprint) {
        return errorResponse(
          409,
          'CONFLICT',
          'Esta chave de idempotência já foi usada com outro pedido.',
          { details: { reason: 'idempotency_mismatch' } },
        )
      }
      settleDueOrders()
      return HttpResponse.json(toOrder(db.read().orders[previous.orderId]!))
    }

    const parsed = orderRequestSchema.safeParse(body)
    if (!parsed.success) return errorResponse(422, 'VALIDATION', 'Dados do pedido inválidos.')
    const quote = db.read().quotes[parsed.data.quoteId]
    if (!quote || quote.userId !== userId)
      return errorResponse(404, 'NOT_FOUND', 'Cotação não encontrada.')
    if (new Date(quote.expiresAt).getTime() < Date.now()) {
      return errorResponse(409, 'CONFLICT', 'A cotação expirou. Revise o pedido novamente.', {
        details: { reason: 'quote_expired' },
      })
    }
    const issues = quoteIssues(quote)
    if (issues.length > 0) {
      return errorResponse(409, 'CONFLICT', 'Preço ou disponibilidade mudaram. Revise o pedido.', {
        details: { reason: 'quote_outdated', issues },
      })
    }
    if (!(db.read().connectedWallets[userId] ?? []).includes(parsed.data.wallet.provider)) {
      return errorResponse(403, 'FORBIDDEN', 'Conecte a carteira antes de confirmar.')
    }

    const now = new Date()
    const quoteView = toQuote(quote)
    const order: OrderRecord = {
      id: createId('order'),
      status: 'pending',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      items: quoteView.items,
      summary: quoteView.summary,
      coupon: quote.coupon,
      network: quote.network,
      wallet: parsed.data.wallet,
      transactionHash: null,
      explorerUrl: null,
      declineReason: null,
      version: 1,
      userId,
      cartId: quote.cartId,
      resolvesAt: new Date(now.getTime() + SETTLEMENT_MS).toISOString(),
      outcome: scenario.get() === 'payment-declined' ? 'declined' : 'confirmed',
    }
    db.write((state) => {
      state.orders[order.id] = order
      state.idempotency[`${userId}:${key}`] = { orderId: order.id, fingerprint }
      delete state.quotes[quote.id]
    })
    setTimeout(settleDueOrders, SETTLEMENT_MS + 50)

    // The order exists, but this response is lost: the client must retry with the same key.
    if (scenario.takeOnce('order-timeout', 'drop-first-order-response')) {
      await delay(TIMEOUT_DELAY_MS)
    }
    return HttpResponse.json(toOrder(order), { status: 201 })
  }),

  http.get('*/api/orders/:orderId', async ({ request, params }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const userId = currentUserId(request)
    if (!userId) return unauthorized()
    settleDueOrders()
    const order = db.read().orders[String(params.orderId)]
    // Another user's order answers 404 so ids cannot be probed.
    if (!order || order.userId !== userId)
      return errorResponse(404, 'NOT_FOUND', 'Pedido não encontrado.')
    return HttpResponse.json(toOrder(order))
  }),

  http.post('*/api/wallet-connections', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const userId = currentUserId(request)
    if (!userId) return unauthorized()
    const parsed = connectSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return errorResponse(422, 'VALIDATION', 'Carteira inválida.')
    await delay(600)
    if (scenario.get() === 'wallet-rejected') {
      return errorResponse(403, 'FORBIDDEN', 'A conexão foi recusada na carteira.')
    }
    db.write((state) => {
      const current = new Set(state.connectedWallets[userId] ?? [])
      current.add(parsed.data.provider)
      state.connectedWallets[userId] = [...current]
    })
    return HttpResponse.json({ connected: db.read().connectedWallets[userId] })
  }),

  http.delete('*/api/wallet-connections/:provider', async ({ request, params }) => {
    const userId = currentUserId(request)
    if (!userId) return unauthorized()
    db.write((state) => {
      state.connectedWallets[userId] = (state.connectedWallets[userId] ?? []).filter(
        (p) => p !== params.provider,
      )
    })
    return HttpResponse.json({ connected: db.read().connectedWallets[userId] })
  }),

  http.get('*/api/wallet-connections', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const userId = currentUserId(request)
    if (!userId) return unauthorized()
    return HttpResponse.json({ connected: db.read().connectedWallets[userId] ?? [] })
  }),
]
