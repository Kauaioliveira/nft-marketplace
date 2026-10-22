import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import type { Nft, Order, RealtimeEvent } from '@/api/contracts'
import { SOCKET_URL } from '@/realtime/config'
import { db } from './db'

type SocketIoServer = ReturnType<typeof toSocketIo>

// MSW intercepts WebSocket only, so the client must use the `websocket` transport (no polling).
// MSW strips the `/socket.io/` path before matching, so the link is the bare server address.
const socketLink = ws.link(SOCKET_URL)

/** Each connection may be bound to a user after it sends `session.join` with its token. */
const connections = new Map<SocketIoServer, { userId: string | null }>()

// The binding answers the Engine.IO handshake but does not send heartbeats.
// Socket.IO clients drop the connection after pingInterval + pingTimeout without a ping.
const PING_INTERVAL_MS = 20_000

/** Kept so the demo panel and the tests can replay an event (duplicate delivery). */
let lastEvent: RealtimeEvent | null = null

export const realtimeHandlers = [
  socketLink.addEventListener('connection', (connection) => {
    const io = toSocketIo(connection)
    connections.set(io, { userId: null })

    io.client.on('session.join', (_event, token: unknown) => {
      const session = typeof token === 'string' ? db.read().sessions[token] : undefined
      connections.set(io, { userId: session?.userId ?? null })
    })
    io.client.on('session.leave', () => connections.set(io, { userId: null }))

    const ping = setInterval(() => connection.client.send('2'), PING_INTERVAL_MS)
    connection.client.addEventListener('close', () => {
      clearInterval(ping)
      connections.delete(io)
    })
  }),
]

function deliver(event: RealtimeEvent) {
  lastEvent = event
  connections.forEach((meta, io) => {
    // Private events only reach connections bound to their owner.
    if (event.userId && meta.userId !== event.userId) return
    io.client.emit(event.type, event)
  })
}

export function publishNftUpdated(nft: Nft, version = nft.version) {
  deliver({
    eventId: crypto.randomUUID(),
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version,
    occurredAt: new Date().toISOString(),
    payload: nft,
  })
}

export function publishOrderUpdated(order: Order, userId: string) {
  deliver({
    eventId: crypto.randomUUID(),
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: new Date().toISOString(),
    userId,
    payload: order,
  })
}

/** Sends the last event again with the same eventId, like an at-least-once broker would. */
export function replayLastEvent() {
  if (lastEvent) deliver(lastEvent)
  return lastEvent
}

/** Forces every socket to drop, as if the network went away. Clients reconnect on their own. */
export function dropConnections() {
  connections.forEach((_meta, io) => io.rawClient.close())
}
