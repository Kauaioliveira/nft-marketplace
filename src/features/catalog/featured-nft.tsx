import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { nftDetailQuery } from '@/api/nfts'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/money'

const FEATURED_NFT_ID = 'nft-3'

/** "NFT em destaque" card of the sidebar. */
export function FeaturedNft() {
  const { data, isPending, isError } = useQuery(nftDetailQuery(FEATURED_NFT_ID))
  if (isError) return null

  return (
    <section
      aria-labelledby="featured-title"
      className="overflow-hidden bg-[linear-gradient(180deg,var(--color-surface-dark),var(--color-surface-card))]"
    >
      <div className="px-5 pt-6">
        <h2 id="featured-title" className="text-brand text-[26px] font-bold uppercase">
          NFT em destaque
        </h2>
        <p className="mt-2 text-center text-xl font-bold uppercase">Oferta limitada</p>
      </div>
      {isPending ? (
        <Skeleton className="mt-4 aspect-[310/366] w-full rounded-3xl" />
      ) : (
        <Link to="/nfts/$nftId" params={{ nftId: data.id }} className="group mt-4 block">
          <img
            src={data.images[0]}
            alt={`Arte do NFT ${data.name}`}
            width={310}
            height={366}
            loading="lazy"
            className="aspect-[310/366] w-full rounded-3xl object-cover"
          />
          <span className="group-hover:text-brand block px-5 py-4">
            {data.name} · <strong className="text-brand">{formatEth(data.priceEth)}</strong>
          </span>
        </Link>
      )}
    </section>
  )
}
