import { setMocksReady } from './api/mocks-ready'
import './index.css'

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  const { startMocks } = await import('./mocks/browser')
  await startMocks()
}

function showMockFailure(error: unknown) {
  // Without the mock worker there is no API at all, so say it instead of leaving a broken page.
  console.error(error)
  const notice = document.createElement('div')
  notice.setAttribute('role', 'alert')
  notice.style.cssText =
    'position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:16px;background:#140d0a;color:#f5f1eb;font-family:sans-serif'
  notice.innerHTML = `
    <div style="max-width:560px">
      <h1 style="font-size:24px">Não foi possível iniciar a demonstração</h1>
      <p style="color:#cfb28c">A API simulada depende de um Service Worker, que este navegador bloqueou.
      Abra o site em uma janela comum do Chrome, Edge ou Firefox e recarregue a página.</p>
    </div>`
  document.body.append(notice)
}

// The app and the mock worker load in parallel: the UI paints right away, while requests and the
// socket wait for `mocksReady` (see api/http.ts and realtime/realtime-provider.tsx).
enableMocking().then(setMocksReady, showMockFailure)
void import('./app').then(({ renderApp }) => renderApp(document.getElementById('root')!))
