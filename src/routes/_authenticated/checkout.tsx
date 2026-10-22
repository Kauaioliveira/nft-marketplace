import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { walletsQuery } from '@/api/checkout'
import {
  networks,
  walletProviders,
  type CartItem,
  type Network,
  type User,
  type Wallet,
  type WalletProvider,
} from '@/api/contracts'
import { FormField, inputClass } from '@/components/form-field'
import { Button, buttonVariants } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { SummaryRows, SummarySkeleton } from '@/features/cart/cart-summary'
import { useCart } from '@/features/cart/use-cart'
import {
  checkoutSchema,
  emptyCheckout,
  type CheckoutValues,
} from '@/features/checkout/checkout-schema'
import {
  readCheckoutDraft,
  readPendingAttempt,
  saveCheckoutDraft,
  type PendingAttempt,
} from '@/features/checkout/checkout-storage'
import { usePlaceOrder } from '@/features/checkout/use-place-order'
import { useWalletConnections, WalletConnection } from '@/features/checkout/wallet-connection'
import { useSession } from '@/features/session/use-session'
import { networkLabels, walletProviderLabels } from '@/lib/labels'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/checkout')({
  component: CheckoutPage,
})

function initialValues(user: User, wallets: Wallet[] | undefined): CheckoutValues {
  const draft = readCheckoutDraft<CheckoutValues>()
  if (draft) return { ...emptyCheckout, ...draft }
  const primary = wallets?.find((wallet) => wallet.role === 'primary')
  return {
    ...emptyCheckout,
    displayName: user.name,
    username: user.username,
    email: user.email,
    network: primary?.network ?? '',
    walletAddress: primary?.address ?? '',
    walletProvider: primary?.provider ?? '',
  }
}

function CheckoutPage() {
  const { user } = useSession()
  const walletsResult = useQuery({ ...walletsQuery(user?.id ?? ''), enabled: Boolean(user) })
  if (!user || walletsResult.isPending) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 pt-8 md:px-[120px]">
        <SummarySkeleton />
      </div>
    )
  }
  // The form mounts once the saved wallets are known, so they can prefill it.
  return <CheckoutForm user={user} wallets={walletsResult.data} />
}

