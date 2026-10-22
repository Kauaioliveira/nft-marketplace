import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import type { Nft, RealtimeEvent } from '@/api/contracts'
import { SOCKET_URL } from '@/realtime/config'

type SocketIoServer = ReturnType<typeof toSocketIo>

// MSW intercepts WebSocket only, so the client must use the `websocket` transport (no polling).
// MSW strips the `/socket.io/` path before matching, so the link is the bare server address.
const socketLink = ws.link(SOCKET_URL)

const connections = new Set<SocketIoServer>()

// The binding answers the Engine.IO handshake but does not send heartbeats.
// Socket.IO clients drop the connection after pingInterval + pingTimeout without a ping.
const PING_INTERVAL_MS = 20_000

export const realtimeHandlers = [
  socketLink.addEventListener('connection', (connection) => {
    const io = toSocketIo(connection)
    connections.add(io)

    const ping = setInterval(() => connection.client.send('2'), PING_INTERVAL_MS)
    connection.client.addEventListener('close', () => {
      clearInterval(ping)
      connections.delete(io)
    })
  }),
]

function broadcast(event: RealtimeEvent) {
  connections.forEach((io) => io.client.emit(event.type, event))
}

export function publishNftUpdated(nft: Nft) {
  broadcast({
    eventId: crypto.randomUUID(),
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: new Date().toISOString(),
    payload: nft,
  })
}
