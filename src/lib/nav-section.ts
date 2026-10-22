import { useRouterState } from '@tanstack/react-router'

export type NavSection = 'home' | 'market' | 'cart' | 'account' | null

/**
 * Which navigation item a path belongs to. As in the Figma frames, the NFT detail, cart,
 * payment and order screens are part of "Mercado".
 */
export function navSectionOf(pathname: string): { header: NavSection; mobile: NavSection } {
  if (pathname === '/') return { header: 'home', mobile: 'home' }
  if (pathname.startsWith('/nfts/')) return { header: 'market', mobile: 'home' }
  if (pathname === '/cart' || pathname === '/checkout' || pathname.startsWith('/orders/')) {
    return { header: 'market', mobile: 'cart' }
  }
  if (pathname === '/profile' || pathname === '/wallets') return { header: null, mobile: 'account' }
  return { header: null, mobile: null }
}

export function useNavSection() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  return navSectionOf(pathname)
}
