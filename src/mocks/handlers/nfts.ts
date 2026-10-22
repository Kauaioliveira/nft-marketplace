import Big from 'big.js'
import { http, HttpResponse } from 'msw'
import {
  networkSchema,
  nftCategorySchema,
  nftSortSchema,
  nftTabSchema,
  type Nft,
} from '@/api/contracts'
import { db } from '../db'
import { errorResponse, simulateNetwork } from '../network'
import { scenario } from '../scenarios'

const MAX_PAGE_SIZE = 48
const NEW_RELEASE_DAYS = 14
const DECIMAL = /^\d+(\.\d+)?$/

function sortNfts(nfts: Nft[], sort: string) {
  const sorted = [...nfts]
  switch (sort) {
    case 'price-asc':
      return sorted.sort((a, b) => new Big(a.priceEth).cmp(b.priceEth) || a.id.localeCompare(b.id))
    case 'price-desc':
      return sorted.sort((a, b) => new Big(b.priceEth).cmp(a.priceEth) || a.id.localeCompare(b.id))
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    default:
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}

function countBy<T extends string>(items: Nft[], key: (nft: Nft) => T) {
  return items.reduce<Record<string, number>>((acc, nft) => {
    const value = key(nft)
    acc[value] = (acc[value] ?? 0) + 1
    return acc
  }, {})
}

function parseList<T>(value: string | null, parse: (item: string) => T | null) {
  return (value ?? '')
    .split(',')
    .map(parse)
    .filter((item): item is T => item !== null)
}

export const nftHandlers = [
  http.get('*/api/nfts', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure

    const url = new URL(request.url)
    const params = url.searchParams
    const q = params.get('q')?.trim().toLowerCase() ?? ''
    const tab = nftTabSchema.catch('all').parse(params.get('tab'))
    const categories = parseList(
      params.get('category'),
      (v) => nftCategorySchema.safeParse(v).data ?? null,
    )
    const networks = parseList(
      params.get('network'),
      (v) => networkSchema.safeParse(v).data ?? null,
    )
    const minPrice = params.get('minPrice')
    const maxPrice = params.get('maxPrice')
    const sort = nftSortSchema.catch('recent').parse(params.get('sort'))
    const page = Math.max(1, Number(params.get('page')) || 1)
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.get('pageSize')) || 9))

    if ((minPrice && !DECIMAL.test(minPrice)) || (maxPrice && !DECIMAL.test(maxPrice))) {
      return errorResponse(422, 'VALIDATION', 'Faixa de preço inválida.')
    }

    const source = scenario.get() === 'empty' ? [] : db.read().nfts
    const newest = source.reduce((max, nft) => (nft.createdAt > max ? nft.createdAt : max), '')
    const newSince = newest ? new Date(newest).getTime() - NEW_RELEASE_DAYS * 86_400_000 : 0

    // Search, tab and price apply to everything; facet counts ignore their own filter so the
    // sidebar shows how many results each option would add.
    const base = source.filter(
      (nft) =>
        (!q || `${nft.name} ${nft.collection} ${nft.creator}`.toLowerCase().includes(q)) &&
        (tab !== 'new' || new Date(nft.createdAt).getTime() >= newSince) &&
        (tab !== 'trending' || nft.trending) &&
        (!minPrice || new Big(nft.priceEth).gte(minPrice)) &&
        (!maxPrice || new Big(nft.priceEth).lte(maxPrice)),
    )
    const byCategory = (nft: Nft) => categories.length === 0 || categories.includes(nft.category)
    const byNetwork = (nft: Nft) => networks.length === 0 || networks.includes(nft.network)

    const filtered = base.filter((nft) => byCategory(nft) && byNetwork(nft))
    const sorted = sortNfts(filtered, sort)
    const start = (page - 1) * pageSize

    return HttpResponse.json({
      items: sorted.slice(start, start + pageSize),
      page,
      pageSize,
      total: sorted.length,
      totalPages: Math.max(1, Math.ceil(sorted.length / pageSize)),
      facets: {
        category: countBy(base.filter(byNetwork), (nft) => nft.category),
        network: countBy(base.filter(byCategory), (nft) => nft.network),
      },
    })
  }),

  http.get('*/api/nfts/:id', async ({ request, params }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure

    const nft = db.read().nfts.find((item) => item.id === params.id)
    if (!nft) return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
    return HttpResponse.json(nft)
  }),
]
