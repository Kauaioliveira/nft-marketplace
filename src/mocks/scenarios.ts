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
  'wallet-rejected',
] as const

export type ScenarioName = (typeof scenarioNames)[number]

export const scenarioDescriptions: Record<ScenarioName, string> = {
  default: 'Tudo funciona, latência curta e variável',
  slow: 'Respostas lentas (~2,5 s) para ver os skeletons',
  flaky: 'Falhas 503 intermitentes e respostas fora de ordem',
  offline: 'Sem conexão: toda requisição falha na rede',
  empty: 'Catálogo vazio',
  'session-expired': 'Sessões novas expiram em 30 segundos',
  'price-change': 'O preço muda logo depois que a cotação do checkout é emitida',
  'sold-out': 'A edição esgota logo depois que a cotação do checkout é emitida',
  'order-timeout': 'O pedido é criado, mas a primeira resposta não chega (timeout)',
  'payment-declined': 'O pagamento é recusado',
  'wallet-rejected': 'A carteira recusa a conexão',
}

const STORAGE_KEY = 'kurio.mock-scenario'

export function isScenarioName(value: unknown): value is ScenarioName {
  return typeof value === 'string' && (scenarioNames as readonly string[]).includes(value)
}

let current: ScenarioName = (() => {
  const stored = readJson<string>(STORAGE_KEY)
  return isScenarioName(stored) ? stored : 'default'
})()

/** One-shot effects (price change, timeout...) fire once per scenario activation. */
const firedEffects = new Set<string>()

export const scenario = {
  get: () => current,
  set(name: ScenarioName) {
    current = name
    firedEffects.clear()
    writeJson(STORAGE_KEY, name)
  },
  /** True the first time it is called for `effect` while `name` is the active scenario. */
  takeOnce(name: ScenarioName, effect: string) {
    if (current !== name || firedEffects.has(effect)) return false
    firedEffects.add(effect)
    return true
  },
}
