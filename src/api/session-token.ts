import { readJson, removeKey, writeJson } from '@/lib/storage'

const KEY = 'kurio.session-token'

let token: string | null = readJson<string>(KEY)

export const sessionToken = {
  get: () => token,
  set(value: string) {
    token = value
    writeJson(KEY, value)
  },
  clear() {
    token = null
    removeKey(KEY)
  },
}
