import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ImageIcon } from 'lucide-react'
import { useId, useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import type { Profile } from '@/api/contracts'
import type { ApiError } from '@/api/errors'
import {
  changePassword,
  profileKeys,
  profileQuery,
  removeAvatar,
  updateProfile,
  uploadAvatar,
} from '@/api/profile'
import { FormField } from '@/components/form-field'
import { useAnnounce } from '@/components/live-announcer-context'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AccountLayout } from '@/features/account/account-layout'
import { useSession } from '@/features/session/use-session'

export const Route = createFileRoute('/_authenticated/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { user } = useSession()
  const {
    data: profile,
    isPending,
    isError,
    refetch,
  } = useQuery({
    ...profileQuery(user?.id ?? ''),
    enabled: Boolean(user),
  })

  return (
    <AccountLayout title="Perfil do colecionador">
      {isPending && <ProfileSkeleton />}
      {isError && !profile && (
        <div role="alert" className="bg-surface-card flex flex-col items-start gap-3 p-6">
          <p className="font-bold">Não foi possível carregar seu perfil.</p>
          <Button onClick={() => void refetch()}>Tentar novamente</Button>
        </div>
      )}
      {profile && (
        <div className="flex flex-col gap-10">
          <ProfileForm key={profile.id} profile={profile} />
          <PasswordForm />
        </div>
      )}
    </AccountLayout>
  )
}

function ProfileSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando perfil"
      className="grid grid-cols-1 gap-6 md:grid-cols-2"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-[70px] w-full" />
      ))}
    </div>
  )
}

/** Keeps the header and every other screen in sync after a profile change. */
function useApplyProfile() {
  const queryClient = useQueryClient()
  return (profile: Profile) => {
    queryClient.setQueryData(profileKeys.detail(profile.id), profile)
    void queryClient.invalidateQueries({ queryKey: ['session'] })
  }
}

const profileFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Informe como quer ser chamado.')
    .max(40, 'Use até 40 caracteres.'),
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9._]{3,20}$/i, 'Use de 3 a 20 letras, números, ponto ou sublinhado.'),
  email: z.string().trim().min(1, 'Informe seu e-mail.').pipe(z.email('Informe um e-mail válido.')),
  ensName: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{0,32}$/i, 'Use letras, números ou hífen.'),
  walletNickname: z
    .string()
    .trim()
    .min(2, 'Informe um apelido com pelo menos 2 caracteres.')
    .max(30, 'Use até 30 caracteres.'),
})
type ProfileValues = z.infer<typeof profileFormSchema>

function applyFieldErrors<T extends Record<string, unknown>>(
  error: ApiError,
  setError: (field: keyof T & string, value: { message: string }) => void,
  fields: (keyof T & string)[],
) {
  for (const [field, message] of Object.entries(error.fields ?? {})) {
    if ((fields as string[]).includes(field)) setError(field as keyof T & string, { message })
  }
}

