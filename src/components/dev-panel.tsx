import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { http } from '@/api/http'
import { Button } from '@/components/ui/button'
import { scenarioDescriptions, scenarioNames, type ScenarioName } from '@/mocks/scenarios'
import { useAnnounce } from './live-announcer-context'

// Newest NFT, shown first on the home page, so the change is visible right away.
const DEMO_NFT_ID = 'nft-1'

/**
 * Demo controls for the mock backend: pick a scenario, reset the data and trigger a realtime
 * change. It talks to the mocks through HTTP like any other client.
 */
export function DevPanel() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<ScenarioName>('default')
  const [busy, setBusy] = useState(false)
  const queryClient = useQueryClient()
  const announce = useAnnounce()

  async function run(action: () => Promise<unknown>, message?: string) {
    setBusy(true)
    try {
      await action()
      if (message) announce(message)
    } catch {
      announce('A ação do painel de cenários falhou.')
    } finally {
      setBusy(false)
    }
  }

  const applyScenario = () =>
    run(async () => {
      await http.post('/__dev/reset', { scenario: selected })
      queryClient.clear()
      await queryClient.refetchQueries({ type: 'active' })
    }, `Cenário "${selected}" aplicado e dados restaurados.`)

  // No announcement here: the realtime listener announces the change when the event arrives.
  const bumpPrice = () => run(() => http.post(`/__dev/nfts/${DEMO_NFT_ID}/bump-price`))

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2 text-sm">
      {open && (
        <section
          id="dev-panel"
          aria-label="Cenários de simulação"
          className="border-border-soft bg-surface-card w-72 rounded-lg border p-4 shadow-xl"
        >
          <label htmlFor="dev-scenario" className="text-sand mb-1 block text-xs">
            Cenário
          </label>
          <select
            id="dev-scenario"
            value={selected}
            onChange={(event) => setSelected(event.target.value as ScenarioName)}
            className="border-input bg-ink mb-1 w-full rounded-md border px-2 py-1.5"
          >
            {scenarioNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <p className="text-sand mb-3 text-xs">{scenarioDescriptions[selected]}</p>
          <div className="flex flex-col gap-2">
            <Button onClick={applyScenario} disabled={busy}>
              Aplicar e restaurar dados
            </Button>
            <Button variant="outline" onClick={bumpPrice} disabled={busy}>
              Simular alteração de preço
            </Button>
          </div>
        </section>
      )}
      <Button
        variant="secondary"
        aria-expanded={open}
        aria-controls="dev-panel"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? 'Fechar cenários' : 'Cenários'}
      </Button>
    </div>
  )
}
