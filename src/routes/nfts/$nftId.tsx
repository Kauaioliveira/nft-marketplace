import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { nftDetailQuery } from '@/api/nfts'
import { NotFound } from '@/components/not-found'
import { PagePlaceholder } from '@/components/page-placeholder'

export const Route = createFileRoute('/nfts/$nftId')({
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  const { data, error, isPending } = useQuery(nftDetailQuery(nftId))

  if (error?.code === 'NOT_FOUND') return <NotFound />
  return (
    <PagePlaceholder title={data?.name ?? 'Detalhes do NFT'}>
      {isPending && <p className="text-sand mt-4">Carregando…</p>}
    </PagePlaceholder>
  )
}
