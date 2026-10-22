import { Link } from '@tanstack/react-router'
import { ShoppingCart, User } from 'lucide-react'

const navItems = [
  { to: '/', label: 'Início' },
  { to: '/cart', label: 'Carrinho' },
  { to: '/profile', label: 'Perfil' },
  { to: '/wallets', label: 'Carteiras' },
] as const

export function SiteHeader() {
  return (
    <header className="border-border border-b">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-6 px-4 md:px-[120px]">
        <Link to="/" className="text-foreground text-lg font-bold tracking-[0.2em] uppercase">
          Kurio
        </Link>
        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-8">
            {navItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="text-sand hover:text-foreground py-5 text-sm"
                  activeProps={{ className: 'border-b-2 border-brand text-brand' }}
                  activeOptions={{ exact: true }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/cart" aria-label="Carrinho" className="hover:bg-secondary rounded-md p-2">
            <ShoppingCart className="size-5" aria-hidden />
          </Link>
          <Link to="/login" aria-label="Entrar" className="hover:bg-secondary rounded-md p-2">
            <User className="size-5" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  )
}
