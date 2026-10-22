# Kurio — Marketplace de NFTs

Marketplace de NFTs em React + TypeScript com descoberta, compra e conta do colecionador.
Toda a API (REST e Socket.IO) é simulada com MSW na camada de rede, inclusive no build publicado.

Decisões, contratos REST, eventos e políticas de cache estão em [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Stack

React 19, TypeScript (strict), Vite, TanStack Router (rotas por arquivo), TanStack Query, Axios,
Socket.IO (`socket.io-client`), Tailwind CSS 4, shadcn/ui, MSW 2 + `@mswjs/socket.io-binding`,
Zod, big.js, Playwright.

## Como rodar

Requisitos: **Node 22.19 ou mais recente** (desenvolvido com Node 24, versão em `.nvmrc`) e **pnpm 10**
(fixado em `packageManager`). Versões mais antigas do Node não rodam o Vite 8, o ESLint 10 e o Lighthouse; o
`.npmrc` faz a instalação falhar logo com uma mensagem clara nesse caso.

```bash
nvm install && nvm use   # ou instale o Node 24 LTS pelo site oficial
corepack enable          # ativa o pnpm na versão do packageManager
pnpm install
pnpm dev                 # http://localhost:5173 com os mocks ativos
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
| `pnpm lighthouse:ci` | Build, servidor e auditoria Lighthouse (3 execuções por página e perfil) |
| `pnpm lighthouse` | Só a auditoria, com o build já servido em `http://localhost:4173` |

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

As senhas ficam no mock só como hash SHA-256 com salt. A Ana já tem uma carteira MetaMask cadastrada e um
favorito; o Bruno começa sem carteira.

Cupons: `KURIO10` (10%), `SELVA25` (25%) e `VENCIDO15` (expirado).

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
| `session-expired` | Sessões novas expiram em 30 segundos |
| `price-change` | O preço muda logo depois que a revisão do checkout abre |
| `sold-out` | A edição esgota logo depois que a revisão do checkout abre |
| `order-timeout` | O pedido é criado, mas a primeira resposta não chega (timeout de 8 s) |
| `payment-declined` | Pagamento recusado |
| `wallet-rejected` | A carteira recusa a conexão |

O painel também tem **Simular alteração de preço**: o mock altera o preço no banco e emite
`nft.updated` pelo Socket.IO. A tela atualiza a partir do evento.

### Reproduzindo os fluxos de falha

| Fluxo | Como reproduzir |
| --- | --- |
| Preço alterado no checkout | Cenário `price-change`, entre como Ana, adicione um NFT, conecte a carteira e clique em "Revisar compra". Em ~1 s a revisão é bloqueada e pede "Atualizar cotação". |
| Timeout com recuperação | Cenário `order-timeout`, faça a compra. Após 8 s aparece "Não recebemos a confirmação"; "Tentar novamente" recupera o mesmo pedido. |
| Pagamento recusado | Cenário `payment-declined`. O pedido termina recusado e o carrinho fica intacto. |
| Sessão expirada | Cenário `session-expired` (sessão de 30 s) ou, nos testes, `POST /api/__dev/expire-sessions`. |
| Lentidão e skeletons | Cenário `slow`. |
| Falhas intermitentes e respostas fora de ordem | Cenário `flaky`. |
| Sem conexão | Cenário `offline`. |

## Tempo real nos mocks

O MSW intercepta apenas WebSocket, então o cliente usa `transports: ['websocket']` (sem long-polling).
O servidor Socket.IO simulado responde em um endereço próprio (`VITE_SOCKET_URL`) para não capturar o
WebSocket de HMR do Vite, que usa a mesma origem da aplicação. O app só é carregado depois que o MSW
inicia, porque o `engine.io-client` guarda a referência ao `WebSocket` global ao ser importado.

## Testes

`pnpm test:e2e` sobe o build de produção com mocks (`pnpm build && pnpm preview`) e roda os testes em Chromium
desktop (1440px) e mobile (Pixel 7). Cada teste parte de um banco limpo (`?scenario=` reseta o estado) e usa os
endpoints `/api/__dev/*`, chamados de dentro da página, para disparar falhas e eventos de forma determinística.
Relatório HTML em `playwright-report/` e traces das falhas em `test-results/`.

| Arquivo | Cobertura |
| --- | --- |
| `catalog.spec.ts` | busca, filtros combinados, ordenação, paginação, histórico, vazio, erro, detalhe direto e 404 |
| `account.spec.ts` | cadastro (validação e conflito), login, refresh, logout, troca de usuário, expiração no checkout, carrinho do visitante |
| `purchase.spec.ts` | compra completa até o recibo; pagamento recusado |
| `checkout-resilience.spec.ts` | preço alterado via Socket.IO, timeout com a mesma chave, clique repetido, carteira recusada |
| `realtime.spec.ts` | evento duplicado e antigo, reconexão, aviso no carrinho, pedido pendente após refresh, favorito com rollback |
| `profile.spec.ts` | dados do perfil (validação, conflito, persistência), avatar, senha e carteiras |
| `accessibility.spec.ts` | teclado, foco em diálogos, erros associados aos campos, skeletons, erro e nova tentativa, rolagem horizontal |
| `axe.spec.ts` | auditoria axe (WCAG 2.1 AA) das telas públicas e privadas |
| `visual.spec.ts` | regressão visual de início, detalhe, carrinho e pagamento (baselines em `visual.spec.ts-snapshots/`) |

## Lighthouse

Resultados (medianas de 3 execuções) em [`lighthouse/summary.md`](./lighthouse/summary.md) e relatórios
completos em `lighthouse/reports/`. A análise dos resultados abaixo da meta está no `ARCHITECTURE.md`.

## Estrutura

```
src/
  api/         cliente Axios, contratos (zod), erros, query client, queries por recurso
  realtime/    conexão Socket.IO, filtro de eventos duplicados/antigos, provider
  features/    telas e hooks por domínio (catálogo, NFT, sessão, carrinho, checkout, favoritos)
  routes/      rotas do TanStack Router (_authenticated = telas privadas)
  components/  layout, componentes compartilhados e shadcn/ui (components/ui)
  mocks/       MSW: handlers REST, servidor Socket.IO, banco persistido, fixtures, cenários
  lib/         dinheiro (big.js), storage, utilitários
tests/e2e/     testes Playwright
```

## Deploy

O deploy é estático (Vercel). `vercel.json` reescreve qualquer rota para `index.html`, para que o
acesso direto e o refresh funcionem, e serve `mockServiceWorker.js` sem cache.
