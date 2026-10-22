/**
 * Readable query strings for the router. The default serializer writes JSON
 * (`?category=["music"]&minPrice="0.5"`); this one writes `?category=music,art&minPrice=0.5`.
 * Route schemas still validate everything that comes back.
 */
const LIST_KEYS = new Set(['category', 'network'])
const NUMBER_KEYS = new Set(['page'])

export function parseSearch(searchString: string): Record<string, unknown> {
  const params = new URLSearchParams(
    searchString.startsWith('?') ? searchString.slice(1) : searchString,
  )
  const result: Record<string, unknown> = {}
  params.forEach((value, key) => {
    if (LIST_KEYS.has(key)) result[key] = value.split(',').filter(Boolean)
    else if (NUMBER_KEYS.has(key) && /^\d+$/.test(value)) result[key] = Number(value)
    else result[key] = value
  })
  return result
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(','))
    } else {
      params.set(key, String(value))
    }
  }
  const query = params.toString()
  // Commas stay readable; URLSearchParams would encode them as %2C.
  return query ? `?${query.replaceAll('%2C', ',')}` : ''
}
