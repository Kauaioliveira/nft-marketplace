import { createContext, useContext } from 'react'

export type Announce = (message: string) => void

export const AnnouncerContext = createContext<Announce>(() => {})

export function useAnnounce() {
  return useContext(AnnouncerContext)
}
