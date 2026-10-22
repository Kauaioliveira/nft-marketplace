import Big from 'big.js'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { Cart, CartItem } from '@/api/contracts'
import { nftListQuery } from '@/api/nfts'
import { NftCard, NftCardSkeleton } from '@/components/nft-card'
import { QuantityStepper } from '@/components/quantity-stepper'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CouponForm, SummaryRows, SummarySkeleton } from '@/features/cart/cart-summary'
import { useCart, useCartMutations } from '@/features/cart/use-cart'
import { formatEth } from '@/lib/money'

export const Route = createFileRoute('/cart')({
  component: CartPage,
})

const MAX_PER_EDITION = 10

type PriceNotice = { id: string; text: string }

/** Lines whose price or stock changed between two cart responses (realtime or refetch). */
function diffCarts(previous: Cart | undefined, next: Cart | undefined): PriceNotice[] {
  if (!previous || !next) return []
  return next.items.flatMap((item) => {
    const before = previous.items.find((line) => line.id === item.id)
    if (!before) return []
    if (!new Big(before.unitPriceEth).eq(item.unitPriceEth)) {
      return [
        {
          id: `${item.id}-price-${item.unitPriceEth}`,
          text: `O preço de ${item.name} (${item.editionLabel}) mudou de ${formatEth(before.unitPriceEth)} para ${formatEth(item.unitPriceEth)}.`,
        },
      ]
    }
    if (item.available < item.quantity && before.available >= before.quantity) {
      return [
        {
          id: `${item.id}-stock-${item.available}`,
          text: `${item.name} (${item.editionLabel}) agora tem só ${item.available} disponível(is).`,
        },
      ]
    }
    return []
  })
}

function CartPage() {
  const { data: cart, isPending, isError, refetch, isFetching } = useCart()
  const navigate = useNavigate()
  const [previousCart, setPreviousCart] = useState<Cart | undefined>(cart)
  const [notices, setNotices] = useState<PriceNotice[]>([])

  if (cart !== previousCart) {
    const changes = diffCarts(previousCart, cart)
    setPreviousCart(cart)
    if (changes.length > 0) setNotices((current) => [...current, ...changes].slice(-4))
  }

  const blocked = cart?.items.some((item) => item.quantity > item.available) ?? false

  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-8 md:px-10 xl:px-[120px]">
      <nav aria-label="Trilha de navegação" className="mb-2 text-[15px] font-bold">
        <ol className="flex flex-wrap gap-2">
          <li>
            <Link to="/" className="hover:text-brand">
              Início
            </Link>{' '}
            /
          </li>
          <li>
            <Link to="/" hash="catalogo" className="hover:text-brand">
              Mercado
            </Link>{' '}
            /
          </li>
          <li aria-current="page">Carrinho</li>
        </ol>
      </nav>
      <h1 className="sr-only">Carrinho de NFTs</h1>

      {notices.length > 0 && (
        <div
          role="alert"
          className="border-amber/60 bg-surface-dark mb-6 flex flex-col gap-1 rounded-sm border px-4 py-3 text-sm"
        >
          {notices.map((notice) => (
            <p key={notice.id}>{notice.text}</p>
          ))}
          <button
            type="button"
            className="text-brand self-start underline"
            onClick={() => setNotices([])}
          >
            Entendi
          </button>
        </div>
      )}

      {isError && !cart ? (
        <div
          role="alert"
          className="bg-surface-card flex flex-col items-start gap-3 rounded-lg p-6"
        >
          <p className="font-bold">Não foi possível carregar o carrinho.</p>
          <Button onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? 'Tentando…' : 'Tentar novamente'}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_332px] lg:gap-[86px]">
          <section aria-label="Itens do carrinho">
            {isPending ? (
              <CartItemsSkeleton />
            ) : cart && cart.items.length > 0 ? (
              <CartItems items={cart.items} />
            ) : (
              <div className="bg-surface-card flex flex-col items-start gap-3 rounded-lg p-6">
                <p className="font-bold">Seu carrinho está vazio.</p>
                <p className="text-sand">Explore o catálogo e adicione NFTs para continuar.</p>
                <Link to="/" hash="catalogo" className={buttonVariants()}>
                  Explorar NFTs
                </Link>
              </div>
            )}
          </section>

          <aside aria-labelledby="summary-title" className="flex flex-col gap-5">
            <h2 id="summary-title" className="border-border-soft border-b pb-3 text-xl font-bold">
              Resumo da carteira
            </h2>
            {cart && <CouponForm coupon={cart.coupon} />}
            {isPending || !cart ? <SummarySkeleton /> : <SummaryRows summary={cart.summary} />}
            {blocked && (
              <p className="text-amber text-sm">
                Ajuste as quantidades indisponíveis antes de finalizar.
              </p>
            )}
            <Button
              size="lg"
              className="h-10 text-[15px] font-bold"
              disabled={!cart || cart.items.length === 0 || blocked}
              onClick={() => void navigate({ to: '/checkout' })}
            >
              Conectar e finalizar
            </Button>
            <Link
              to="/"
              hash="catalogo"
              className="text-brand text-center text-[15px] hover:underline"
            >
              Continuar explorando
            </Link>
          </aside>
        </div>
      )}

      <AlsoViewed />
    </div>
  )
}

