import './index.css'

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  const { startMocks } = await import('./mocks/browser')
  await startMocks()
}

// The app is imported only after the mocks start: engine.io-client keeps a reference to the
// global WebSocket when its module is evaluated, so loading it earlier would bypass MSW.
void enableMocking()
  .then(() => import('./app'))
  .then(({ renderApp }) => renderApp(document.getElementById('root')!))
