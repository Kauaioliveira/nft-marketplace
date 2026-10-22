import { queryOptions } from '@tanstack/react-query'
import { z } from 'zod'
import {
  orderSchema,
  quoteSchema,
  walletProviderSchema,
  walletSchema,
  type Network,
  type WalletProvider,
} from './contracts'
import { parseResponse } from './errors'
import { http } from './http'

export const checkoutKeys = {
  order: (userId: string, orderId: string) => ['orders', userId, orderId] as const,
  wallets: (userId: string) => ['wallets', userId] as const,
  connections: (userId: string) => ['wallet-connections', userId] as const,
}

export async function requestQuote(network: Network) {
  const { data } = await http.post('/quote', { network })
  return parseResponse(quoteSchema, data)
}

export type OrderInput = {
  quoteId: string
  wallet: { provider: WalletProvider; address: string }
  buyer: { name: string; email: string }
}

/** The same key must be sent again on retries so the API returns the same order. */
export async function createOrder(input: OrderInput, idempotencyKey: string) {
  const { data } = await http.post('/orders', input, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return parseResponse(orderSchema, data)
}

export function orderQuery(userId: string, orderId: string) {
  return queryOptions({
    queryKey: checkoutKeys.order(userId, orderId),
    queryFn: async ({ signal }) => {
      const { data } = await http.get(`/orders/${encodeURIComponent(orderId)}`, { signal })
      return parseResponse(orderSchema, data)
    },
  })
}

const walletListSchema = z.object({ wallets: z.array(walletSchema) })

export function walletsQuery(userId: string) {
  return queryOptions({
    queryKey: checkoutKeys.wallets(userId),
    queryFn: async ({ signal }) => {
      const { data } = await http.get('/wallets', { signal })
      return parseResponse(walletListSchema, data).wallets
    },
  })
}

const connectionsSchema = z.object({ connected: z.array(walletProviderSchema) })

export function walletConnectionsQuery(userId: string) {
  return queryOptions({
    queryKey: checkoutKeys.connections(userId),
    queryFn: async ({ signal }) => {
      const { data } = await http.get('/wallet-connections', { signal })
      return parseResponse(connectionsSchema, data).connected
    },
  })
}

export async function connectWallet(provider: WalletProvider) {
  const { data } = await http.post('/wallet-connections', { provider })
  return parseResponse(connectionsSchema, data).connected
}

export async function disconnectWallet(provider: WalletProvider) {
  const { data } = await http.delete(`/wallet-connections/${provider}`)
  return parseResponse(connectionsSchema, data).connected
}
