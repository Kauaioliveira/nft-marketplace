import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { register as registerAccount } from '@/api/session'
import { FormField } from '@/components/form-field'
import { useAnnounce } from '@/components/live-announcer-context'
import { Button } from '@/components/ui/button'
import { AuthCard } from '@/features/session/auth-card'
import { authSearchSchema, safeRedirect } from '@/features/session/auth-search'
import { useAuthActions } from '@/features/session/use-auth-actions'

export const Route = createFileRoute('/register')({
  validateSearch: authSearchSchema,
  component: RegisterPage,
})

// Same rules as the API; the API stays the authority and its errors are shown on the fields too.
const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .regex(/^[a-z0-9._]{3,20}$/i, 'Use de 3 a 20 letras, números, ponto ou sublinhado.'),
    email: z
      .string()
      .trim()
      .min(1, 'Informe seu e-mail.')
      .pipe(z.email('Informe um e-mail válido.')),
    password: z
      .string()
      .min(8, 'A senha precisa de pelo menos 8 caracteres.')
      .regex(/[a-z]/i, 'A senha precisa de uma letra.')
      .regex(/\d/, 'A senha precisa de um número.'),
    confirmPassword: z.string().min(1, 'Confirme sua senha.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })
type RegisterValues = z.infer<typeof registerSchema>

function RegisterPage() {
  const { redirect } = Route.useSearch()
  const navigate = useNavigate()
  const announce = useAnnounce()
  const { startSession } = useAuthActions()
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  const mutation = useMutation({
    mutationFn: ({ username, email, password }: RegisterValues) =>
      registerAccount({ username, email, password }),
    onSuccess: async (session) => {
      await startSession(session)
      toast.success('Conta criada. Boas-vindas à Kurio!')
      void navigate({ href: safeRedirect(redirect), replace: true })
    },
    onError: (error) => {
      // 409 (e-mail or username taken) and 422 come with per-field messages.
      for (const [field, message] of Object.entries(error.fields ?? {})) {
        if (field in form.getValues()) form.setError(field as keyof RegisterValues, { message })
      }
      form.setError('root', { message: error.message })
      announce(error.message)
    },
  })

  return (
    <AuthCard
      mode="register"
      redirect={redirect}
      description="Crie seu perfil de colecionador e conecte uma carteira quando quiser."
    >
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="flex flex-col gap-3"
      >
        <FormField
          label="Nome de usuário"
          srOnlyLabel
          autoComplete="username"
          placeholder="Nome de usuário"
          required
          error={errors.username?.message}
          {...form.register('username')}
        />
        <FormField
          label="E-mail"
          srOnlyLabel
          type="email"
          autoComplete="email"
          placeholder="Digite seu e-mail"
          required
          error={errors.email?.message}
          {...form.register('email')}
        />
        <FormField
          label="Senha"
          srOnlyLabel
          type="password"
          autoComplete="new-password"
          placeholder="Senha"
          required
          hint="Mínimo de 8 caracteres, com letras e números."
          error={errors.password?.message}
          {...form.register('password')}
        />
        <FormField
          label="Confirmar senha"
          srOnlyLabel
          type="password"
          autoComplete="new-password"
          placeholder="Confirmar senha"
          required
          error={errors.confirmPassword?.message}
          {...form.register('confirmPassword')}
        />
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
          {mutation.isPending ? 'Criando conta…' : 'Criar conta'}
        </Button>
      </form>
    </AuthCard>
  )
}
