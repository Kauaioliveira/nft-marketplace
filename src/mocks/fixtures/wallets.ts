import type { Wallet } from '@/api/contracts'

/** Ana starts with a primary wallet; Bruno has none, which exercises the empty state. */
export function createWalletFixtures(): Record<string, Wallet[]> {
  return {
    'user-ana': [
      {
        id: 'wallet-ana-primary',
        role: 'primary',
        label: 'Carteira principal',
        provider: 'metamask',
        network: 'ethereum',
        address: '0xA91F3c7B2d4E5f6071829304a5B6c7D8e9F0E82C',
      },
    ],
    'user-bruno': [],
  }
}
