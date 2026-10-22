/**
 * In demo mode the Socket.IO server only exists inside MSW, so it gets its own address. Using the
 * app origin would also capture Vite's HMR socket, which lives on the same host.
 */
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'wss://realtime.kurio.test'
