import { Link, useNavigate } from '@tanstack/react-router'
import { LogIn, Search, ShoppingCart } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useCart } from '@/features/cart/use-cart'
import { useAuthActions } from '@/features/session/use-auth-actions'
import { useSession } from '@/features/session/use-session'
import { cn } from '@/lib/utils'

const navLinkClass =
  'relative py-5 text-[15px] text-foreground hover:text-brand focus-visible:outline-2 focus-visible:outline-amber'
const activeNavClass =
  'text-brand after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-brand'

/** Sections that exist in the layout but are outside this delivery. */
function comingSoon(section: string) {
  toast.info(`${section} chega em breve.`)
}

export function SiteHeader() {
  const { data: cart } = useCart()
  const count = cart?.itemCount ?? 0

  return (
    <header className="mx-auto w-full max-w-[1440px] px-4 md:px-10 xl:px-[120px]">
      <div className="border-border flex h-[68px] items-center justify-between gap-6 border-b">
        <Link to="/" className="text-[15px] font-bold tracking-[0.06em] uppercase">
          Kurio
        </Link>

        <nav aria-label="Principal" className="hidden md:block">
          <ul className="flex items-center gap-6 lg:gap-10">
            <li>
              <Link
                to="/"
                className={navLinkClass}
                activeOptions={{ exact: true, includeSearch: false }}
                activeProps={{ className: activeNavClass }}
              >
                Início
              </Link>
            </li>
            <li>
              <Link to="/" hash="catalogo" className={navLinkClass}>
                Mercado
              </Link>
            </li>
            <li>
              <button
                type="button"
                className={navLinkClass}
                onClick={() => comingSoon('A área de criadores')}
              >
                Criadores
              </button>
            </li>
            <li>
              <button
                type="button"
                className={navLinkClass}
                onClick={() => comingSoon('A área Aprenda')}
              >
                Aprenda
              </button>
            </li>
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/"
            hash="catalogo"
            aria-label="Buscar NFTs"
            className="hover:bg-secondary hidden rounded-md p-2 md:block"
          >
            <Search className="size-6" aria-hidden />
          </Link>
          <Link
            to="/cart"
            aria-label={`Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`}
            className="hover:bg-secondary relative rounded-md p-2"
          >
            <ShoppingCart className="size-6" aria-hidden />
            {count > 0 && (
              <span
                aria-hidden
                data-testid="cart-count"
                className="bg-brand text-ink absolute top-0.5 right-0 grid min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold"
              >
                {count}
              </span>
            )}
          </Link>
          <AccountButton />
        </div>
      </div>
    </header>
  )
}

function AccountButton() {
  const { user } = useSession()
  const { endSession } = useAuthActions()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return
      if (event instanceof MouseEvent && containerRef.current?.contains(event.target as Node))
        return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  if (!user) {
    return (
      <Link
        to="/login"
        className="bg-brand text-ink hover:bg-brand-light flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[17px]"
      >
        <LogIn className="size-5" aria-hidden />
        Entrar
      </Link>
    )
  }

  const initials = user.name.slice(0, 1).toUpperCase()
  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={() => setOpen((value) => !value)}
        className="bg-brand text-ink hover:bg-brand-light flex items-center gap-2 rounded-md px-3 py-1.5"
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt=""
            width={24}
            height={24}
            className="size-6 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="bg-ink text-brand grid size-6 place-items-center rounded-full text-xs"
          >
            {initials}
          </span>
        )}
        <span className="hidden max-w-32 truncate sm:inline">{user.name}</span>
        <span className="sr-only sm:hidden">Conta de {user.name}</span>
      </button>
      {open && (
        <ul
          id="account-menu"
          role="menu"
          className="border-border-soft bg-surface-card absolute right-0 z-40 mt-2 w-48 rounded-md border p-1 shadow-xl"
        >
          {[
            { to: '/profile', label: 'Meu perfil' },
            { to: '/wallets', label: 'Carteiras' },
          ].map((item) => (
            <li key={item.to} role="none">
              <Link
                role="menuitem"
                to={item.to}
                onClick={() => setOpen(false)}
                className="hover:bg-surface-raised block rounded px-3 py-2"
              >
                {item.label}
              </Link>
            </li>
          ))}
          <li role="none">
            <button
              role="menuitem"
              type="button"
              className={cn('hover:bg-surface-raised w-full rounded px-3 py-2 text-left')}
              onClick={async () => {
                setOpen(false)
                await endSession()
                toast.success('Você saiu da sua conta.')
                void navigate({ to: '/' })
              }}
            >
              Sair
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