function ProfileForm({ profile }: { profile: Profile }) {
  const announce = useAnnounce()
  const applyProfile = useApplyProfile()
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: profile.name,
      username: profile.username,
      email: profile.email,
      ensName: profile.ensName,
      walletNickname: profile.walletNickname,
    },
  })
  const { errors, isDirty } = form.formState

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: (updated) => {
      applyProfile(updated)
      form.reset({
        name: updated.name,
        username: updated.username,
        email: updated.email,
        ensName: updated.ensName,
        walletNickname: updated.walletNickname,
      })
      toast.success('Dados do perfil salvos.')
      announce('Dados do perfil salvos.')
    },
    onError: (error) => {
      applyFieldErrors<ProfileValues>(error, form.setError, [
        'name',
        'username',
        'email',
        'ensName',
        'walletNickname',
      ])
      announce(error.message)
    },
  })

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      aria-label="Dados do perfil"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-7">
        <FormField
          label="Nome de exibição"
          required
          autoComplete="name"
          error={errors.name?.message}
          {...form.register('name')}
        />
        <FormField
          label="Nome de usuário"
          required
          autoComplete="username"
          error={errors.username?.message}
          {...form.register('username')}
        />
        <FormField
          label="E-mail"
          required
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ens-name" className="text-[15px]">
            Nome ENS
          </label>
          <div className="flex gap-2">
            <span
              className="border-input grid h-10 place-items-center rounded-sm border px-3 text-[15px]"
              aria-hidden
            >
              .eth
            </span>
            <input
              id="ens-name"
              aria-invalid={Boolean(errors.ensName)}
              aria-describedby={errors.ensName ? 'ens-name-error' : 'ens-name-hint'}
              className="border-input aria-[invalid=true]:border-coral h-10 min-w-0 flex-1 rounded-sm border bg-transparent px-4 text-[15px]"
              {...form.register('ensName')}
            />
          </div>
          <p id="ens-name-hint" className="sr-only">
            O sufixo .eth é adicionado automaticamente.
          </p>
          {errors.ensName && (
            <p id="ens-name-error" className="text-coral text-sm">
              {errors.ensName.message}
            </p>
          )}
        </div>
        <FormField
          label="Apelido da carteira"
          required
          error={errors.walletNickname?.message}
          {...form.register('walletNickname')}
        />
        <AvatarField profile={profile} />
      </div>
      {errors.root && (
        <p role="alert" className="text-coral mt-4 text-sm">
          {errors.root.message}
        </p>
      )}
      {mutation.isError && !mutation.error.fields && (
        <p role="alert" className="text-coral mt-4 text-sm">
          {mutation.error.message}
        </p>
      )}
      <Button
        type="submit"
        size="lg"
        className="mt-6 h-10 px-10 font-bold"
        disabled={mutation.isPending || !isDirty}
      >
        {mutation.isPending ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  )
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function AvatarField({ profile }: { profile: Profile }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const errorId = useId()
  const announce = useAnnounce()
  const applyProfile = useApplyProfile()
  const [error, setError] = useState<string | null>(null)

  const upload = useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (updated) => {
      applyProfile(updated)
      setError(null)
      announce('Avatar atualizado.')
    },
    onError: (apiError) => {
      setError(apiError.fields?.avatar ?? apiError.message)
      announce(apiError.message)
    },
  })
  const remove = useMutation({
    mutationFn: removeAvatar,
    onSuccess: (updated) => {
      applyProfile(updated)
      announce('Avatar removido.')
    },
  })

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    upload.mutate(await readAsDataUrl(file))
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[15px]" id="avatar-label">
        Avatar
      </span>
      <div className="flex items-center gap-5">
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt="Seu avatar"
            width={50}
            height={50}
            className="size-[50px] rounded-full object-cover"
          />
        ) : (
          <span
            className="bg-surface-raised text-brand grid size-[50px] place-items-center rounded-full"
            aria-label="Sem avatar"
            role="img"
          >
            <ImageIcon className="size-6" aria-hidden />
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          aria-labelledby="avatar-label"
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => void onFile(event)}
          data-testid="avatar-input"
          tabIndex={-1}
        />
        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="font-bold"
        >
          {upload.isPending ? 'Enviando…' : 'Alterar'}
        </Button>
        {profile.avatar && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
          >
            Remover
          </Button>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-coral text-sm">
          {error}
        </p>
      )}
    </div>
  )
}

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: z
      .string()
      .min(8, 'A senha precisa de pelo menos 8 caracteres.')
      .regex(/[a-z]/i, 'A senha precisa de uma letra.')
      .regex(/\d/, 'A senha precisa de um número.'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha precisa ser diferente da atual.',
  })
type PasswordValues = z.infer<typeof passwordFormSchema>

function PasswordForm() {
  const announce = useAnnounce()
  const form = useForm<PasswordValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  const mutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: PasswordValues) =>
      changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      form.reset()
      toast.success('Senha alterada.')
      announce('Senha alterada.')
    },
    onError: (error) => {
      applyFieldErrors<PasswordValues>(error, form.setError, ['currentPassword', 'newPassword'])
      announce(error.message)
    },
  })

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      aria-labelledby="password-title"
      className="max-w-[417px]"
    >
      <h2 id="password-title" className="mb-4 text-lg font-bold">
        Alterar senha
      </h2>
      <div className="flex flex-col gap-5">
        <FormField
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...form.register('currentPassword')}
        />
        <FormField
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres, com letras e números."
          error={errors.newPassword?.message}
          {...form.register('newPassword')}
        />
        <FormField
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...form.register('confirmPassword')}
        />
      </div>
      <Button
        type="submit"
        size="lg"
        className="mt-6 h-10 px-10 font-bold"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? 'Alterando…' : 'Alterar senha'}
      </Button>
    </form>
  )
}
