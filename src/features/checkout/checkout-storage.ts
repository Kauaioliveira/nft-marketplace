/**
 * Checkout state that must survive a refresh or a session expiry. sessionStorage keeps it per tab
 * and drops it when the tab closes.
 */
const DRAFT_KEY = 'kurio.checkout-draft'
const ATTEMPT_KEY = 'kurio.checkout-attempt'

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Best effort only.
  }
}

function remove(key: string) {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function readCheckoutDraft<T>() {
  return read<T>(DRAFT_KEY)
}

export function saveCheckoutDraft(value: unknown) {
  write(DRAFT_KEY, value)
}

/** An order submission that has not received an answer yet (for example after a timeout). */
export type PendingAttempt = {
  userId: string
  idempotencyKey: string
  input: unknown
}

export function readPendingAttempt() {
  return read<PendingAttempt>(ATTEMPT_KEY)
}

export function savePendingAttempt(attempt: PendingAttempt) {
  write(ATTEMPT_KEY, attempt)
}

export function clearPendingAttempt() {
  remove(ATTEMPT_KEY)
}

export function clearCheckoutDraft() {
  remove(DRAFT_KEY)
  remove(ATTEMPT_KEY)
}
