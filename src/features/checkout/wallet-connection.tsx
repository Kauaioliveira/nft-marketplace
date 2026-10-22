import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import {
  checkoutKeys,
  connectWallet,
  disconnectWallet,
  walletConnectionsQuery,
} from '@/api/checkout'
import { walletProviders, type WalletProvider } from '@/api/contracts'
import { useAnnounce } from '@/components/live-announcer-context'
import { Button } from '@/components/ui/button'
import { walletProviderLabels } from '@/lib/labels'
import { cn } from '@/lib/utils'

type WalletConnectionProps = {
  userId: string
  value: WalletProvider | ''
  onChange: (provider: WalletProvider) => void
  error?: string
}

/** "Carteira e rede" block: choose a provider and simulate connect, refusal and disconnect. */
export function WalletConnection({ userId, value, onChange, error }: WalletConnectionProps) {
  const queryClient = useQueryClient()
  const announce = useAnnounce()
  const { data: connected = [] } = useQuery(walletConnectionsQuery(userId))
  const key = checkoutKeys.connections(userId)

  const connect = useMutation({
    mutationFn: connectWallet,
    onSuccess: (providers, provider) => {
      queryClient.setQueryData(key, providers)
      announce(`${walletProviderLabels[provider]} conectada.`)
    },
    onError: (apiError) => announce(apiError.message),
  })
  const disconnect = useMutation({
    mutationFn: disconnectWallet,
    onSuccess: (providers, provider) => {
      queryClient.setQueryData(key, providers)
      announce(`${walletProviderLabels[provider]} desconectada.`)
    },
  })

  const isConnected = value !== '' && connected.includes(value)

  return (
    <fieldset aria-describedby={error ? 'wallet-provider-error' : undefined}>
      <legend className="mb-3 w-full text-center text-[17px] font-bold">Carteira e rede</legend>
      <div className="flex flex-col gap-3">
        {walletProviders.map((provider) => {
          const selected = value === provider
          return (
            <label
              key={provider}
              className={cn(
                'has-[:focus-visible]:outline-amber flex cursor-pointer items-center gap-3 border px-4 py-3 has-[:focus-visible]:outline-2',
                selected ? 'border-brand' : 'border-border-soft',
              )}
            >
              <input
                type="radio"
                name="walletProvider"
                value={provider}
                checked={selected}
                onChange={() => onChange(provider)}
                className="size-4 accent-[var(--color-brand)]"
              />
              <span className="flex-1">{walletProviderLabels[provider]}</span>
              {connected.includes(provider) && (
                <span className="text-success flex items-center gap-1 text-sm">
                  <CheckCircle2 className="size-4" aria-hidden />
                  Conectada
                </span>
              )}
            </label>
          )
        })}
      </div>
      {error && (
        <p id="wallet-provider-error" className="text-coral mt-2 text-sm">
          {error}
        </p>
      )}
      {value !== '' && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {isConnected ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => disconnect.mutate(value)}
              disabled={disconnect.isPending}
            >
              Desconectar {walletProviderLabels[value]}
            </Button>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => connect.mutate(value)}
              disabled={connect.isPending}
            >
              {connect.isPending
                ? 'Aguardando a carteira…'
                : `Conectar ${walletProviderLabels[value]}`}
            </Button>
          )}
          {connect.isError && !isConnected && (
            <p role="alert" className="text-coral text-sm">
              {connect.error.message}
            </p>
          )}
        </div>
      )}
    </fieldset>
  )
}
