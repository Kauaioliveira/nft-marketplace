import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { login } from '@/api/session'
import { FormField } from '@/components/form-field'
import { useAnnounce } from '@/components/live-announcer-context'
import { Button } from '@/components/ui/button'
import { AuthCard } from '@/features/session/auth-card'
import { authSearchSchema, safeRedirect } from '@/features/session/auth-search'
import { useAuthActions } from '@/features/session/use-auth-actions'

export const Route = createFileRoute('/login')({
  validateSearch: authSearchSchema,
  component: LoginPage,
})

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail.').pipe(z.email('Informe um e-mail válido.')),
  password: z.string().min(1, 'Informe sua senha.'),
})
type LoginValues = z.infer<typeof loginSchema>

function LoginPage() {
  const { redirect, reason } = Route.useSearch()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const { startSession } = useAuthActions()
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const { errors } = form.formState

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: async (session) => {
      await startSession(session)
      toast.success(`Bem-vindo de volta, ${session.user.name}.`)
      void navigate({ href: safeRedirect(redirect), replace: true })
    },
    onError: (error) => {
      form.setError('root', { message: error.message })
      announce(error.message)
    },
  })

  return (
    <AuthCard
      mode="login"
      redirect={redirect}
      description="Entre para gerenciar sua carteira, coleção e perfil de criador."
    >
      {reason === 'expired' && (
        <p
          role="status"
          className="border-amber/50 text-amber mb-4 rounded-sm border px-3 py-2 text-sm"
        >
          Sua sessão expirou. Entre novamente para continuar de onde parou.
        </p>
      )}
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-3"
      >
        <FormField
          label="E-mail"
          srOnlyLabel
          type="email"
          autoComplete="email"
          placeholder="contato@email.com"
          required
          error={errors.email?.message}
          {...form.register('email')}
        />
        <FormField
          label="Senha"
          srOnlyLabel
          type="password"
          autoComplete="current-password"
          placeholder="Senha"
          required
          error={errors.password?.message}
          {...form.register('password')}
        />
        <button
          type="button"
          className="text-brand self-end text-[13px] hover:underline"
          onClick={() =>
            toast.info('A recuperação de senha não está disponível nesta demonstração.')
          }
        >
          Esqueceu a senha?
        </button>
        {errors.root && (
          <p role="alert" className="text-coral text-sm">
            {errors.root.message}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="mt-2 h-11 text-[15px] font-bold"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </AuthCard>
  )
}
