import Big from 'big.js'
import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { db } from '../db'
import { armFailure, clearFailures, errorResponse } from '../network'
import { dropConnections, publishNftUpdated, replayLastEvent } from '../realtime'
import { isScenarioName, scenario } from '../scenarios'

/** Index of the edition whose price is shown on the catalog card (1/50). */
const DEFAULT_EDITION = 2

const failNextSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
  path: z.string().startsWith('/api/'),
  /** 0 simulates a network error instead of an HTTP status. */
  status: z.number().int(),
})

/**
 * Control endpoints for the demo panel and the E2E tests. They only exist inside the mock layer,
 * so the production API contract is not affected.
 */
export const devHandlers = [
  http.get('*/api/__dev/scenario', () => HttpResponse.json({ scenario: scenario.get() })),

  // Lets tests assert side effects, such as "only one order was created".
  http.get('*/api/__dev/stats', () =>
    HttpResponse.json({ orders: Object.keys(db.read().orders).length }),
  ),

  http.post('*/api/__dev/reset', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { scenario?: unknown }
    const next = body.scenario ?? 'default'
    if (!isScenarioName(next)) return errorResponse(422, 'VALIDATION', 'Cenário desconhecido.')
    scenario.set(next)
    clearFailures()
    db.reset()
    return HttpResponse.json({ scenario: next })
  }),

  // Changes a price in the db and emits the matching `nft.updated` event, like a real backend would.
  http.post('*/api/__dev/nfts/:id/bump-price', ({ params }) => {
    const updated = db.write((state) => {
      const nft = state.nfts.find((item) => item.id === params.id)
      const edition = nft?.editions[DEFAULT_EDITION]
      if (!nft || !edition) return null
      edition.priceEth = new Big(edition.priceEth).times('1.1').round(4, Big.roundHalfUp).toFixed()
      nft.priceEth = edition.priceEth
      nft.version += 1
      return structuredClone(nft)
    })
    if (!updated) return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
    publishNftUpdated(updated)
    return HttpResponse.json(updated)
  }),

  // Emits an event older than the current version: clients must ignore it.
  http.post('*/api/__dev/nfts/:id/stale-event', ({ params }) => {
    const nft = db.read().nfts.find((item) => item.id === params.id)
    if (!nft) return errorResponse(404, 'NOT_FOUND', 'NFT não encontrado.')
    const stale = structuredClone(nft)
    stale.priceEth = '0.0001'
    publishNftUpdated(stale, Math.max(0, nft.version - 1))
    return HttpResponse.json({ sentVersion: nft.version - 1 })
  }),

  http.post('*/api/__dev/replay-last-event', () => {
    const event = replayLastEvent()
    return HttpResponse.json({ replayed: event?.eventId ?? null })
  }),

  http.post('*/api/__dev/drop-socket', () => {
    dropConnections()
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/api/__dev/expire-sessions', () => {
    db.write((state) => {
      state.sessions = {}
    })
    return new HttpResponse(null, { status: 204 })
  }),

  http.post('*/api/__dev/fail-next', async ({ request }) => {
    const parsed = failNextSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return errorResponse(422, 'VALIDATION', 'Regra de falha inválida.')
    armFailure(parsed.data)
    return new HttpResponse(null, { status: 204 })
  }),
]
