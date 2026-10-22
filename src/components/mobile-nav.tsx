import { useRouterState } from '@tanstack/react-router'
import { Heart, Home, ShoppingCart, User } from 'lucide-react'
import { useSession } from '@/features/session/use-session'
import { navSectionOf } from '@/lib/nav-section'
import { cn } from '@/lib/utils'
import { NavLink } from './nav-link'

const itemClass = 'flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] text-sand'
const activeClass = 'text-brand'

/** Bottom navigation from the mobile frames. Hidden from tablet width up. */
export function MobileNav() {
  const { user } = useSession()
  const location = useRouterState({ select: (state) => state.location })
  const trending = location.pathname === '/' && location.searchStr.includes('tab=trending')
  const section = trending ? 'trending' : navSectionOf(location.pathname).mobile
  const accountActive =
    section === 'account' || location.pathname === '/login' || location.pathname === '/register'

  const item = (active: boolean) => ({ active, className: cn(itemClass, active && activeClass) })

  return (
    <nav
      aria-label="Navegação rápida"
      className="bg-surface-card fixed inset-x-0 bottom-0 z-30 rounded-t-3xl pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex items-center justify-around">
        <li>
          <NavLink href="/" {...item(section === 'home')}>
            <Home className="size-6" aria-hidden />
            Início
          </NavLink>
        </li>
        <li>
          <NavLink href="/?tab=trending#catalogo" {...item(section === 'trending')}>
            <Heart className="size-6" aria-hidden />
            Em alta
          </NavLink>
        </li>
        <li>
          <NavLink href="/cart" {...item(section === 'cart')}>
            <ShoppingCart className="size-6" aria-hidden />
            Carrinho
          </NavLink>
        </li>
        <li>
          <NavLink href={user ? '/profile' : '/login'} {...item(accountActive)}>
            <User className="size-6" aria-hidden />
            {user ? 'Perfil' : 'Entrar'}
          </NavLink>
        </li>
      </ul>
    </nav>
  )
}
