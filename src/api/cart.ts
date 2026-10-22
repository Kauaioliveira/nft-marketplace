import { queryOptions } from '@tanstack/react-query'
import { cartSchema } from './contracts'
import { parseResponse } from './errors'
import { http } from './http'
import { visitorCart } from './visitor-cart'

export const cartKeys = {
  /** Visitors and each user get their own cache entry. */
  current: (owner: string) => ['cart', owner] as const,
}

export function cartQuery(owner: string) {
  return queryOptions({
    queryKey: cartKeys.current(owner),
    queryFn: async ({ signal }) => {
      const { data } = await http.get('/cart', { signal })
      const cart = parseResponse(cartSchema, data)
      if (owner === 'visitor') visitorCart.set(cart.id)
      return cart
    },
  })
}

export async function addToCart(input: { nftId: string; editionId: string; quantity: number }) {
  const { data } = await http.post('/cart/items', input)
  return parseResponse(cartSchema, data)
}

export async function updateCartItem(lineId: string, quantity: number) {
  const { data } = await http.patch(`/cart/items/${lineId}`, { quantity })
  return parseResponse(cartSchema, data)
}

export async function removeCartItem(lineId: string) {
  const { data } = await http.delete(`/cart/items/${lineId}`)
  return parseResponse(cartSchema, data)
}

export async function applyCoupon(code: string) {
  const { data } = await http.post('/cart/coupon', { code })
  return parseResponse(cartSchema, data)
}

export async function removeCoupon() {
  const { data } = await http.delete('/cart/coupon')
  return parseResponse(cartSchema, data)
}

export async function mergeVisitorCart(visitorCartId: string) {
  const { data } = await http.post('/cart/merge', { visitorCartId })
  return parseResponse(cartSchema, data)
}
