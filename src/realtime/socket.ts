import { io, type Socket } from 'socket.io-client'
import { SOCKET_URL } from './config'

export function createSocket(): Socket {
  return io(SOCKET_URL, {
    // MSW can only intercept WebSocket connections, so long-polling is disabled on purpose.
    transports: ['websocket'],
    autoConnect: false,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
  })
}
