import { useNavigate } from '@tanstack/react-router'
import { Heart, Star } from 'lucide-react'
import { useState } from 'react'
import type { Nft } from '@/api/contracts'
import { QuantityStepper } from '@/components/quantity-stepper'
import { Button } from '@/components/ui/button'
import { useCart, useCartMutations } from '@/features/cart/use-cart'
import { useFavorites, useToggleFavorite } from '@/features/favorites/use-favorites'
import { categoryLabels, networkLabels } from '@/lib/labels'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

const MAX_PER_EDITION = 10
/** The 1/50 edition is the one priced on the catalog card. */
const DEFAULT_EDITION_INDEX = 2

export function NftPurchasePanel({ nft }: { nft: Nft }) {
  const navigate = useNavigate()
  const { data: cart } = useCart()
  const { add } = useCartMutations()
  const { ids: favorites } = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const isFavorite = favorites.has(nft.id)

  const fallbackEdition = nft.editions[DEFAULT_EDITION_INDEX] ?? nft.editions[0]!
  const [editionId, setEditionId] = useState(fallbackEdition.id)
  const edition = nft.editions.find((item) => item.id === editionId) ?? fallbackEdition
  const inCart = cart?.items.find((item) => item.editionId === edition.id)?.quantity ?? 0
  const maxQuantity = Math.max(0, Math.min(edition.available, MAX_PER_EDITION) - inCart)
  const [requested, setRequested] = useState(1)
  // Stock can drop while the page is open (realtime); the stepper never goes past it.
  const quantity = Math.min(requested, Math.max(1, maxQuantity))
  const soldOut = edition.available === 0
  const limitReached = !soldOut && maxQuantity === 0

  const buy = () =>
    add.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      { onSuccess: () => void navigate({ to: '/cart' }) },
    )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[26px] font-bold md:text-[28px]">{nft.name}</h1>
        <div className="border-border-soft mt-2 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <p className="text-brand text-[22px] font-bold" data-testid="detail-price">
            {formatEth(edition.priceEth)}
          </p>
          <p className="flex items-center gap-2 text-[15px]">
            <span className="text-brand flex" aria-hidden>
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={index}
                  className={cn('size-4', index < Math.round(nft.rating.average) && 'fill-current')}
                />
              ))}
            </span>
            <span>
              <span className="sr-only">
                Nota {nft.rating.average.toFixed(1).replace('.', ',')} de 5,{' '}
              </span>
              {nft.rating.count} avaliações de colecionadores
            </span>
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-[15px] font-bold">Sobre este NFT:</h2>
        <p className="text-sand mt-2 text-[15px] leading-6">{nft.description}</p>
      </div>

      <fieldset>
        <legend className="mb-2 text-[15px] font-bold">Edição:</legend>
        <div className="flex flex-wrap gap-2">
          {nft.editions.map((item) => {
            const disabled = item.available === 0
            return (
              <label
                key={item.id}
                className={cn(
                  'has-[:focus-visible]:outline-amber cursor-pointer rounded-full border px-2.5 py-1 text-[15px] has-[:focus-visible]:outline-2',
                  item.id === edition.id
                    ? 'border-brand bg-surface-dark text-brand'
                    : 'border-border-soft text-sand',
                  disabled && 'cursor-not-allowed line-through opacity-50',
                )}
              >
                <input
                  type="radio"
                  name="edition"
                  value={item.id}
                  checked={item.id === edition.id}
                  disabled={disabled}
                  onChange={() => {
                    setEditionId(item.id)
                    setRequested(1)
                  }}
                  className="sr-only"
                />
                {item.label.toUpperCase()}
                {disabled && <span className="sr-only"> (esgotada)</span>}
              </label>
            )
          })}
        </div>
        <p className="text-sand mt-2 text-sm" aria-live="polite">
          {soldOut
            ? 'Esta edição está esgotada.'
            : `${edition.available} ${edition.available === 1 ? 'disponível' : 'disponíveis'} · máximo de ${MAX_PER_EDITION} por pedido${inCart ? ` · ${inCart} no carrinho` : ''}`}
        </p>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <QuantityStepper
          label="Quantidade"
          value={soldOut || limitReached ? 0 : quantity}
          min={1}
          max={maxQuantity}
          disabled={soldOut || limitReached}
          onChange={setRequested}
        />
        <div className="flex gap-2">
          <Button
            size="lg"
            className="h-10 px-9 font-bold"
            disabled={soldOut || limitReached || add.isPending}
            onClick={buy}
          >
            {add.isPending ? 'Adicionando…' : soldOut ? 'ESGOTADO' : 'COMPRAR'}
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-brand text-foreground h-10 gap-2 bg-transparent text-[15px]"
            aria-pressed={isFavorite}
            onClick={() => toggleFavorite(nft.id, !isFavorite)}
          >
            <Heart className={cn('text-brand size-5', isFavorite && 'fill-current')} aria-hidden />
            {isFavorite ? 'Favoritado' : 'Favoritar'}
          </Button>
        </div>
      </div>
      {limitReached && (
        <p className="text-amber text-sm">
          Você já tem a quantidade máxima desta edição no carrinho.
        </p>
      )}

      <dl className="text-sand flex flex-col gap-2 text-[15px]">
        <div className="flex gap-2">
          <dt>ID do token:</dt>
          <dd>{nft.tokenId}</dd>
        </div>
        <div className="flex gap-2">
          <dt>Coleção:</dt>
          <dd>{nft.collection}</dd>
        </div>
        <div className="flex gap-2">
          <dt>Categoria:</dt>
          <dd>{categoryLabels[nft.category]}</dd>
        </div>
        <div className="flex gap-2">
          <dt>Rede:</dt>
          <dd>{networkLabels[nft.network]}</dd>
        </div>
        <div className="flex gap-2">
          <dt>Atributos:</dt>
          <dd>{nft.attributes.join(', ')}</dd>
        </div>
      </dl>
      <ShareLinks name={nft.name} />
    </div>
  )
}

function ShareLinks({ name }: { name: string }) {
  const url = typeof window === 'undefined' ? '' : window.location.href
  const text = encodeURIComponent(`Veja ${name} na Kurio`)
  const encodedUrl = encodeURIComponent(url)
  const links = [
    {
      label: 'LinkedIn',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    { label: 'e-mail', href: `mailto:?subject=${text}&body=${encodedUrl}` },
    {
      label: 'X (Twitter)',
      href: `https://twitter.com/intent/tweet?text=${text}&url=${encodedUrl}`,
    },
  ]
  return (
    <p className="flex flex-wrap items-center gap-3 text-[15px] font-bold">
      Compartilhar este NFT:
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand font-normal underline-offset-4 hover:underline"
        >
          {link.label}
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      ))}
    </p>
  )
}
