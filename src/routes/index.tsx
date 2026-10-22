import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { nftListQuery } from '@/api/nfts'
import { PagePlaceholder } from '@/components/page-placeholder'
import { formatEth } from '@/lib/money'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { data, isPending, isError, refetch } = useQuery(nftListQuery({ page: 1, pageSize: 12 }))

  return (
    <PagePlaceholder title="Catálogo">
      {isPending && <p className="text-sand mt-4">Carregando NFTs…</p>}
      {isError && (
        <p className="text-sand mt-4">
          Não foi possível carregar o catálogo.{' '}
          <button className="underline" onClick={() => void refetch()}>
            Tentar novamente
          </button>
        </p>
      )}
      {data && (
        <>
          <p className="text-sand mt-2 text-sm">{data.total} NFTs encontrados</p>
          <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4" aria-label="NFTs">
            {data.items.map((nft) => (
              <li key={nft.id} className="bg-surface-card rounded-lg p-4">
                <Link to="/nfts/$nftId" params={{ nftId: nft.id }} className="font-bold">
                  {nft.name}
                </Link>
                <p className="text-accent-text text-sm" data-testid={`price-${nft.id}`}>
                  {formatEth(nft.priceEth)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </PagePlaceholder>
  )
}
