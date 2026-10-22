import { Link, useNavigate } from '@tanstack/react-router'
import {
  Activity,
  Download,
  Heart,
  LifeBuoy,
  LogOut,
  MapPin,
  Tag,
  User,
  type LucideIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { useAuthActions } from '@/features/session/use-auth-actions'
import { cn } from '@/lib/utils'

const comingSoon: { label: string; icon: LucideIcon }[] = [
  { label: 'Atividade', icon: Activity },
  { label: 'Lista de interesse', icon: Heart },
  { label: 'Ofertas', icon: Tag },
  { label: 'Arquivos baixados', icon: Download },
  { label: 'Suporte', icon: LifeBuoy },
]

const itemClass =
  'flex items-center gap-3 px-4 py-2.5 text-[15px] text-brand hover:bg-surface-raised border-l-4 border-transparent'

/** "Meu perfil" sidebar from the profile and wallets frames. */
export function AccountLayout({ title, children }: { title: string; children: ReactNode }) {
  const { endSession } = useAuthActions()
  const navigate = useNavigate()

  return (
    <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-8 px-4 pt-8 md:px-10 lg:grid-cols-[310px_1fr] xl:px-[120px]">
      <nav aria-label="Meu perfil" className="bg-surface-card self-start py-3">
        <p className="px-3 pb-2 text-xl font-bold">Meu perfil</p>
        <ul className="flex flex-wrap lg:flex-col">
          <li>
            <Link
              to="/profile"
              className={itemClass}
              activeProps={{ className: 'border-brand bg-surface-raised' }}
            >
              <User className="size-4" aria-hidden />
              Dados do perfil
            </Link>
          </li>
          <li>
            <Link
              to="/wallets"
              className={itemClass}
              activeProps={{ className: 'border-brand bg-surface-raised' }}
            >
              <MapPin className="size-4" aria-hidden />
              Carteiras
            </Link>
          </li>
          {comingSoon.map(({ label, icon: Icon }) => (
            <li key={label} className="max-lg:hidden">
              <button
                type="button"
                className={cn(itemClass, 'w-full')}
                onClick={() => toast.info(`${label} chega em breve.`)}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            </li>
          ))}
          <li className="lg:border-border-soft lg:mt-2 lg:border-t">
            <button
              type="button"
              className={cn(itemClass, 'w-full font-bold')}
              onClick={async () => {
                await endSession()
                toast.success('Você saiu da sua conta.')
                void navigate({ to: '/' })
              }}
            >
              <LogOut className="size-4" aria-hidden />
              Sair
            </button>
          </li>
        </ul>
      </nav>
      <section aria-labelledby="account-title" className="min-w-0">
        <h1 id="account-title" className="mb-6 text-lg font-bold">
          {title}
        </h1>
        {children}
      </section>
    </div>
  )
}