function CheckoutForm({ user, wallets }: { user: User; wallets: Wallet[] | undefined }) {
  const { data: cart, isPending: cartPending } = useCart()
  const { data: connected = [] } = useWalletConnections(user.id)
  const order = usePlaceOrder(user.id)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [pendingAttempt, setPendingAttempt] = useState<PendingAttempt | null>(() => {
    const attempt = readPendingAttempt()
    return attempt?.userId === user.id ? attempt : null
  })
  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: initialValues(user, wallets),
  })

  // The draft survives a refresh or an expired session, so the user can pick up where they stopped.
  useEffect(() => {
    const subscription = form.watch((values) => saveCheckoutDraft(values))
    return () => subscription.unsubscribe()
  }, [form])

  const values = form.watch()
  const provider = values.walletProvider

  const openReview = form.handleSubmit(async (data) => {
    if (!connected.includes(data.walletProvider as WalletProvider)) {
      form.setError('walletProvider', {
        message: 'Conecte a carteira selecionada antes de revisar o pedido.',
      })
      return
    }
    try {
      await order.startReview(data.network as Network)
      setReviewOpen(true)
    } catch {
      // The error is shown next to the button through quoteMutation.
    }
  })

  const confirm = () => {
    const data = form.getValues()
    order.submit({
      wallet: { provider: data.walletProvider as WalletProvider, address: data.walletAddress },
      buyer: { name: data.displayName, email: data.email },
    })
  }

  const items = cart?.items ?? []
  const empty = !cartPending && items.length === 0

  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-8 md:px-[120px]">
      <nav aria-label="Trilha de navegação" className="mb-6 text-[15px] font-bold">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link to="/" className="hover:text-brand">
              Início
            </Link>{' '}
            /
          </li>
          <li>
            <Link to="/cart" className="hover:text-brand">
              Carrinho
            </Link>{' '}
            /
          </li>
          <li aria-current="page">Pagamento</li>
        </ol>
      </nav>
      <h1 className="sr-only">Pagamento</h1>

      {pendingAttempt && (
        <div
          role="alert"
          className="border-amber/60 bg-surface-dark mb-6 flex flex-wrap items-center justify-between gap-3 rounded-sm border px-4 py-3"
        >
          <p>
            Há um envio de pedido sem resposta. Retome para saber o resultado, sem criar outra
            compra.
          </p>
          <Button
            onClick={() => {
              order.resume(pendingAttempt)
              setPendingAttempt(null)
            }}
            disabled={order.orderMutation.isPending}
          >
            Retomar pedido
          </Button>
        </div>
      )}

      {empty ? (
        <div className="bg-surface-card flex flex-col items-start gap-3 rounded-lg p-6">
          <p className="font-bold">Seu carrinho está vazio.</p>
          <Link to="/" hash="catalogo" className={buttonVariants()}>
            Explorar NFTs
          </Link>
        </div>
      ) : (
        <form
          noValidate
          onSubmit={openReview}
          className="grid gap-10 lg:grid-cols-[1fr_405px] lg:gap-8"
        >
          <CollectorFields form={form} />

          <aside aria-labelledby="your-nfts" className="flex flex-col gap-5">
            <div>
              <h2 id="your-nfts" className="text-lg font-bold">
                Seus NFTs
              </h2>
              <div className="border-border-soft mt-2 flex justify-between border-b pb-2 text-[17px]">
                <span>NFTs</span>
                <span>Subtotal</span>
              </div>
              <ul className="mt-3 flex flex-col gap-3">
                {items.map((item) => (
                  <OrderLine key={item.id} item={item} />
                ))}
              </ul>
            </div>
            <Link to="/cart" className="hover:text-brand text-center text-[15px]">
              Tem um código promocional? Aplique no carrinho
            </Link>
            {cart ? <SummaryRows summary={cart.summary} /> : <SummarySkeleton />}

            <WalletConnection
              userId={user.id}
              value={provider as WalletProvider | ''}
              onChange={(next) =>
                form.setValue('walletProvider', next, { shouldValidate: true, shouldDirty: true })
              }
              error={form.formState.errors.walletProvider?.message}
            />

            {order.quoteMutation.isError && (
              <p role="alert" className="text-coral text-sm">
                {order.quoteMutation.error.message}
              </p>
            )}
            {order.orderMutation.isError && !reviewOpen && (
              <p role="alert" className="text-coral text-sm">
                {order.orderMutation.error.message}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="h-[45px] text-[15px] font-bold"
              disabled={order.quoteMutation.isPending || cartPending}
            >
              {order.quoteMutation.isPending ? 'Calculando cotação…' : 'Revisar compra'}
            </Button>
          </aside>
        </form>
      )}

      <ReviewDialog
        open={reviewOpen}
        onOpenChange={(open) => {
          // Closing is blocked while a submission is in flight, to avoid a second click path.
          if (!open && order.orderMutation.isPending) return
          setReviewOpen(open)
        }}
        order={order}
        walletLabel={provider ? walletProviderLabels[provider as WalletProvider] : ''}
        address={values.walletAddress}
        onConfirm={confirm}
      />
    </div>
  )
}

function CollectorFields({ form }: { form: UseFormReturn<CheckoutValues> }) {
  const { errors } = form.formState
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="mb-4 text-lg font-bold">Perfil do colecionador</legend>
      <div className="grid gap-5 md:grid-cols-2 md:gap-x-6">
        <FormField
          label="Nome de exibição"
          required
          autoComplete="name"
          error={errors.displayName?.message}
          {...form.register('displayName')}
        />
        <FormField
          label="Nome de usuário"
          required
          autoComplete="username"
          error={errors.username?.message}
          {...form.register('username')}
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
          label="Nome do perfil"
          error={errors.profileName?.message}
          {...form.register('profileName')}
        />
        <FormField
          label="Endereço da carteira"
          required
          placeholder="Endereço 0x da carteira"
          spellCheck={false}
          error={errors.walletAddress?.message}
          {...form.register('walletAddress')}
        />
        <FormField
          label="Carteira secundária ou ENS"
          placeholder="ENS ou carteira secundária (opcional)"
          error={errors.secondaryWallet?.message}
          {...form.register('secondaryWallet')}
        />
        <SelectField
          label="Tipo de carteira"
          required
          error={errors.walletProvider?.message}
          {...form.register('walletProvider')}
        >
          <option value="">Selecione uma carteira</option>
          {walletProviders.map((provider) => (
            <option key={provider} value={provider}>
              {walletProviderLabels[provider]}
            </option>
          ))}
        </SelectField>
        <FormField
          label="Código de indicação"
          error={errors.referralCode?.message}
          {...form.register('referralCode')}
        />
        <FormField
          label="E-mail"
          required
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...form.register('email')}
        />
        <FormField
          label="Nome ENS"
          placeholder="seunome"
          hint="O sufixo .eth é adicionado automaticamente."
          error={errors.ensName?.message}
          {...form.register('ensName')}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="collector-note" className="text-[15px]">
          Observação do colecionador (opcional)
        </label>
        <textarea
          id="collector-note"
          rows={5}
          aria-invalid={Boolean(errors.note)}
          aria-describedby={errors.note ? 'collector-note-error' : undefined}
          className="border-input max-w-[350px] rounded-sm border bg-transparent p-3 text-[15px]"
          {...form.register('note')}
        />
        {errors.note && (
          <p id="collector-note-error" className="text-coral text-sm">
            {errors.note.message}
          </p>
        )}
      </div>
    </fieldset>
  )
}

