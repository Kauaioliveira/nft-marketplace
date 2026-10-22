import { readJson, removeKey, writeJson } from '@/lib/storage'

const KEY = 'kurio.visitor-cart'

/** Id of the anonymous cart, kept so visitor items survive a refresh and can be merged on login. */
export const visitorCart = {
  get: () => readJson<string>(KEY),
  set: (id: string) => writeJson(KEY, id),
  clear: () => removeKey(KEY),
}
