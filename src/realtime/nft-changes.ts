import { useEffect, useRef } from 'react'
import type { Nft } from '@/api/contracts'

type Listener = (nft: Nft) => void
const listeners = new Set<Listener>()

/** Fan-out of accepted `nft.updated` events for screens that hold a frozen copy (the checkout quote). */
export function notifyNftChanged(nft: Nft) {
  listeners.forEach((listener) => listener(nft))
}

export function useNftChanges(listener: Listener) {
  const latest = useRef(listener)
  useEffect(() => {
    latest.current = listener
  })
  useEffect(() => {
    const handle: Listener = (nft) => latest.current(nft)
    listeners.add(handle)
    return () => {
      listeners.delete(handle)
    }
  }, [])
}
