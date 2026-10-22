import { Link, useNavigate } from '@tanstack/react-router'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type AuthCardProps = {
  mode: 'login' | 'register'
  redirect?: string
  description: string
  children: ReactNode
}

/**
 * Card from the login/register frames. In Figma it is a modal over the home page; here it is a
 * page of its own so it has a URL that guards can redirect to and that survives a refresh.
 */
export function AuthCard({ mode, redirect, description, children }: AuthCardProps) {
  const navigate = useNavigate()
  const search = redirect ? { redirect } : {}

  return (
    <div className="mx-auto my-10 w-full max-w-[500px] px-4">
      <section
        aria-labelledby="auth-title"
        className="border-brand bg-surface-card relative border-b-[10px] pt-10 pb-12"
      >
        <button
          type="button"
          aria-label="Fechar e voltar ao início"
          onClick={() => void navigate({ to: '/' })}
          className="text-brand hover:text-brand-light absolute top-4 right-4"
        >
          <X className="size-5" aria-hidden />
        </button>
        <h1 id="auth-title" className="sr-only">
          {mode === 'login' ? 'Entrar' : 'Criar conta'}
        </h1>
        <nav
          aria-label="Acesso à conta"
          className="flex items-center justify-center gap-2 text-[22px]"
        >
          <Link
            to="/login"
            search={search}
            className={cn(mode === 'login' ? 'text-brand' : 'hover:text-brand')}
            aria-current={mode === 'login' ? 'page' : undefined}
          >
            Entrar
          </Link>
          <span aria-hidden className="bg-brand h-6 w-px" />
          <Link
            to="/register"
            search={search}
            className={cn(mode === 'register' ? 'text-brand' : 'hover:text-brand')}
            aria-current={mode === 'register' ? 'page' : undefined}
          >
            Criar conta
          </Link>
        </nav>
        <p className="mx-auto mt-8 max-w-[400px] px-6 text-center text-[13px]">{description}</p>
        <div className="mx-auto mt-6 max-w-[340px] px-4 sm:px-0">{children}</div>
        <div className="border-border-soft mt-6 border-t" />
        <p className="-mt-3 text-center">
          <span className="bg-surface-card px-3 text-[13px]">Ou continue com</span>
        </p>
        <div className="mx-auto mt-3 flex max-w-[340px] flex-col gap-3 px-4 sm:px-0">
          {['Google', 'Facebook'].map((provider) => (
            <button
              key={provider}
              type="button"
              onClick={() =>
                toast.info(`Entrar com ${provider} não está disponível nesta demonstração.`)
              }
              className="border-border-soft hover:bg-surface-raised h-10 rounded-sm border text-[13px]"
            >
              Continuar com {provider}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
