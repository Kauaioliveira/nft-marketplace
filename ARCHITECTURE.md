# Arquitetura

Visão das camadas, dos contratos e das decisões do marketplace. Para rodar o projeto, veja o `README.md`.

## Camadas

```
UI (routes/, features/, components/)
   │  hooks do TanStack Query (useQuery / useMutation)
   ▼
api/  ── contratos zod (contracts.ts), cliente Axios (http.ts), queryOptions por recurso
   │  HTTP (REST)                     realtime/ ── socket.io-client (um socket por sessão)
   ▼                                     ▼
MSW (Service Worker)  ◄──── mesmo db ────►  servidor Socket.IO simulado (@mswjs/socket.io-binding)
mocks/handlers/*                          mocks/realtime.ts
mocks/db.ts (estado persistido em localStorage, reset por cenário)
```

- Componentes não conhecem o mock: só falam com `api/` (REST) e recebem eventos pelo `socket.io-client`.
- Toda resposta passa por `parseResponse(schema, data)`: o contrato é validado na entrada, e um desvio vira `ApiError`.
- Todo erro chega à UI como `ApiError { code, message, status, fields?, details? }` (interceptor do Axios).

## Contratos REST

Formato de erro único: `{ "error": { "code", "message", "fields"?, "details"? } }`.
Códigos: `VALIDATION` (422), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409),
`UNAVAILABLE`, `TRANSIENT` (503). No cliente existem ainda `NETWORK`, `TIMEOUT` e `UNKNOWN`.

Valores em ETH trafegam como **string decimal** (`"1.19"`); quantidades são inteiras.

| Método | Rota | Notas |
| --- | --- | --- |
| POST | `/api/auth/register` | 201 com sessão; 422 com `fields`; 409 se e-mail ou usuário já existem |
| POST | `/api/auth/login` | 401 para credenciais inválidas |
| GET | `/api/auth/session` | 401 se o token expirou |
| POST | `/api/auth/logout` | 204 |
| GET | `/api/nfts?q&tab&category&network&minPrice&maxPrice&sort&page&pageSize` | lista paginada + contagem por faceta |
| GET | `/api/nfts/:id` | 404 se não existe |
| GET | `/api/favorites` | `{ nftIds }` |
| PUT / DELETE | `/api/favorites/:nftId` | idempotentes |
| GET | `/api/cart` | carrinho do usuário ou do visitante (`X-Cart-Id`) com resumo calculado pela API |
| POST | `/api/cart/items` | 409 `insufficient_stock` se passar do estoque ou do limite de 10 |
| PATCH / DELETE | `/api/cart/items/:lineId` | |
| POST / DELETE | `/api/cart/coupon` | 422 para cupom inválido ou expirado |
| POST | `/api/cart/merge` | junta o carrinho do visitante ao do usuário depois do login |
| POST | `/api/quote` | congela preços, cupom e taxa da rede escolhida; expira em 5 min |
| POST | `/api/orders` | header `Idempotency-Key` obrigatório; mesma chave e corpo = mesmo pedido; mesma chave e outro corpo = 409 |
| GET | `/api/orders/:id` | `pending` / `confirmed` / `declined` + snapshot; pedido de outro usuário responde 404 |
| GET / POST / DELETE | `/api/wallet-connections` | simulação de conectar, recusar e desconectar a carteira |
| GET / PUT | `/api/wallets`, `/api/wallets/:role` | carteiras principal e secundária |

A criação de pedido revalida a cotação contra o catálogo atual. Se o preço ou a disponibilidade mudou,
responde 409 com `details.reason = "quote_outdated"` e a lista de itens afetados: o usuário precisa revisar
de novo.

## Eventos Socket.IO

Envelope comum: `{ eventId, type, resource: { type, id }, version, occurredAt, userId?, payload }`.

| Evento | Payload | Quem recebe |
| --- | --- | --- |
| `nft.updated` | NFT completo | todos os sockets |
| `order.updated` | pedido completo | só sockets da sessão dona do pedido (`session.join` com o token) |

Regras no cliente (`realtime/`):
- `eventId` já visto é ignorado (entrega duplicada).
- `version` menor ou igual à última conhecida do recurso é ignorada; o cache só aceita um payload mais novo
  que o que já tem, então um evento antigo nunca regride um dado mais recente vindo do REST.
- `order.updated` com `userId` diferente do usuário atual é descartado.
- Ao reconectar, as queries ativas são refetchadas (reconciliação com o REST).
- Logout ou troca de usuário criam um socket novo; os listeners do anterior são removidos.

### Transporte e limitações nos mocks

- O MSW intercepta só WebSocket, então o cliente usa `transports: ['websocket']` (sem long-polling).
- O servidor simulado responde em um host próprio (`wss://realtime.kurio.test`). Na mesma origem do app ele
  capturaria também o WebSocket de HMR do Vite. O MSW tira o `/socket.io/` da URL antes de comparar, por isso
  o `ws.link` usa só o endereço.
- O binding responde o handshake do Engine.IO, mas não manda heartbeat: o mock envia ping a cada 20 s.
- O app só é importado depois que o MSW sobe, porque o `engine.io-client` guarda a referência ao `WebSocket`
  global no momento em que o módulo é avaliado.
- Sem namespaces nem rooms no binding; a separação por usuário é feita no mock com `session.join`.

## Sessão

- Token guardado no `localStorage` e enviado como `Authorization: Bearer`. A sessão é recuperada no refresh
  com `GET /api/auth/session`.
