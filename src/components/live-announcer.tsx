import { useCallback, useState, type ReactNode } from 'react'
import { AnnouncerContext, type Announce } from './live-announcer-context'

/** Single polite live region used for mutation feedback and realtime changes. */
export function LiveAnnouncerProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')

  const announce = useCallback<Announce>((next) => {
    // Clearing first makes screen readers repeat identical consecutive messages.
    setMessage('')
    requestAnimationFrame(() => setMessage(next))
  }, [])

  return (
    <AnnouncerContext.Provider value={announce}>
      {children}
      <div role="status" aria-live="polite" className="sr-only" data-testid="live-region">
        {message}
      </div>
    </AnnouncerContext.Provider>
  )
}
