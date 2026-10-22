import { Link } from '@tanstack/react-router'
import { Heart, Home, ShoppingCart, User } from 'lucide-react'
import { useSession } from '@/features/session/use-session'

const itemClass = 'flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] text-sand'
const activeClass = 'text-brand'

/** Bottom navigation from the mobile frames. Hidden from tablet width up. */
export function MobileNav() {
  const { user } = useSession()
  return (
    <nav
      aria-label="Navegação rápida"
      className="bg-surface-card fixed inset-x-0 bottom-0 z-30 rounded-t-3xl pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex items-center justify-around">
        <li>
          <Link
            to="/"
            className={itemClass}
            activeOptions={{ exact: true, includeSearch: false }}
            activeProps={{ className: activeClass }}
          >
            <Home className="size-6" aria-hidden />
            Início
          </Link>
        </li>
        <li>
          <Link to="/" search={{ tab: 'trending' }} hash="catalogo" className={itemClass}>
            <Heart className="size-6" aria-hidden />
            Em alta
          </Link>
        </li>
        <li>
          <Link to="/cart" className={itemClass} activeProps={{ className: activeClass }}>
            <ShoppingCart className="size-6" aria-hidden />
            Carrinho
          </Link>
        </li>
        <li>
          <Link
            to={user ? '/profile' : '/login'}
            className={itemClass}
            activeProps={{ className: activeClass }}
          >
            <User className="size-6" aria-hidden />
            {user ? 'Perfil' : 'Entrar'}
          </Link>
        </li>
      </ul>
    </nav>
  )
}
