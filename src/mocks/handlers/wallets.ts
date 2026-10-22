import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { networkSchema, walletProviderSchema, type Wallet } from '@/api/contracts'
import { createId, db } from '../db'
import { currentUserId, unauthorized } from '../domain'
import { errorResponse, simulateNetwork } from '../network'

const walletInputSchema = z.object({
  role: z.enum(['primary', 'secondary']),
  label: z.string().trim().min(2, 'Informe um apelido com pelo menos 2 caracteres.'),
  provider: walletProviderSchema,
  network: networkSchema,
  address: z
    .string()
    .regex(
      /^0x[a-fA-F0-9]{40}$/,
      'Endereço inválido. Use 0x seguido de 40 caracteres hexadecimais.',
    ),
})

function fieldErrors(error: z.ZodError) {
  return Object.fromEntries(error.issues.map((issue) => [String(issue.path[0]), issue.message]))
}

export const walletHandlers = [
  http.get('*/api/wallets', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const userId = currentUserId(request)
    if (!userId) return unauthorized()
    return HttpResponse.json({ wallets: db.read().wallets[userId] ?? [] })
  }),

  // Creates or replaces the wallet for a role (one primary and one secondary per user).
  http.put('*/api/wallets/:role', async ({ request, params }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const userId = currentUserId(request)
    if (!userId) return unauthorized()
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const parsed = walletInputSchema.safeParse({ ...body, role: params.role })
    if (!parsed.success) {
      return errorResponse(422, 'VALIDATION', 'Revise os campos da carteira.', {
        fields: fieldErrors(parsed.error),
      })
    }
    const others = (db.read().wallets[userId] ?? []).filter(
      (wallet) => wallet.role !== parsed.data.role,
    )
    if (
      others.some((wallet) => wallet.address.toLowerCase() === parsed.data.address.toLowerCase())
    ) {
      return errorResponse(409, 'CONFLICT', 'Este endereço já está cadastrado na outra carteira.', {
        fields: { address: 'Este endereço já está cadastrado na outra carteira.' },
      })
    }
    const wallet = db.write((state) => {
      const list = state.wallets[userId] ?? []
      const existing = list.find((item) => item.role === parsed.data.role)
      const next: Wallet = { id: existing?.id ?? createId('wallet'), ...parsed.data }
      state.wallets[userId] = [...list.filter((item) => item.role !== parsed.data.role), next]
      return next
    })
    return HttpResponse.json(wallet)
  }),
]
