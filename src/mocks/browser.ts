import { setupWorker } from 'msw/browser'
import { db } from './db'
import { handlers } from './handlers'
import { isScenarioName, scenario } from './scenarios'

/**
 * `?scenario=<name>` resets the mock db and activates a scenario. The param is removed afterwards
 * so a refresh keeps the current state instead of resetting it again.
 */
function applyScenarioFromUrl() {
  const url = new URL(window.location.href)
  const requested = url.searchParams.get('scenario')
  if (!isScenarioName(requested)) return
  scenario.set(requested)
  db.reset()
  url.searchParams.delete('scenario')
  window.history.replaceState(window.history.state, '', url)
}

export async function startMocks() {
  applyScenarioFromUrl()
  const worker = setupWorker(...handlers)
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: import.meta.env.PROD,
  })
}
