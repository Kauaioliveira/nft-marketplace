import './index.css'

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  const { startMocks } = await import('./mocks/browser')
  await startMocks()
}

const root = document.getElementById('root')!

// The app is imported only after the mocks start: engine.io-client keeps a reference to the
// global WebSocket when its module is evaluated, so loading it earlier would bypass MSW.
enableMocking()
  .then(() => import('./app'))
  .then(({ renderApp }) => renderApp(root))
  .catch((error: unknown) => {
    // Without the mock worker there is no API at all, so say it instead of showing a blank page.
    console.error(error)
    root.innerHTML = `
      <main style="max-width:560px;margin:15vh auto;padding:0 16px;font-family:sans-serif;color:#f5f1eb">
        <h1 style="font-size:24px">Não foi possível iniciar a demonstração</h1>
        <p style="color:#cfb28c">A API simulada depende de um Service Worker, que este navegador bloqueou.
        Abra o site em uma janela comum do Chrome, Edge ou Firefox e recarregue a página.</p>
      </main>`
  })
