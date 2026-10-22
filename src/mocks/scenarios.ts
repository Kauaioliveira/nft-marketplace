import { readJson, writeJson } from '@/lib/storage'

export const scenarioNames = [
  'default',
  'slow',
  'flaky',
  'offline',
  'empty',
  'session-expired',
  'price-change',
  'sold-out',
  'order-timeout',
  'payment-declined',
] as const

export type ScenarioName = (typeof scenarioNames)[number]

export const scenarioDescriptions: Record<ScenarioName, string> = {
  default: 'Tudo funciona, latência curta e variável',
  slow: 'Respostas lentas (~2,5 s) para ver os skeletons',
  flaky: 'Falhas 503 intermitentes e respostas fora de ordem',
  offline: 'Sem conexão: toda requisição falha na rede',
  empty: 'Catálogo vazio',
  'session-expired': 'A sessão expira na próxima requisição autenticada',
  'price-change': 'O preço muda durante o checkout',
  'sold-out': 'A edição esgota durante o checkout',
  'order-timeout': 'O pedido é criado, mas a resposta não chega (timeout)',
  'payment-declined': 'O pagamento é recusado',
}

const STORAGE_KEY = 'kurio.mock-scenario'

export function isScenarioName(value: unknown): value is ScenarioName {
  return typeof value === 'string' && (scenarioNames as readonly string[]).includes(value)
}

let current: ScenarioName = (() => {
  const stored = readJson<string>(STORAGE_KEY)
  return isScenarioName(stored) ? stored : 'default'
})()

export const scenario = {
  get: () => current,
  set(name: ScenarioName) {
    current = name
    writeJson(STORAGE_KEY, name)
  },
}
