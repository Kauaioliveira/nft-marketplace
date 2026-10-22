# Kurio — Marketplace de NFTs

Marketplace de NFTs em React + TypeScript com descoberta, compra e conta do colecionador.
Toda a API (REST e Socket.IO) é simulada com MSW na camada de rede, inclusive no build publicado.

> Projeto em desenvolvimento. Esta versão contém a base: rotas, cliente HTTP, mocks, tempo real e testes.

## Stack

React 19, TypeScript (strict), Vite, TanStack Router (rotas por arquivo), TanStack Query, Axios,
Socket.IO (`socket.io-client`), Tailwind CSS 4, shadcn/ui, MSW 2 + `@mswjs/socket.io-binding`,
Zod, big.js, Playwright.

## Como rodar

Requisitos: Node 20+ e pnpm 10.

```bash
pnpm install
pnpm dev            # http://localhost:5173 com os mocks ativos
```

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Servidor de desenvolvimento com mocks |
| `pnpm build` | Verificação de tipos + build de produção (mocks ativos, ver `.env`) |
| `pnpm preview` | Serve o build em `http://localhost:4173` |
| `pnpm typecheck` | `tsc -b` |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm test:e2e` | Playwright (Chromium desktop 1440px e mobile Pixel 7) contra o build |
| `pnpm test:e2e:report` | Abre o relatório HTML do último teste |

Na primeira vez, instale o navegador dos testes: `pnpm exec playwright install chromium`.

## Variáveis de ambiente

Os valores padrão estão em `.env` (nenhum é segredo):

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | Liga o MSW. Fica ligado também no build de demonstração |
| `VITE_API_URL` | `/api` | Base das chamadas REST |
| `VITE_SOCKET_URL` | `wss://realtime.kurio.test` | Servidor Socket.IO. Nos mocks é um host virtual respondido pelo MSW |

## Credenciais fictícias

| E-mail | Senha |
| --- | --- |
| `ana@example.com` | `Senha123!` |
| `bruno@example.com` | `Senha123!` |

As senhas ficam no mock só como hash SHA-256 com salt.

## Cenários de simulação

O banco simulado fica no `localStorage` e sobrevive ao refresh. Para escolher um cenário e restaurar
os dados:

- pela URL: `/?scenario=slow` (o parâmetro é aplicado e removido da barra de endereço);
- pelo botão **Cenários** no canto inferior direito.

| Cenário | Efeito |
| --- | --- |
| `default` | Tudo funciona, latência curta e variável (determinística) |
| `slow` | Respostas em ~2,5 s, para ver os skeletons |
| `flaky` | Falhas 503 intermitentes e respostas fora de ordem |
| `offline` | Toda requisição falha na rede |
| `empty` | Catálogo vazio |
| `session-expired` | Sessão expira na próxima requisição autenticada |
| `price-change` | Preço muda durante o checkout |
| `sold-out` | Edição esgota durante o checkout |
| `order-timeout` | Pedido criado, mas a resposta não chega |
| `payment-declined` | Pagamento recusado |

O painel também tem **Simular alteração de preço**: o mock altera o preço no banco e emite
`nft.updated` pelo Socket.IO. A tela atualiza a partir do evento.

## Tempo real nos mocks

O MSW intercepta apenas WebSocket, então o cliente usa `transports: ['websocket']` (sem long-polling).
O servidor Socket.IO simulado responde em um endereço próprio (`VITE_SOCKET_URL`) para não capturar o
WebSocket de HMR do Vite, que usa a mesma origem da aplicação. O app só é carregado depois que o MSW
inicia, porque o `engine.io-client` guarda a referência ao `WebSocket` global ao ser importado.

## Estrutura

```
src/
  api/         cliente Axios, contratos (zod), erros, query client, queries por recurso
  realtime/    conexão Socket.IO, filtro de eventos duplicados/antigos, provider
  routes/      rotas do TanStack Router (_authenticated = telas privadas)
  components/  layout, componentes compartilhados e shadcn/ui (components/ui)
  mocks/       MSW: handlers REST, servidor Socket.IO, banco persistido, fixtures, cenários
  lib/         dinheiro (big.js), storage, utilitários
tests/e2e/     testes Playwright
```

## Deploy

O deploy é estático (Vercel). `vercel.json` reescreve qualquer rota para `index.html`, para que o
acesso direto e o refresh funcionem, e serve `mockServiceWorker.js` sem cache.
