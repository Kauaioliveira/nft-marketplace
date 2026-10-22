import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import type { User } from '@/api/contracts'
import { createId, db } from '../db'
import { currentUserId, readToken, sha256, unauthorized } from '../domain'
import type { UserRecord } from '../fixtures/users'
import { errorResponse, simulateNetwork } from '../network'
import { scenario } from '../scenarios'

const SESSION_TTL_MS = 30 * 60_000
const SHORT_SESSION_TTL_MS = 30_000

const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9._]{3,20}$/i, 'Use de 3 a 20 letras, números, ponto ou sublinhado.'),
  email: z.email('Informe um e-mail válido.'),
  password: z
    .string()
    .min(8, 'A senha precisa de pelo menos 8 caracteres.')
    .regex(/[a-z]/i, 'A senha precisa de uma letra.')
    .regex(/\d/, 'A senha precisa de um número.'),
})

const loginSchema = z.object({ email: z.string(), password: z.string() })

export function toUser(record: UserRecord): User {
  return {
    id: record.id,
    name: record.name,
    username: record.username,
    email: record.email,
    avatar: record.avatar,
  }
}

function fieldErrors(error: z.ZodError) {
  return Object.fromEntries(error.issues.map((issue) => [String(issue.path[0]), issue.message]))
}

function openSession(user: UserRecord) {
  const token = crypto.randomUUID()
  const ttl = scenario.get() === 'session-expired' ? SHORT_SESSION_TTL_MS : SESSION_TTL_MS
  const expiresAt = new Date(Date.now() + ttl).toISOString()
  db.write((state) => {
    state.sessions[token] = { userId: user.id, expiresAt }
  })
  return { token, expiresAt, user: toUser(user) }
}

export const authHandlers = [
  http.post('*/api/auth/register', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure

    const parsed = registerSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return errorResponse(422, 'VALIDATION', 'Revise os campos destacados.', {
        fields: fieldErrors(parsed.error),
      })
    }
    const { username, email, password } = parsed.data
    const users = db.read().users
    const fields: Record<string, string> = {}
    if (users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
      fields.email = 'Este e-mail já está cadastrado.'
    }
    if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
      fields.username = 'Este nome de usuário já está em uso.'
    }
    if (Object.keys(fields).length > 0) {
      return errorResponse(409, 'CONFLICT', 'Já existe uma conta com estes dados.', { fields })
    }

    const salt = crypto.randomUUID().slice(0, 8)
    const user: UserRecord = {
      id: createId('user'),
      name: username,
      username,
      email,
      avatar: null,
      ensName: '',
      walletNickname: '',
      salt,
      passwordHash: await sha256(`${salt}:${password}`),
    }
    db.write((state) => {
      state.users.push(user)
      state.wallets[user.id] = []
    })
    return HttpResponse.json(openSession(user), { status: 201 })
  }),

  http.post('*/api/auth/login', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure

    const parsed = loginSchema.safeParse(await request.json().catch(() => null))
    const user = parsed.success
      ? db.read().users.find((item) => item.email.toLowerCase() === parsed.data.email.toLowerCase())
      : undefined
    const hash =
      user && parsed.success ? await sha256(`${user.salt}:${parsed.data.password}`) : null
    if (!user || hash !== user.passwordHash) {
      return errorResponse(401, 'UNAUTHORIZED', 'E-mail ou senha incorretos.')
    }
    return HttpResponse.json(openSession(user))
  }),

  http.get('*/api/auth/session', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure

    const userId = currentUserId(request)
    const token = readToken(request)
    const user = db.read().users.find((item) => item.id === userId)
    if (!user || !token) return unauthorized()
    const session = db.read().sessions[token]!
    return HttpResponse.json({ token, expiresAt: session.expiresAt, user: toUser(user) })
  }),

  http.post('*/api/auth/logout', async ({ request }) => {
    const token = readToken(request)
    if (token) {
      db.write((state) => {
        delete state.sessions[token]
      })
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
