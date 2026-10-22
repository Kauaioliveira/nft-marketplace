import { delay, HttpResponse } from 'msw'
import { scenario } from './scenarios'

/** mulberry32: tiny seeded PRNG so "random" latency is the same on every run. */
function createRandom(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = createRandom(42)
let requestCount = 0

export function errorResponse(
  status: number,
  code: string,
  message: string,
  extra: { fields?: Record<string, string>; details?: unknown } = {},
) {
  return HttpResponse.json({ error: { code, message, ...extra } }, { status })
}

type FailRule = { method: string; path: string; status: number }

/** One-shot failures armed by the tests or the demo panel (`POST /api/__dev/fail-next`). */
const failRules: FailRule[] = []

export function armFailure(rule: FailRule) {
  failRules.push(rule)
}

export function clearFailures() {
  failRules.length = 0
}

function takeFailRule(request: Request) {
  const { pathname } = new URL(request.url)
  const index = failRules.findIndex(
    (rule) => rule.method === request.method && pathname.endsWith(rule.path),
  )
  if (index === -1) return null
  return failRules.splice(index, 1)[0] ?? null
}

/**
 * Applies the active scenario's network conditions before a handler runs.
 * Returns a response when the request must fail, or null to let the handler continue.
 */
export async function simulateNetwork(request: Request): Promise<Response | null> {
  requestCount += 1
  const name = scenario.get()

  const rule = takeFailRule(request)
  if (rule) {
    await delay(150)
    if (rule.status === 0) return HttpResponse.error()
    const code = rule.status >= 500 ? 'TRANSIENT' : 'VALIDATION'
    return errorResponse(rule.status, code, 'Falha simulada.')
  }

  if (name === 'offline') return HttpResponse.error()

  if (name === 'slow') {
    await delay(2500)
  } else if (name === 'flaky') {
    // Alternating long and short delays makes responses arrive out of order.
    await delay(requestCount % 2 === 0 ? 1200 : 150)
    if (requestCount % 3 === 0) {
      return errorResponse(503, 'TRANSIENT', 'Serviço temporariamente indisponível.')
    }
  } else {
    await delay(80 + Math.round(random() * 220))
  }
  return null
}