function CartItems({ items }: { items: CartItem[] }) {
  const { update, remove } = useCartMutations()
  const busy = update.isPending || remove.isPending

  return (
    <>
      <table className="w-full border-separate border-spacing-y-3 max-md:hidden">
        <caption className="sr-only">NFTs no carrinho, com preço, edições e total</caption>
        <thead>
          <tr className="text-left text-[17px]">
            <th scope="col" className="border-border-soft border-b pb-3 font-normal">
              NFTs
            </th>
            <th scope="col" className="border-border-soft border-b pb-3 font-normal">
              Preço
            </th>
            <th scope="col" className="border-border-soft border-b pb-3 font-normal">
              Edições
            </th>
            <th scope="col" className="border-border-soft border-b pb-3 font-normal">
              Total
            </th>
            <th scope="col" className="border-border-soft border-b pb-3">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="bg-surface-card" data-testid="cart-line">
              <td className="py-0 pr-3">
                <div className="flex items-center gap-4">
                  <img
                    src={item.image.replace('.webp', '-sm.webp')}
                    alt=""
                    width={70}
                    height={70}
                    className="size-[70px] object-cover"
                  />
                  <div>
                    <Link
                      to="/nfts/$nftId"
                      params={{ nftId: item.nftId }}
                      className="hover:text-brand text-[17px] font-bold"
                    >
                      {item.name}
                    </Link>
                    <p className="text-sand text-[15px]">
                      ID do token: {item.tokenId} · Edição {item.editionLabel}
                    </p>
                    {item.quantity > item.available && (
                      <p className="text-amber text-sm">Só {item.available} disponível(is)</p>
                    )}
                  </div>
                </div>
              </td>
              <td className="text-accent-text text-[17px] font-bold whitespace-nowrap">
                {formatEth(item.unitPriceEth)}
              </td>
              <td>
                <QuantityStepper
                  size="sm"
                  label={`Quantidade de ${item.name}`}
                  value={item.quantity}
                  max={Math.min(item.available, MAX_PER_EDITION)}
                  disabled={busy}
                  onChange={(quantity) => update.mutate({ lineId: item.id, quantity })}
                />
              </td>
              <td
                className="text-brand text-[17px] font-bold whitespace-nowrap"
                data-testid="line-total"
              >
                {formatEth(item.lineTotalEth)}
              </td>
              <td className="pr-4 text-right">
                <button
                  type="button"
                  aria-label={`Remover ${item.name} do carrinho`}
                  onClick={() => remove.mutate(item.id)}
                  disabled={busy}
                  className="text-sand hover:text-coral rounded p-2 disabled:opacity-40"
                >
                  <Trash2 className="size-5" aria-hidden />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col gap-4 md:hidden" aria-label="NFTs no carrinho">
        {items.map((item) => (
          <li
            key={item.id}
            className="bg-surface-card flex overflow-hidden rounded-2xl"
            data-testid="cart-line-mobile"
          >
            <img
              src={item.image.replace('.webp', '-sm.webp')}
              alt=""
              width={100}
              height={100}
              className="size-[100px] object-cover"
            />
            <div className="flex flex-1 flex-col gap-1 p-3">
              <Link to="/nfts/$nftId" params={{ nftId: item.nftId }} className="font-bold">
                {item.name}
              </Link>
              <p className="text-sand text-sm">Edição: {item.editionLabel}</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-brand text-lg font-bold">{formatEth(item.lineTotalEth)}</p>
                <QuantityStepper
                  size="sm"
                  label={`Quantidade de ${item.name}`}
                  value={item.quantity}
                  max={Math.min(item.available, MAX_PER_EDITION)}
                  disabled={busy}
                  onChange={(quantity) => update.mutate({ lineId: item.id, quantity })}
                />
              </div>
              <button
                type="button"
                onClick={() => remove.mutate(item.id)}
                disabled={busy}
                className="text-sand hover:text-coral self-end text-sm"
              >
                Remover<span className="sr-only"> {item.name}</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

function CartItemsSkeleton() {
  return (
    <div role="status" aria-label="Carregando itens do carrinho" className="flex flex-col gap-3">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-[70px] w-full rounded-none" />
      ))}
    </div>
  )
}

function AlsoViewed() {
  const { data, isPending } = useQuery(
    nftListQuery({ tab: 'trending', pageSize: 5, page: 1, sort: 'recent' }),
  )
  return (
    <section aria-labelledby="also-viewed" className="mt-24">
      <h2
        id="also-viewed"
        className="border-border-soft text-brand border-b pb-3 text-lg font-bold"
      >
        Colecionadores também viram
      </h2>
      <ul className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {isPending
          ? Array.from({ length: 5 }, (_, index) => (
              <li key={index}>
                <NftCardSkeleton />
              </li>
            ))
          : data?.items.map((nft) => (
              <li key={nft.id}>
                <NftCard nft={nft} />
              </li>
            ))}
      </ul>
    </section>
  )
}
