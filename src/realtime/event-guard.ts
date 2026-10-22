import type { RealtimeEvent } from '@/api/contracts'

const MAX_TRACKED_EVENTS = 500

/**
 * Drops duplicated and stale events: an event is applied only once and only if its version is
 * newer than the last one seen for the same resource.
 */
export function createEventGuard() {
  const seenEventIds = new Set<string>()
  const versions = new Map<string, number>()

  return {
    accept(event: RealtimeEvent) {
      if (seenEventIds.has(event.eventId)) return false
      const key = `${event.resource.type}:${event.resource.id}`
      const known = versions.get(key) ?? 0
      if (event.version <= known) return false

      seenEventIds.add(event.eventId)
      if (seenEventIds.size > MAX_TRACKED_EVENTS) {
        const oldest = seenEventIds.values().next().value
        if (oldest) seenEventIds.delete(oldest)
      }
      versions.set(key, event.version)
      return true
    },
    /** Lets a fresh REST response raise the floor so older events are ignored. */
    observe(resourceType: string, id: string, version: number) {
      const key = `${resourceType}:${id}`
      versions.set(key, Math.max(versions.get(key) ?? 0, version))
    },
    reset() {
      seenEventIds.clear()
      versions.clear()
    },
  }
}

export type EventGuard = ReturnType<typeof createEventGuard>
