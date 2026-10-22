import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { SlidersHorizontal, Search, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { nftSortOptions, nftTabs, type NftList, type NftSort } from '@/api/contracts'
import { nftListQuery } from '@/api/nfts'
import { NftCard, NftCardSkeleton } from '@/components/nft-card'
import { Pagination } from '@/components/pagination'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useFavorites, useToggleFavorite } from '@/features/favorites/use-favorites'
import { sortLabels, tabLabels } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { CatalogFilters } from './catalog-filters'
import { FeaturedNft } from './featured-nft'
import { CATALOG_PAGE_SIZE, toListParams, type CatalogSearch } from './search'

type CatalogSectionProps = {
  search: CatalogSearch
  /** Applies a change to the URL. Any change other than `page` sends the user back to page 1. */
  onSearchChange: (patch: Partial<CatalogSearch>) => void
}

export function CatalogSection({ search, onSearchChange }: CatalogSectionProps) {
  const params = toListParams(search)
  // keepPreviousData shows the last page while the next one loads; the query key holds every
  // param, so a slow old response can never be shown for newer filters.
  const query = useQuery({ ...nftListQuery(params), placeholderData: keepPreviousData })
  const { ids: favoriteIds } = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const headingRef = useRef<HTMLHeadingElement>(null)

  const changeFilters = (patch: Partial<CatalogSearch>) =>
    onSearchChange({ ...patch, page: undefined })
  const goToPage = (page: number) => {
    onSearchChange({ page: page > 1 ? page : undefined })
    headingRef.current?.scrollIntoView({ block: 'start' })
    headingRef.current?.focus({ preventScroll: true })
  }
  const activeFilters =
    (search.category?.length ?? 0) +
    (search.network?.length ?? 0) +
    (search.minPrice || search.maxPrice ? 1 : 0)

  return (
    <section
      id="catalogo"
      aria-labelledby="catalog-title"
      className="mx-auto grid max-w-[1440px] scroll-mt-4 grid-cols-1 gap-8 px-4 md:px-10 lg:grid-cols-[310px_1fr] lg:gap-12 xl:px-[120px]"
    >
      <h2 id="catalog-title" ref={headingRef} tabIndex={-1} className="sr-only">
        Catálogo de NFTs
      </h2>

      <aside className="hidden flex-col gap-6 lg:flex" aria-label="Filtros do catálogo">
        <CatalogFilters search={search} facets={query.data?.facets} onChange={changeFilters} />
        <FeaturedNft />
      </aside>

      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex gap-3">
          <SearchField
            value={search.q ?? ''}
            onChange={(q) => changeFilters({ q: q || undefined })}
          />
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="default"
                  className="h-11 gap-2 rounded-xl px-4 lg:hidden"
                  aria-label={`Filtros${activeFilters ? `, ${activeFilters} ativos` : ''}`}
                />
              }
            >
              <SlidersHorizontal className="size-5" aria-hidden />
              {activeFilters > 0 && <span aria-hidden>{activeFilters}</span>}
            </SheetTrigger>
            <SheetContent side="left" className="bg-ink w-[320px] overflow-y-auto p-0">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <CatalogFilters
                search={search}
                facets={query.data?.facets}
                onChange={changeFilters}
              />
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div
            role="tablist"
            aria-label="Seleção do catálogo"
            className="flex max-w-full gap-5 overflow-x-auto"
          >
            {nftTabs.map((tab) => {
              const selected = (search.tab ?? 'all') === tab
              return (
                <button
                  key={tab}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  onClick={() => changeFilters({ tab: tab === 'all' ? undefined : tab })}
                  className={cn(
                    'border-b-2 pb-1 text-base whitespace-nowrap md:text-[17px]',
                    selected ? 'border-brand text-brand' : 'hover:text-brand border-transparent',
                  )}
                >
                  {tabLabels[tab]}
                </button>
              )
            })}
          </div>
          <label className="flex items-center gap-2 text-[15px]">
            Ordenar por:
            <select
              value={search.sort ?? 'recent'}
              onChange={(event) => {
                const sort = event.target.value as NftSort
                changeFilters({ sort: sort === 'recent' ? undefined : sort })
              }}
              className="border-input bg-ink rounded-md border px-2 py-1"
            >
              {nftSortOptions.map((option) => (
                <option key={option} value={option}>
                  {sortLabels[option]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <CatalogResults
          query={query}
          hasFilters={activeFilters > 0 || Boolean(search.q) || Boolean(search.tab)}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
          onClearFilters={() =>
            onSearchChange({
              q: undefined,
              category: undefined,
              network: undefined,
              minPrice: undefined,
              maxPrice: undefined,
              tab: undefined,
              page: undefined,
            })
          }
        />

        {query.data && (
          <Pagination
            page={query.data.page}
            totalPages={query.data.totalPages}
            onPageChange={goToPage}
          />
        )}
      </div>
    </section>
  )
}

function CatalogResults(props: {
  query: UseQueryResult<NftList>
  favoriteIds: Set<string>
  onToggleFavorite: (nftId: string, favorite: boolean) => void
  onClearFilters: () => void
  hasFilters: boolean
}) {
  const { query } = props

  if (query.isPending) {
    return (
      <div
        role="status"
        aria-label="Carregando NFTs"
        className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-8"
      >
        {Array.from({ length: CATALOG_PAGE_SIZE }, (_, index) => (
          <NftCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (query.isError && !query.data) {
    return (
      <div role="alert" className="bg-surface-card flex flex-col items-start gap-3 rounded-lg p-6">
        <p className="font-bold">Não foi possível carregar o catálogo.</p>
        <p className="text-sand">{query.error.message}</p>
        <Button onClick={() => void query.refetch()} disabled={query.isFetching}>
          {query.isFetching ? 'Tentando…' : 'Tentar novamente'}
        </Button>
      </div>
    )
  }

  const data = query.data!
  if (data.items.length === 0) {
    return (
      <div className="bg-surface-card flex flex-col items-start gap-3 rounded-lg p-6" role="status">
        <p className="font-bold">Nenhum NFT encontrado.</p>
        <p className="text-sand">Tente outra busca ou remova alguns filtros.</p>
        <Button variant="outline" onClick={props.onClearFilters}>
          Limpar filtros
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sand text-sm" aria-live="polite">
          {data.total} {data.total === 1 ? 'NFT encontrado' : 'NFTs encontrados'}
          {query.isFetching && ' · atualizando…'}
        </p>
        {props.hasFilters && (
          <button
            type="button"
            onClick={props.onClearFilters}
            className="text-brand text-sm underline-offset-4 hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>
      {query.isError && (
        <p role="alert" className="text-coral text-sm">
          Não foi possível atualizar a lista. Exibindo o último resultado.{' '}
          <button className="underline" onClick={() => void query.refetch()}>
            Tentar novamente
          </button>
        </p>
      )}
      <ul
        aria-label="NFTs"
        className={cn(
          'grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-8',
          query.isPlaceholderData && 'opacity-60',
        )}
      >
        {data.items.map((nft, index) => (
          <li key={nft.id}>
            <NftCard
              nft={nft}
              priority={index < 3}
              favorite={props.favoriteIds.has(nft.id)}
              onToggleFavorite={props.onToggleFavorite}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function SearchField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  // The URL is the source of truth: back/forward must update the field.
  const [syncedValue, setSyncedValue] = useState(value)
  if (value !== syncedValue) {
    setSyncedValue(value)
    setDraft(value)
  }

  // Debounced so typing does not create one history entry and one request per key.
  useEffect(() => {
    if (draft.trim() === value) return
    const timer = setTimeout(() => onChangeRef.current(draft.trim()), 350)
    return () => clearTimeout(timer)
  }, [draft, value])

  return (
    <div className="relative flex-1">
      <label htmlFor="catalog-search" className="sr-only">
        Buscar NFTs
      </label>
      <Search
        className="text-sand pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
        aria-hidden
      />
      <input
        id="catalog-search"
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Explorar coleções"
        className="bg-surface-card placeholder:text-sand h-11 w-full rounded-xl pr-10 pl-12 text-base [&::-webkit-search-cancel-button]:hidden"
      />
      {draft && (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => setDraft('')}
          className="text-sand hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  )
}
