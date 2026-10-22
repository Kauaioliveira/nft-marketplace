import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { currentUserId, unauthorized } from '../domain'
import { errorResponse, simulateNetwork } from '../network'

export const favoriteHandlers = [
  http.get('*/api/favorites', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const userId = currentUserId(request)
    if (!userId) return unauthorized()
    return HttpResponse.json({ nftIds: db.read().favorites[userId] ?? [] })
  }),

  // PUT and DELETE are idempotent, so a retried click never toggles twice.
  http.put('*/api/favorites/:nftId', async ({ request, params }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const userId = currentUserId(request)
    if (!userId) return unauthorized()
    const nftId = String(params.nftId)
    if (!db.read().nfts.some((nft) => nft.id === nftId)) {
      return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
    }
    const nftIds = db.write((state) => {
      const current = new Set(state.favorites[userId] ?? [])
      current.add(nftId)
      state.favorites[userId] = [...current]
      return state.favorites[userId]
    })
    return HttpResponse.json({ nftIds })
  }),

  http.delete('*/api/favorites/:nftId', async ({ request, params }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const userId = currentUserId(request)
    if (!userId) return unauthorized()
    const nftIds = db.write((state) => {
      state.favorites[userId] = (state.favorites[userId] ?? []).filter((id) => id !== params.nftId)
      return state.favorites[userId]
    })
    return HttpResponse.json({ nftIds })
  }),
]
