import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { nftDetailQuery, nftListQuery } from '@/api/nfts'
import { NftCard, NftCardSkeleton } from '@/components/nft-card'
import { NotFound } from '@/components/not-found'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useFavorites, useToggleFavorite } from '@/features/favorites/use-favorites'
import { NftGallery } from '@/features/nft/nft-gallery'
import { NftPurchasePanel } from '@/features/nft/nft-purchase-panel'
import { networkLabels } from '@/lib/labels'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/nfts/$nftId')({
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftDetailQuery(params.nftId))
  },
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const { data: nft, error, isPending, refetch, isFetching } = useQuery(nftDetailQuery(nftId))

  if (error?.code === 'NOT_FOUND') {
    return (
      <NotFound
        title="NFT não encontrado"
        description="Este NFT não existe ou foi removido do catálogo."
      />
    )
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-8 md:px-10 xl:px-[120px]">
      <nav aria-label="Trilha de navegação" className="mb-4 text-[15px] font-bold">
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
          <li aria-current="page" className="text-sand">
            {nft?.name ?? '…'}
          </li>
        </ol>
      </nav>

      {isPending && <DetailSkeleton />}
      {error && !nft && (
        <div
          role="alert"
          className="bg-surface-card flex flex-col items-start gap-3 rounded-lg p-6"
        >
          <p className="font-bold">Não foi possível carregar este NFT.</p>
          <p className="text-sand">{error.message}</p>
          <Button onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? 'Tentando…' : 'Tentar novamente'}
          </Button>
        </div>
      )}
      {nft && (
        <>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,572px)_1fr]">
            <NftGallery images={nft.images} name={nft.name} />
            <NftPurchasePanel key={nft.id} nft={nft} />
          </div>
          <DetailTabs
            description={nft.description}
            network={networkLabels[nft.network]}
            reviews={nft.rating.count}
            creator={nft.creator}
          />
          <RelatedNfts currentId={nft.id} />
        </>
      )}
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando NFT"
      className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,572px)_1fr]"
    >
      <div className="grid grid-cols-[100px_1fr] gap-7 max-md:grid-cols-1">
        <div className="grid grid-cols-4 gap-3 max-md:order-2 md:flex md:flex-col md:gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="aspect-square w-full md:size-[100px]" />
          ))}
        </div>
        <Skeleton className="aspect-square w-full rounded-[24px]" />
      </div>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-7 w-1/4" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

function DetailTabs(props: {
  description: string
  network: string
  reviews: number
  creator: string
}) {
  const [tab, setTab] = useState<'details' | 'reviews'>('details')
  const tabs = [
    { id: 'details' as const, label: 'Detalhes do NFT' },
    { id: 'reviews' as const, label: `Avaliações de colecionadores (${props.reviews})` },
  ]
  return (
    <section className="mt-16" aria-label="Informações adicionais">
      <div role="tablist" className="border-border-soft flex gap-8 overflow-x-auto border-b">
        {tabs.map((item) => (
          <button
            key={item.id}
            id={`tab-${item.id}`}
            role="tab"
            type="button"
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            onClick={() => setTab(item.id)}
            className={cn(
              '-mb-px border-b-2 pb-2 text-lg whitespace-nowrap md:text-xl',
              tab === item.id ? 'border-brand text-brand' : 'hover:text-brand border-transparent',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'details' ? (
        <div
          id="panel-details"
          role="tabpanel"
          aria-labelledby="tab-details"
          className="text-sand mt-4 space-y-4 text-[15px] leading-6"
        >
          <p>{props.description}</p>
          <p>
            A propriedade inclui a arte em alta resolução, lançamentos exclusivos para
            colecionadores e um registro permanente de procedência. {props.creator} recebe 5% de
            direitos autorais nas vendas secundárias.
          </p>
          <div>
            <h3 className="text-foreground font-bold">Rede:</h3>
            <p>
              Cunhado na {props.network} com procedência imutável e metadados armazenados no IPFS
              (simulado).
            </p>
          </div>
          <div>
            <h3 className="text-foreground font-bold">Contrato:</h3>
            <p>Contrato inteligente ERC-721 simulado para esta demonstração.</p>
          </div>
        </div>
      ) : (
        <div
          id="panel-reviews"
          role="tabpanel"
          aria-labelledby="tab-reviews"
          className="text-sand mt-4 text-[15px]"
        >
          <p>
            As avaliações detalhadas dos colecionadores ainda não fazem parte desta demonstração.
          </p>
        </div>
      )}
    </section>
  )
}

function RelatedNfts({ currentId }: { currentId: string }) {
  const { data, isPending } = useQuery(nftListQuery({ pageSize: 6, sort: 'recent', page: 1 }))
  const { ids: favorites } = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const items = (data?.items ?? []).filter((item) => item.id !== currentId).slice(0, 5)

  return (
    <section aria-labelledby="related-title" className="mt-16">
      <h2
        id="related-title"
        className="border-border-soft text-brand border-b pb-3 text-lg font-bold"
      >
        Mais desta coleção
      </h2>
      <ul className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {isPending
          ? Array.from({ length: 5 }, (_, index) => (
              <li key={index}>
                <NftCardSkeleton />
              </li>
            ))
          : items.map((item) => (
              <li key={item.id}>
                <NftCard
                  nft={item}
                  favorite={favorites.has(item.id)}
                  onToggleFavorite={toggleFavorite}
                />
              </li>
            ))}
      </ul>
    </section>
  )
}
