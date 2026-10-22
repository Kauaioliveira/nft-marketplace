import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { cartKeys } from '@/api/cart'
import { checkoutKeys } from '@/api/checkout'
import {
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
  type Cart,
  type Nft,
  type NftList,
  type Order,
} from '@/api/contracts'
import { nftKeys } from '@/api/nfts'
import { useAnnounce } from '@/components/live-announcer-context'
import { useSession } from '@/features/session/use-session'
import { formatEth } from '@/lib/money'
import { mocksReady } from '@/api/mocks-ready'
import { createEventGuard } from './event-guard'
import { notifyNftChanged } from './nft-changes'

/** Writes the event payload only if it is newer than what the cache holds. */
function applyNft(queryClient: QueryClient, nft: Nft) {
  queryClient.setQueryData<Nft>(nftKeys.detail(nft.id), (current) =>
    !current || current.version < nft.version ? nft : current,
  )
  queryClient.setQueriesData<NftList>(
    { queryKey: nftKeys.lists() },
    (list) =>
      list && {
        ...list,
        items: list.items.map((item) =>
          item.id === nft.id && item.version < nft.version ? nft : item,
        ),
      },
  )
}

function cartContains(queryClient: QueryClient, nftId: string) {
  return queryClient
    .getQueriesData<Cart>({ queryKey: ['cart'] })
    .flatMap(([, cart]) => cart?.items ?? [])
    .find((item) => item.nftId === nftId)
}

/**
 * Owns the Socket.IO connection for the current session. Events update the Query cache; after a
 * reconnection the active queries are refetched so anything missed is reconciled through REST.
 * A new session gets a new socket, so listeners from the previous user never survive a logout.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const announce = useAnnounce()
  const { session } = useSession()
  const token = session?.token ?? null
  const userId = session?.user.id ?? null

  useEffect(() => {
    let disposed = false
    let cleanup = () => {}

    // socket.io-client is loaded only after the mock worker is up: engine.io-client keeps a
    // reference to the global WebSocket when its module is evaluated, and MSW patches it on start.
    void mocksReady
      .then(() => import('./socket'))
      .then(({ createSocket }) => {
        if (disposed) return
        const socket = createSocket()
        const guard = createEventGuard()
        let hasConnectedBefore = false

        socket.on('connect', () => {
          if (token) socket.emit('session.join', token)
          if (hasConnectedBefore) {
            void queryClient.invalidateQueries({ refetchType: 'active' })
          }
          hasConnectedBefore = true
        })

        socket.on('nft.updated', (raw: unknown) => {
          const parsed = nftUpdatedEventSchema.safeParse(raw)
          if (!parsed.success || !guard.accept(parsed.data)) return
          const nft = parsed.data.payload
          const inCart = cartContains(queryClient, nft.id)
          applyNft(queryClient, nft)
          notifyNftChanged(nft)
          if (inCart) {
            // Cart totals come from the API, so the cart is refetched instead of patched locally.
            void queryClient.invalidateQueries({ queryKey: ['cart'] })
            const edition = nft.editions.find((item) => item.id === inCart.editionId)
            announce(
              edition && edition.available < inCart.quantity
                ? `${nft.name} (${inCart.editionLabel}) ficou indisponível na quantidade do seu carrinho.`
                : `O preço de ${nft.name} no seu carrinho mudou para ${formatEth(edition?.priceEth ?? nft.priceEth)}.`,
            )
          } else {
            announce(`${nft.name} foi atualizado.`)
          }
        })

        socket.on('order.updated', (raw: unknown) => {
          const parsed = orderUpdatedEventSchema.safeParse(raw)
          // Events of another session are ignored even if one reaches this socket.
          if (!parsed.success || !userId || parsed.data.userId !== userId) return
          if (!guard.accept(parsed.data)) return
          const order = parsed.data.payload
          queryClient.setQueryData<Order>(checkoutKeys.order(userId, order.id), (current) =>
            !current || current.version < order.version ? order : current,
          )
          if (order.status !== 'pending') {
            void queryClient.invalidateQueries({ queryKey: cartKeys.current(userId) })
            announce(order.status === 'confirmed' ? 'Pagamento confirmado.' : 'Pagamento recusado.')
          }
        })

        socket.connect()
        cleanup = () => {
          socket.removeAllListeners()
          socket.disconnect()
        }
      })

    return () => {
      disposed = true
      cleanup()
    }
  }, [queryClient, announce, token, userId])

  return children
}
