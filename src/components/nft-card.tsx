import { Link } from '@tanstack/react-router'
import { Heart } from 'lucide-react'
import type { Nft } from '@/api/contracts'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/money'
import { cn } from '@/lib/utils'

type NftCardProps = {
  nft: Nft
  favorite?: boolean
  onToggleFavorite?: (nftId: string, favorite: boolean) => void
  /** The first cards of a page are above the fold, so they skip lazy loading. */
  priority?: boolean
}

export function NftCard({ nft, favorite = false, onToggleFavorite, priority }: NftCardProps) {
  return (
    <article className="group relative flex flex-col gap-3" data-testid="nft-card">
      <div className="bg-surface-card relative p-1 md:p-2">
        {nft.rare && (
          <span className="bg-brand text-ink absolute top-3 left-0 z-10 px-3 py-1 text-sm font-bold">
            RARO
          </span>
        )}
        <img
          src={nft.images[0]}
          alt={`Arte do NFT ${nft.name}`}
          width={400}
          height={400}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="aspect-square w-full rounded-2xl object-cover"
        />
        {onToggleFavorite && (
          <button
            type="button"
            aria-pressed={favorite}
            aria-label={favorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
            onClick={() => onToggleFavorite(nft.id, !favorite)}
            className="bg-ink/80 text-brand hover:bg-ink focus-visible:outline-amber absolute top-3 right-3 z-10 grid size-10 place-items-center rounded-full transition focus-visible:outline-2"
          >
            <Heart className={cn('size-5', favorite && 'fill-current')} aria-hidden />
          </button>
        )}
      </div>
      <div>
        <h3 className="text-base">
          <Link
            to="/nfts/$nftId"
            params={{ nftId: nft.id }}
            className="hover:text-brand after:absolute after:inset-0 focus-visible:outline-none"
          >
            {nft.name}
          </Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-2">
          <span className="text-brand font-bold" data-testid={`price-${nft.id}`}>
            {formatEth(nft.priceEth)}
          </span>
          {nft.compareAtPriceEth && (
            <s className="text-sand">
              <span className="sr-only">Preço anterior: </span>
              {formatEth(nft.compareAtPriceEth)}
            </s>
          )}
        </p>
      </div>
    </article>
  )
}

/** Same footprint as NftCard, so the grid does not jump when data arrives. */
export function NftCardSkeleton() {
  return (
    <div className="flex flex-col gap-3" data-testid="nft-card-skeleton">
      <div className="bg-surface-card p-1 md:p-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-5 w-1/3" />
    </div>
  )
}
