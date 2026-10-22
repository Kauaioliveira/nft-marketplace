import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Loader2, MailOpen, XCircle } from 'lucide-react'
import { orderQuery } from '@/api/checkout'
import type { Order } from '@/api/contracts'
import { NotFound } from '@/components/not-found'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/features/session/use-session'
import { networkLabels, shortAddress, walletProviderLabels } from '@/lib/labels'
import { formatEth } from '@/lib/money'

export const Route = createFileRoute('/_authenticated/orders/$orderId')({
  component: OrderPage,
})

/** Fallback polling while pending, in case the socket is down; the realtime event usually wins. */
const PENDING_POLL_MS = 3000

function OrderPage() {
  const { orderId } = Route.useParams()
  const { user } = useSession()
  const {
    data: order,
    error,
    isPending,
    refetch,
    isFetching,
  } = useQuery({
    ...orderQuery(user?.id ?? '', orderId),
    enabled: Boolean(user),
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? PENDING_POLL_MS : false),
  })

  if (error?.code === 'NOT_FOUND') {
    return (
      <NotFound
        title="Pedido não encontrado"
        description="Este pedido não existe ou pertence a outra conta."
      />
    )
  }

  return (
    <div className="mx-auto max-w-[578px] px-4 py-10 md:py-16">
      {isPending && <Skeleton className="h-[480px] w-full" />}
      {error && !order && (
        <div role="alert" className="bg-surface-card flex flex-col items-start gap-3 p-6">
          <p className="font-bold">Não foi possível consultar o pedido.</p>
          <Button onClick={() => void refetch()} disabled={isFetching}>
            Tentar novamente
          </Button>
        </div>
      )}
      {order?.status === 'pending' && <PendingOrder order={order} />}
      {order?.status === 'confirmed' && <Receipt order={order} />}
      {order?.status === 'declined' && <DeclinedOrder order={order} />}
    </div>
  )
}

function PendingOrder({ order }: { order: Order }) {
  return (
    <section
      role="status"
      aria-live="polite"
      className="border-brand bg-surface-card flex flex-col items-center gap-4 border-b-[10px] px-6 py-12 text-center"
    >
      <Loader2 className="text-brand size-12 animate-spin motion-reduce:animate-none" aria-hidden />
      <h1 className="text-xl font-bold">Aguardando confirmação na rede</h1>
      <p className="text-sand">
        Pedido <strong className="text-foreground">{order.id}</strong> criado. Você pode recarregar
        ou fechar a página: o pedido continua sendo processado e nenhuma outra compra será criada.
      </p>
    </section>
  )
}

function DeclinedOrder({ order }: { order: Order }) {
  return (
    <section
      role="alert"
      className="border-coral bg-surface-card flex flex-col items-center gap-4 border-b-[10px] px-6 py-12 text-center"
    >
      <XCircle className="text-coral size-12" aria-hidden />
      <h1 className="text-xl font-bold">Pagamento recusado</h1>
      <p className="text-sand">{order.declineReason ?? 'A carteira recusou o pagamento.'}</p>
      <p className="text-sand">Seus itens continuam no carrinho. Nenhum valor foi cobrado.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/cart" className={buttonVariants({ variant: 'outline' })}>
          Voltar ao carrinho
        </Link>
        <Link to="/checkout" className={buttonVariants()}>
          Tentar novamente
        </Link>
      </div>
    </section>
  )
}

/** Built only from the order snapshot, so later catalog changes never alter it. */
function Receipt({ order }: { order: Order }) {
  const date = new Date(order.updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  return (
    <section
      aria-labelledby="receipt-title"
      className="border-brand bg-surface-card border-b-[10px]"
      data-testid="receipt"
    >
      <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-5 text-center">
        <MailOpen className="text-brand size-16" aria-hidden strokeWidth={1.25} />
        <h1 id="receipt-title" className="text-sand text-[17px] font-bold">
          Seus NFTs agora estão na sua carteira
        </h1>
      </div>
      <dl className="border-brand sm:divide-brand grid grid-cols-2 gap-y-3 border-y px-6 py-3 text-[15px] sm:grid-cols-4 sm:divide-x">
        <div className="sm:pr-3">
          <dt className="font-bold">ID da transação</dt>
          <dd className="text-sand" title={order.transactionHash ?? ''}>
            {shortAddress(order.transactionHash ?? '')}
          </dd>
        </div>
        <div className="sm:px-3">
          <dt>Data</dt>
          <dd className="text-sand">{date}</dd>
        </div>
        <div className="sm:px-3">
          <dt>Total</dt>
          <dd className="text-sand">{formatEth(order.summary.totalEth, 6)}</dd>
        </div>
        <div className="sm:pl-3">
          <dt className="font-bold">Carteira</dt>
          <dd className="text-sand">{walletProviderLabels[order.wallet.provider]}</dd>
        </div>
      </dl>
      <div className="px-6 py-5 sm:px-11">
        <h2 className="text-[15px] font-bold">Detalhes da transação</h2>
        <table className="mt-2 w-full text-[15px]">
          <caption className="sr-only">Itens comprados</caption>
          <thead>
            <tr className="border-border-soft border-b text-left">
              <th scope="col" className="pb-2 font-bold">
                NFTs
              </th>
              <th scope="col" className="px-2 pb-2 text-center font-bold">
                Edições
              </th>
              <th scope="col" className="pb-2 text-right font-bold">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.image.replace('.webp', '-sm.webp')}
                      alt=""
                      width={64}
                      height={64}
                      className="size-16 rounded object-cover max-sm:hidden"
                    />
                    <div>
                      <p className="font-bold">{item.name}</p>
                      <p className="text-sand text-sm">
                        ID do token: {item.tokenId} · {item.editionLabel}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="text-sand text-center">(x {item.quantity})</td>
                <td className="text-brand text-right font-bold">{formatEth(item.lineTotalEth)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-3 ml-auto flex max-w-[330px] flex-col gap-1 text-[15px]">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatEth(order.summary.subtotalEth, 6)}</dd>
          </div>
          {order.coupon && (
            <div className="flex justify-between">
              <dt>Desconto ({order.coupon.code})</dt>
              <dd>(-) {formatEth(order.summary.discountEth, 6)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Taxa de rede</dt>
            <dd>{formatEth(order.summary.networkFeeEth, 6)}</dd>
          </div>
          <div className="border-border-soft flex justify-between border-t pt-1 font-bold">
            <dt>Total</dt>
            <dd className="text-brand" data-testid="receipt-total">
              {formatEth(order.summary.totalEth, 6)}
            </dd>
          </div>
        </dl>
        <p className="text-sand mt-4 text-center text-[15px]">
          Transação confirmada na {networkLabels[order.network]} (simulada). A propriedade foi
          transferida para a carteira {shortAddress(order.wallet.address)}.
        </p>
        {order.explorerUrl && (
          <p className="mt-4 text-center">
            <a
              href={order.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ size: 'lg' })}
            >
              Ver no Etherscan (link simulado)
            </a>
          </p>
        )}
        <p className="mt-4 text-center">
          <Link to="/" className="text-brand hover:underline">
            Continuar explorando
          </Link>
        </p>
      </div>
    </section>
  )
}
