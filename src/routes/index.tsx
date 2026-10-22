import { createFileRoute } from '@tanstack/react-router'
import { useCallback } from 'react'
import { nftListQuery } from '@/api/nfts'
import { CatalogSection } from '@/features/catalog/catalog-section'
import { HomeEditorial } from '@/features/catalog/home-editorial'
import { HomeHero } from '@/features/catalog/home-hero'
import { catalogSearchSchema, toListParams, type CatalogSearch } from '@/features/catalog/search'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => toListParams(search),
  // Starts the request during navigation; the component reads the same cache entry.
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(nftListQuery(deps))
  },
  component: HomePage,
})

function HomePage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const onSearchChange = useCallback(
    (patch: Partial<CatalogSearch>) => {
      void navigate({
        search: (previous) => ({ ...previous, ...patch }),
        // Keeps the catalog in view instead of jumping to the top on each filter change.
        resetScroll: false,
      })
    },
    [navigate],
  )

  return (
    <>
      <HomeHero />
      <div className="mt-16 md:mt-24">
        <CatalogSection search={search} onSearchChange={onSearchChange} />
      </div>
      <HomeEditorial />
    </>
  )
}
