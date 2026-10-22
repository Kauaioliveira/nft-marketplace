import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { checkoutKeys, walletsQuery } from '@/api/checkout'
import {
  networks,
  walletProviders,
  type Network,
  type Wallet,
  type WalletProvider,
} from '@/api/contracts'
import { saveWallet } from '@/api/profile'
import { FormField } from '@/components/form-field'
import { useAnnounce } from '@/components/live-announcer-context'
import { SelectField } from '@/components/select-field'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AccountLayout } from '@/features/account/account-layout'
import { useSession } from '@/features/session/use-session'
import { networkLabels, walletProviderLabels } from '@/lib/labels'

export const Route = createFileRoute('/_authenticated/wallets')({
  component: WalletsPage,
})

type Role = 'primary' | 'secondary'

const isOneOf = (options: readonly string[]) => (value: string) => options.includes(value)

const walletFormSchema = z.object({
  label: z
    .string()
    .trim()
    .min(2, 'Informe um apelido com pelo menos 2 caracteres.')
    .max(30, 'Use até 30 caracteres.'),
  network: z.string().refine(isOneOf(networks), 'Selecione uma rede.'),
  provider: z.string().refine(isOneOf(walletProviders), 'Selecione o tipo de carteira.'),
  address: z
    .string()
    .trim()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      'Endereço inválido. Use 0x seguido de 40 caracteres hexadecimais.',
    ),
})
type WalletValues = z.infer<typeof walletFormSchema>

function WalletsPage() {
  const { user } = useSession()
  const {
    data: wallets,
    isPending,
    isError,
    refetch,
  } = useQuery({
    ...walletsQuery(user?.id ?? ''),
    enabled: Boolean(user),
  })
  const primary = wallets?.find((wallet) => wallet.role === 'primary')
  const secondary = wallets?.find((wallet) => wallet.role === 'secondary')

  return (
    <AccountLayout title="Carteiras">
      {isPending && (
        <div
          role="status"
          aria-label="Carregando carteiras"
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-[70px] w-full" />
          ))}
        </div>
      )}
      {isError && !wallets && (
        <div role="alert" className="bg-surface-card flex flex-col items-start gap-3 p-6">
          <p className="font-bold">Não foi possível carregar suas carteiras.</p>
          <Button onClick={() => void refetch()}>Tentar novamente</Button>
        </div>
      )}
      {wallets && user && (
        <div className="flex flex-col gap-12">
          <WalletSection
            key={`primary-${primary?.id ?? 'new'}`}
            userId={user.id}
            role="primary"
            wallet={primary}
            title="Carteira principal"
            description="Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados."
          />
          <WalletSection
            key={`secondary-${secondary?.id ?? 'new'}`}
            userId={user.id}
            role="secondary"
            wallet={secondary}
            primary={primary}
            title="Carteira secundária"
            description={
              secondary
                ? 'Usada como alternativa no pagamento.'
                : 'Você ainda não adicionou uma carteira secundária.'
            }
          />
        </div>
      )}
    </AccountLayout>
  )
}

function WalletSection(props: {
  userId: string
  role: Role
  wallet: Wallet | undefined
  primary?: Wallet
  title: string
  description: string
}) {
  const { userId, role, wallet, primary } = props
  const [editing, setEditing] = useState(Boolean(wallet) || role === 'primary')
  const queryClient = useQueryClient()
  const announce = useAnnounce()
  const headingId = `${role}-wallet-title`

  const form = useForm<WalletValues>({
    resolver: zodResolver(walletFormSchema),
    defaultValues: {
      label: wallet?.label ?? '',
      network: wallet?.network ?? '',
      provider: wallet?.provider ?? '',
      address: wallet?.address ?? '',
    },
  })
  const { errors, isDirty } = form.formState

  const mutation = useMutation({
    mutationFn: (values: WalletValues) =>
      saveWallet(role, {
        label: values.label,
        network: values.network as Network,
        provider: values.provider as WalletProvider,
        address: values.address,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: checkoutKeys.wallets(userId) })
      const message =
        role === 'primary' ? 'Carteira principal salva.' : 'Carteira secundária salva.'
      toast.success(message)
      announce(message)
    },
    onError: (error) => {
      for (const [field, message] of Object.entries(error.fields ?? {})) {
        if (field in form.getValues()) form.setError(field as keyof WalletValues, { message })
      }
      announce(error.message)
    },
  })

  const copyPrimary = (checked: boolean) => {
    if (!checked || !primary) return
    // Same network and provider as the primary; the address must still be a different wallet.
    form.setValue('network', primary.network, { shouldDirty: true })
    form.setValue('provider', primary.provider, { shouldDirty: true })
  }

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={headingId} className="text-lg font-bold">
            {props.title}
          </h2>
          <p className="text-sand text-[15px]">{props.description}</p>
        </div>
        <div className="flex items-center gap-4">
          {role === 'secondary' && primary && editing && (
            <label className="flex items-center gap-2 text-[15px]">
              <input
                type="checkbox"
                onChange={(event) => copyPrimary(event.target.checked)}
                className="size-4 accent-[var(--color-brand)]"
              />
              Igual à carteira principal
            </label>
          )}
          {!editing && (
            <Button
              variant="link"
              className="text-brand h-auto p-0 text-lg font-bold"
              onClick={() => setEditing(true)}
            >
              Adicionar
            </Button>
          )}
        </div>
      </div>

      {editing && (
        <form
          noValidate
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          aria-labelledby={headingId}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-7">
            <FormField
              label="Apelido da carteira"
              required
              error={errors.label?.message}
              {...form.register('label')}
            />
            <SelectField
              label="Rede"
              required
              error={errors.network?.message}
              {...form.register('network')}
            >
              <option value="">Selecione uma rede</option>
              {networks.map((network) => (
                <option key={network} value={network}>
                  {networkLabels[network]}
                </option>
              ))}
            </SelectField>
            <FormField
              label="Endereço da carteira"
              required
              placeholder="Endereço 0x da carteira"
              spellCheck={false}
              error={errors.address?.message}
              {...form.register('address')}
            />
            <SelectField
              label="Tipo de carteira"
              required
              error={errors.provider?.message}
              {...form.register('provider')}
            >
              <option value="">Selecione uma carteira</option>
              {walletProviders.map((provider) => (
                <option key={provider} value={provider}>
                  {walletProviderLabels[provider]}
                </option>
              ))}
            </SelectField>
          </div>
          {mutation.isError && !mutation.error.fields && (
            <p role="alert" className="text-coral mt-4 text-sm">
              {mutation.error.message}
            </p>
          )}
          <Button
            type="submit"
            className="mt-6 h-10 px-4 font-bold"
            disabled={mutation.isPending || (!isDirty && Boolean(wallet))}
          >
            {mutation.isPending ? 'Salvando…' : 'Salvar carteira'}
          </Button>
        </form>
      )}
    </section>
  )
}
