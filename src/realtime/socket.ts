import { io, type Socket } from 'socket.io-client'

export function createSocket(): Socket {
  return io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
    // MSW can only intercept WebSocket connections, so long-polling is disabled on purpose.
    transports: ['websocket'],
    autoConnect: false,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
  })
}
