import { readJson, removeKey, writeJson } from '@/lib/storage'

const KEY = 'kurio.session-token'

let token: string | null = readJson<string>(KEY)
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

/** Session token store. React reads it through useSyncExternalStore (see useSessionToken). */
export const sessionToken = {
  get: () => token,
  set(value: string) {
    token = value
    writeJson(KEY, value)
    emit()
  },
  clear() {
    token = null
    removeKey(KEY)
    emit()
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}
