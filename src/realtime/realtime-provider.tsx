import { useQueryClient } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { nftUpdatedEventSchema } from '@/api/contracts'
import { nftKeys } from '@/api/nfts'
import { useAnnounce } from '@/components/live-announcer-context'
import { createEventGuard } from './event-guard'
import { createSocket } from './socket'

/**
 * Owns the Socket.IO connection. Events update the Query cache; after a reconnection the active
 * queries are refetched so anything missed while offline is reconciled through REST.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const announce = useAnnounce()

  useEffect(() => {
    const socket = createSocket()
    const guard = createEventGuard()
    let hasConnectedBefore = false

    socket.on('connect', () => {
      if (hasConnectedBefore) {
        void queryClient.invalidateQueries({ refetchType: 'active' })
      }
      hasConnectedBefore = true
    })

    socket.on('nft.updated', (raw: unknown) => {
      const parsed = nftUpdatedEventSchema.safeParse(raw)
      if (!parsed.success || !guard.accept(parsed.data)) return
      const nft = parsed.data.payload
      queryClient.setQueryData(nftKeys.detail(nft.id), nft)
      void queryClient.invalidateQueries({ queryKey: nftKeys.lists() })
      announce(`Preço de ${nft.name} atualizado.`)
    })

    socket.connect()
    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [queryClient, announce])

  return children
}
