import Big from 'big.js'
import { http, HttpResponse } from 'msw'
import { db } from '../db'
import { errorResponse } from '../network'
import { publishNftUpdated } from '../realtime'
import { isScenarioName, scenario } from '../scenarios'

/**
 * Control endpoints for the demo panel and the E2E tests. They only exist inside the mock layer,
 * so the production API contract is not affected.
 */
export const devHandlers = [
  http.get('*/api/__dev/scenario', () => HttpResponse.json({ scenario: scenario.get() })),

  http.post('*/api/__dev/reset', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { scenario?: unknown }
    const next = body.scenario ?? 'default'
    if (!isScenarioName(next)) return errorResponse(422, 'VALIDATION', 'Cenário desconhecido.')
    scenario.set(next)
    db.reset()
    return HttpResponse.json({ scenario: next })
  }),

  // Changes a price in the db and emits the matching `nft.updated` event, like a real backend would.
  http.post('*/api/__dev/nfts/:id/bump-price', ({ params }) => {
    const updated = db.write((state) => {
      const nft = state.nfts.find((item) => item.id === params.id)
      if (!nft) return null
      const priceEth = new Big(nft.priceEth).times('1.1').round(4, Big.roundHalfUp).toFixed()
      nft.priceEth = priceEth
      nft.editions = nft.editions.map((edition, index) =>
        index === 0 ? { ...edition, priceEth } : edition,
      )
      nft.version += 1
      return { ...nft }
    })
    if (!updated) return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
    publishNftUpdated(updated)
    return HttpResponse.json(updated)
  }),
]