- As rotas privadas ficam sob o layout `_authenticated`, cujo `beforeLoad` exige sessão e redireciona para
  `/login?redirect=<url atual>`. O redirect só aceita caminhos internos.
- Um 401 em requisição autenticada aciona o `SessionExpiryWatcher`: limpa o token e todo o cache, avisa o
  usuário e, se ele estava numa tela privada, leva ao login com `reason=expired`. O rascunho do checkout fica no
  `sessionStorage` e volta preenchido.
- Login e logout chamam `queryClient.clear()`. As chaves de dados privados incluem o `userId`
  (`['cart', userId]`, `['favorites', userId]`, `['orders', userId, id]`), então dois usuários nunca
  compartilham uma entrada de cache.
- Senhas no mock são guardadas como SHA-256 com salt; nunca em texto puro.

## Carrinho

- Mantido no servidor (mock). O visitante recebe um carrinho anônimo identificado por `X-Cart-Id`
  (guardado no `localStorage`), que sobrevive ao refresh.
- No login, `POST /api/cart/merge` move os itens do visitante para o carrinho do usuário, respeitando estoque.
- Subtotal, desconto, taxa e total vêm sempre da API (`summary`). O cliente não recalcula valores.
- Um `nft.updated` de item que está no carrinho invalida o carrinho e mostra um aviso com o preço antigo e o novo.

## Checkout e pedidos

1. O formulário valida os campos do layout. A carteira escolhida precisa estar conectada (simulação).
2. "Revisar compra" pede uma cotação (`POST /api/quote`) e abre o diálogo de revisão com os valores dela.
3. Se chega um `nft.updated` que muda preço ou estoque de um item da cotação, o diálogo bloqueia a
   confirmação e pede "Atualizar cotação". O servidor faz a mesma checagem (409 `quote_outdated`).
4. A confirmação gera **uma** `Idempotency-Key` por cotação revisada. Clique repetido, timeout ou falha de
   rede reenviam a mesma chave e o mesmo corpo, e a API devolve o mesmo pedido. A tentativa fica no
   `sessionStorage`, então pode ser retomada depois de um refresh.
5. O pedido nasce `pending`. A liquidação simulada (~2,5 s) vira `confirmed` ou `declined` e emite
   `order.updated`. A página do pedido também consulta a cada 3 s enquanto está pendente, caso o socket esteja
   fora. A liquidação é calculada de forma preguiçosa, então sobrevive ao refresh.
6. Só um pedido `confirmed` mostra o recibo, que é montado a partir do snapshot do pedido. Na confirmação,
   apenas as quantidades compradas saem do carrinho; em `declined`, o carrinho fica intacto.

## Cache, retries e sincronização

| Item | Política |
| --- | --- |
| `staleTime` padrão | 30 s (sessão: 5 min) |
| `gcTime` | 5 min |
| Retry de query | até 2 vezes, só para `TRANSIENT`, `NETWORK` e `TIMEOUT`, com backoff de 500 ms a 4 s |
| Retry de mutation | nenhum automático (pedidos usam retry explícito com a mesma chave) |
| Refetch ao focar a janela | desligado |
| Cancelamento | toda query passa o `signal` ao Axios; mudar filtros cancela a requisição anterior |
| Respostas fora de ordem | cada combinação de parâmetros tem a própria chave, então uma resposta lenta nunca aparece para filtros novos |
| Atualização otimista | favoritos: muda na hora, desfaz em caso de erro e revalida no fim |
| Eventos | `nft.updated` corrige detalhe e listas no cache (só se for mais novo) e invalida o carrinho |
| Reconexão | refetch das queries ativas |

## Cenários e mocks

Detalhes de uso no README. O banco simulado (`mocks/db.ts`) mantém catálogo, usuários, sessões, favoritos,
carrinhos, cotações, pedidos, chaves de idempotência e carteiras de forma consistente, e o reset restaura as
fixtures. Endpoints `/api/__dev/*` controlam cenários, falhas pontuais e eventos para a demonstração e os
testes; eles existem apenas na camada de mocks.

## Decisões e desvios

- **Login e cadastro como página**: no Figma são modais sobre a home. Viraram páginas com o mesmo cartão para
  ter URL própria, que a guarda de rotas usa no redirect e que sobrevive ao refresh.
- **Faixa de preço** com dois campos (mínimo e máximo) e botão Aplicar, em vez do slider do layout:
  mais preciso para valores decimais e acessível por teclado.
- **Busca** em um campo acima do catálogo também no desktop (o layout desktop só tem o ícone no cabeçalho).
- **Campos do checkout**: "Nome do perfil", "Código de indicação" e "Nome ENS" aparecem com asterisco no Figma,
  mas não afetam o pedido simulado, então ficaram opcionais. "Revisar compra" abre a revisão antes do
  "Confirmar compra" do layout, porque o enunciado exige revisão antes do envio.
- **Ações fora do escopo** (Criadores, Aprenda, newsletter, login social, artigos) mostram um aviso de
  "em breve" em vez de aparentar sucesso.
- **Imagens**: o arquivo do Figma tem 4 artes de NFT; o catálogo de 40 itens as reaproveita. Foram convertidas
  para WebP em dois tamanhos.
- **Fonte**: Roboto Mono, servida localmente via `@fontsource-variable/roboto-mono`.

## Limitações conhecidas

- O backend é inteiramente simulado no navegador; o estado fica no `localStorage` de cada navegador.
- O Service Worker do MSW precisa de um navegador que permita Service Workers (janelas anônimas de alguns
  navegadores e webviews podem bloquear). Nesse caso a aplicação mostra uma mensagem em vez da tela vazia.
