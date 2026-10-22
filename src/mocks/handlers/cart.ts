import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { createId, db, type CartRecord } from '../db'
import { buildCart, currentUserId, findEdition, maxQuantityFor, unauthorized } from '../domain'
import { errorResponse, simulateNetwork } from '../network'

const VISITOR_HEADER = 'X-Cart-Id'

const addSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  quantity: z.number().int().positive(),
})
const quantitySchema = z.object({ quantity: z.number().int().positive() })
const couponSchema = z.object({ code: z.string().trim().min(1) })
const mergeSchema = z.object({ visitorCartId: z.string() })

/** The user's cart when authenticated; otherwise the visitor cart named by the header. */
function resolveCart(request: Request, createIfMissing: boolean): CartRecord | null {
  const userId = currentUserId(request)
  const state = db.read()
  if (userId) {
    const existing = Object.values(state.carts).find((cart) => cart.userId === userId)
    if (existing || !createIfMissing) return existing ?? null
    return db.write((draft) => {
      const cart: CartRecord = { id: createId('cart'), userId, lines: [], coupon: null }
      draft.carts[cart.id] = cart
      return cart
    })
  }
  // A token that no longer maps to a session must not silently fall back to a visitor cart.
  if (request.headers.get('Authorization')) return null
  const visitorId = request.headers.get(VISITOR_HEADER)
  const visitorCart = visitorId ? state.carts[visitorId] : undefined
  if (visitorCart && visitorCart.userId === null) return visitorCart
  if (!createIfMissing) return null
  return db.write((draft) => {
    const cart: CartRecord = { id: createId('cart'), userId: null, lines: [], coupon: null }
    draft.carts[cart.id] = cart
    return cart
  })
}

function stockConflict(available: number) {
  const max = maxQuantityFor(available)
  return errorResponse(
    409,
    'CONFLICT',
    max === 0
      ? 'Esta edição está esgotada.'
      : `Quantidade indisponível. Você pode levar no máximo ${max}.`,
    { details: { reason: 'insufficient_stock', available: max } },
  )
}

export const cartHandlers = [
  http.get('*/api/cart', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const cart = resolveCart(request, true)
    if (!cart) return unauthorized()
    return HttpResponse.json(buildCart(cart))
  }),

  http.post('*/api/cart/items', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const parsed = addSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return errorResponse(422, 'VALIDATION', 'Item inválido.')
    const cart = resolveCart(request, true)
    if (!cart) return unauthorized()

    const { nftId, editionId, quantity } = parsed.data
    const found = findEdition(db.read(), nftId, editionId)
    if (!found) return errorResponse(404, 'NOT_FOUND', 'NFT ou edição não encontrado.')
    const existing = cart.lines.find((line) => line.editionId === editionId)
    const nextQuantity = (existing?.quantity ?? 0) + quantity
    if (nextQuantity > maxQuantityFor(found.edition.available)) {
      return stockConflict(found.edition.available)
    }

    db.write((state) => {
      const draft = state.carts[cart.id]!
      const line = draft.lines.find((item) => item.editionId === editionId)
      if (line) line.quantity = nextQuantity
      else draft.lines.push({ id: createId('line'), nftId, editionId, quantity })
    })
    return HttpResponse.json(buildCart(db.read().carts[cart.id]!), { status: 201 })
  }),

  http.patch('*/api/cart/items/:lineId', async ({ request, params }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const parsed = quantitySchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return errorResponse(422, 'VALIDATION', 'Quantidade inválida.')
    const cart = resolveCart(request, false)
    if (!cart) return unauthorized()
    const line = cart.lines.find((item) => item.id === params.lineId)
    if (!line) return errorResponse(404, 'NOT_FOUND', 'Item não está no carrinho.')
    const found = findEdition(db.read(), line.nftId, line.editionId)
    if (!found) return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
    if (parsed.data.quantity > maxQuantityFor(found.edition.available)) {
      return stockConflict(found.edition.available)
    }
    db.write((state) => {
      state.carts[cart.id]!.lines.find((item) => item.id === line.id)!.quantity =
        parsed.data.quantity
    })
    return HttpResponse.json(buildCart(db.read().carts[cart.id]!))
  }),

  http.delete('*/api/cart/items/:lineId', async ({ request, params }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const cart = resolveCart(request, false)
    if (!cart) return unauthorized()
    db.write((state) => {
      const draft = state.carts[cart.id]!
      draft.lines = draft.lines.filter((line) => line.id !== params.lineId)
    })
    return HttpResponse.json(buildCart(db.read().carts[cart.id]!))
  }),

  http.post('*/api/cart/coupon', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const parsed = couponSchema.safeParse(await request.json().catch(() => null))
    const cart = resolveCart(request, true)
    if (!cart) return unauthorized()
    const code = parsed.success ? parsed.data.code.toUpperCase() : ''
    const coupon = db.read().coupons.find((item) => item.code === code)
    if (!coupon) {
      return errorResponse(422, 'VALIDATION', 'Cupom inválido.', {
        fields: { code: 'Cupom inválido.' },
      })
    }
    if (new Date(coupon.expiresAt).getTime() < Date.now()) {
      return errorResponse(422, 'VALIDATION', 'Este cupom expirou.', {
        fields: { code: 'Este cupom expirou.' },
      })
    }
    db.write((state) => {
      state.carts[cart.id]!.coupon = { code: coupon.code, percentOff: coupon.percentOff }
    })
    return HttpResponse.json(buildCart(db.read().carts[cart.id]!))
  }),

  http.delete('*/api/cart/coupon', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const cart = resolveCart(request, false)
    if (!cart) return unauthorized()
    db.write((state) => {
      state.carts[cart.id]!.coupon = null
    })
    return HttpResponse.json(buildCart(db.read().carts[cart.id]!))
  }),

  // Called right after login: visitor items move into the user's cart, capped by stock.
  http.post('*/api/cart/merge', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const userId = currentUserId(request)
    if (!userId) return unauthorized()
    const parsed = mergeSchema.safeParse(await request.json().catch(() => null))
    const userCart = resolveCart(request, true)!
    const visitor = parsed.success ? db.read().carts[parsed.data.visitorCartId] : undefined

    if (visitor && visitor.userId === null) {
      db.write((state) => {
        const target = state.carts[userCart.id]!
        for (const line of visitor.lines) {
          const found = findEdition(state, line.nftId, line.editionId)
          if (!found) continue
          const max = maxQuantityFor(found.edition.available)
          const existing = target.lines.find((item) => item.editionId === line.editionId)
          if (existing) existing.quantity = Math.min(max, existing.quantity + line.quantity)
          else if (max > 0) target.lines.push({ ...line, quantity: Math.min(max, line.quantity) })
        }
        target.coupon = target.coupon ?? visitor.coupon
        delete state.carts[visitor.id]
      })
    }
    return HttpResponse.json(buildCart(db.read().carts[userCart.id]!))
  }),
]
