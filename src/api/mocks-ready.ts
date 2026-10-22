let markReady: () => void = () => {}

/**
 * Resolves when the mock Service Worker controls the page (or right away without mocks).
 * The app renders while MSW starts; requests and the socket wait for this promise instead.
 */
export const mocksReady = new Promise<void>((resolve) => {
  markReady = resolve
})

export function setMocksReady() {
  markReady()
  // Observable flag for E2E tests, which must not call the mock API before the worker is active.
  document.documentElement.dataset.mocksReady = 'true'
}
