import { z } from 'zod'
import { networks, walletProviders } from '@/api/contracts'

const isOneOf = (options: readonly string[]) => (value: string) => options.includes(value)

export const checkoutSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe como quer ser chamado.'),
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9._]{3,20}$/i, 'Use de 3 a 20 letras, números, ponto ou sublinhado.'),
  // Selects start empty, so these are strings validated against the allowed values.
  network: z.string().refine(isOneOf(networks), 'Selecione uma rede.'),
  profileName: z.string().trim().max(40, 'Use até 40 caracteres.'),
  walletAddress: z
    .string()
    .trim()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      'Endereço inválido. Use 0x seguido de 40 caracteres hexadecimais.',
    ),
  secondaryWallet: z.string().trim().max(64, 'Use até 64 caracteres.'),
  walletProvider: z.string().refine(isOneOf(walletProviders), 'Selecione o tipo de carteira.'),
  referralCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{0,16}$/, 'Use até 16 letras, números ou hífen.'),
  email: z.string().trim().min(1, 'Informe seu e-mail.').pipe(z.email('Informe um e-mail válido.')),
  ensName: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{0,32}$/i, 'Use letras, números ou hífen.'),
  note: z.string().max(280, 'Use até 280 caracteres.'),
})

export type CheckoutValues = z.infer<typeof checkoutSchema>

export const emptyCheckout: CheckoutValues = {
  displayName: '',
  username: '',
  network: '',
  profileName: '',
  walletAddress: '',
  secondaryWallet: '',
  walletProvider: '',
  referralCode: '',
  email: '',
  ensName: '',
  note: '',
}