type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  error?: string
  required?: boolean
}

function SelectField({ label, error, required, children, ...props }: SelectFieldProps) {
  const id = `select-${props.name}`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px]">
        {label}
        {required && (
          <span className="text-coral" aria-hidden>
            *
          </span>
        )}
      </label>
      <select
        id={id}
        aria-invalid={Boolean(error)}
        aria-required={required}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(inputClass, 'bg-ink')}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={`${id}-error`} className="text-coral text-sm">
          {error}
        </p>
      )}
    </div>
  )
}

function OrderLine({ item }: { item: CartItem }) {
  return (
    <li className="bg-surface-card flex items-center gap-3 pr-3">
      <img
        src={item.image.replace('.webp', '-sm.webp')}
        alt=""
        width={70}
        height={70}
        className="size-[70px] object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{item.name}</p>
        <p className="text-sand text-sm">
          ID do token: {item.tokenId} · {item.editionLabel}
        </p>
      </div>
      <span className="text-sand text-sm">(x {item.quantity})</span>
      <span className="text-brand font-bold">{formatEth(item.lineTotalEth)}</span>
    </li>
  )
}

function ReviewDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: ReturnType<typeof usePlaceOrder>
  walletLabel: string
  address: string
  onConfirm: () => void
}) {
  const { quote, staleReason, uncertain, orderMutation, quoteMutation } = props.order
  if (!quote) return null
  const submitting = orderMutation.isPending

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="bg-surface-card max-h-[90dvh] overflow-y-auto sm:max-w-[560px]">
        <DialogTitle className="text-xl">Revise seu pedido</DialogTitle>
        <DialogDescription className="text-sand">
          Valores da cotação de{' '}
          {new Date(quote.expiresAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          })}{' '}
          (válida até esse horário), na rede {networkLabels[quote.network]}, pagando com{' '}
          {props.walletLabel}.
        </DialogDescription>
        <ul className="flex flex-col gap-2">
          {quote.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 text-[15px]">
              <span>
                {item.name} · {item.editionLabel} (x {item.quantity})
              </span>
              <span className="text-brand font-bold">{formatEth(item.lineTotalEth)}</span>
            </li>
          ))}
        </ul>
        <SummaryRows
          summary={quote.summary}
          feeLabel={`Taxa da rede ${networkLabels[quote.network]}`}
        />

        {staleReason && (
          <div
            role="alert"
            className="border-amber/60 bg-surface-dark flex flex-col gap-2 rounded-sm border p-3 text-sm"
          >
            <p>{staleReason}</p>
            <Button
              variant="secondary"
              onClick={() => props.order.refreshQuote()}
              disabled={quoteMutation.isPending}
            >
              {quoteMutation.isPending ? 'Atualizando…' : 'Atualizar cotação'}
            </Button>
          </div>
        )}
        {uncertain && (
          <p role="alert" className="border-amber/60 rounded-sm border p-3 text-sm">
            Não recebemos a confirmação do pedido. Ele pode já ter sido criado: tente de novo com
            segurança, não haverá cobrança em dobro.
          </p>
        )}
        {orderMutation.isError && !uncertain && !staleReason && (
          <p role="alert" className="text-coral text-sm">
            {orderMutation.error.message}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => props.onOpenChange(false)} disabled={submitting}>
            Voltar e editar
          </Button>
          <Button
            onClick={props.onConfirm}
            disabled={submitting || Boolean(staleReason) || quoteMutation.isPending}
            className="font-bold"
          >
            {submitting ? 'Enviando pedido…' : uncertain ? 'Tentar novamente' : 'Confirmar compra'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
