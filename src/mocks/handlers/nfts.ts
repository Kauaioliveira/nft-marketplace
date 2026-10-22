import Big from 'big.js'
import { http, HttpResponse } from 'msw'
import { nftCategorySchema, nftSortSchema, type Nft } from '@/api/contracts'
import { db } from '../db'
import { errorResponse, simulateNetwork } from '../network'
import { scenario } from '../scenarios'

const MAX_PAGE_SIZE = 48

function sortNfts(nfts: Nft[], sort: string) {
  const sorted = [...nfts]
  switch (sort) {
    case 'price-asc':
      return sorted.sort((a, b) => new Big(a.priceEth).cmp(b.priceEth))
    case 'price-desc':
      return sorted.sort((a, b) => new Big(b.priceEth).cmp(a.priceEth))
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    default:
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}

export const nftHandlers = [
  http.get('*/api/nfts', async ({ request }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
    const categories = (url.searchParams.get('category') ?? '')
      .split(',')
      .filter((value) => nftCategorySchema.safeParse(value).success)
    const sortParam = nftSortSchema.safeParse(url.searchParams.get('sort'))
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(url.searchParams.get('pageSize')) || 12),
    )

    const source = scenario.get() === 'empty' ? [] : db.read().nfts
    const filtered = source.filter(
      (nft) =>
        (!q || `${nft.name} ${nft.collection} ${nft.creator.name}`.toLowerCase().includes(q)) &&
        (categories.length === 0 || categories.includes(nft.category)),
    )
    const sorted = sortNfts(filtered, sortParam.success ? sortParam.data : 'recent')
    const start = (page - 1) * pageSize

    return HttpResponse.json({
      items: sorted.slice(start, start + pageSize),
      page,
      pageSize,
      total: sorted.length,
      totalPages: Math.max(1, Math.ceil(sorted.length / pageSize)),
    })
  }),

  http.get('*/api/nfts/:id', async ({ params }) => {
    const failure = await simulateNetwork()
    if (failure) return failure

    const nft = db.read().nfts.find((item) => item.id === params.id)
    if (!nft) return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
    return HttpResponse.json(nft)
  }),
]
