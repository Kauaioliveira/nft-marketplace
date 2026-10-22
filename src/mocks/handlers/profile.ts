import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import type { Profile } from '@/api/contracts'
import { db } from '../db'
import { currentUserId, sha256, unauthorized } from '../domain'
import type { UserRecord } from '../fixtures/users'
import { errorResponse, simulateNetwork } from '../network'

/** Roughly 200 KB of image once base64 encoded. Keeps localStorage small. */
const MAX_AVATAR_LENGTH = 280_000

const profileInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Informe como quer ser chamado.')
    .max(40, 'Use até 40 caracteres.'),
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9._]{3,20}$/i, 'Use de 3 a 20 letras, números, ponto ou sublinhado.'),
  email: z.email('Informe um e-mail válido.'),
  ensName: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{0,32}$/i, 'Use letras, números ou hífen.'),
  walletNickname: z
    .string()
    .trim()
    .min(2, 'Informe um apelido com pelo menos 2 caracteres.')
    .max(30, 'Use até 30 caracteres.'),
})

const avatarSchema = z.object({
  dataUrl: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp|gif);base64,/, 'Envie uma imagem PNG, JPG, WEBP ou GIF.'),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual.'),
  newPassword: z
    .string()
    .min(8, 'A senha precisa de pelo menos 8 caracteres.')
    .regex(/[a-z]/i, 'A senha precisa de uma letra.')
    .regex(/\d/, 'A senha precisa de um número.'),
})

function fieldErrors(error: z.ZodError) {
  return Object.fromEntries(error.issues.map((issue) => [String(issue.path[0]), issue.message]))
}

export function toProfile(user: UserRecord): Profile {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    ensName: user.ensName,
    walletNickname: user.walletNickname,
  }
}

function findUser(userId: string) {
  return db.read().users.find((user) => user.id === userId)
}

export const profileHandlers = [
  http.get('*/api/profile', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const userId = currentUserId(request)
    const user = userId ? findUser(userId) : undefined
    if (!user) return unauthorized()
    return HttpResponse.json(toProfile(user))
  }),

  http.patch('*/api/profile', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const userId = currentUserId(request)
    if (!userId) return unauthorized()
    const parsed = profileInputSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return errorResponse(422, 'VALIDATION', 'Revise os campos destacados.', {
        fields: fieldErrors(parsed.error),
      })
    }
    const others = db.read().users.filter((user) => user.id !== userId)
    const fields: Record<string, string> = {}
    if (others.some((user) => user.email.toLowerCase() === parsed.data.email.toLowerCase())) {
      fields.email = 'Este e-mail já está em uso por outra conta.'
    }
    if (others.some((user) => user.username.toLowerCase() === parsed.data.username.toLowerCase())) {
      fields.username = 'Este nome de usuário já está em uso.'
    }
    if (Object.keys(fields).length > 0) {
      return errorResponse(409, 'CONFLICT', 'Alguns dados já pertencem a outra conta.', { fields })
    }
    const updated = db.write((state) => {
      const user = state.users.find((item) => item.id === userId)!
      Object.assign(user, parsed.data)
      return toProfile(user)
    })
    return HttpResponse.json(updated)
  }),

  http.put('*/api/profile/avatar', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const userId = currentUserId(request)
    if (!userId) return unauthorized()
    const parsed = avatarSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return errorResponse(422, 'VALIDATION', 'Envie uma imagem PNG, JPG, WEBP ou GIF.', {
        fields: { avatar: 'Envie uma imagem PNG, JPG, WEBP ou GIF.' },
      })
    }
    if (parsed.data.dataUrl.length > MAX_AVATAR_LENGTH) {
      return errorResponse(422, 'VALIDATION', 'A imagem precisa ter no máximo 200 KB.', {
        fields: { avatar: 'A imagem precisa ter no máximo 200 KB.' },
      })
    }
    const updated = db.write((state) => {
      const user = state.users.find((item) => item.id === userId)!
      user.avatar = parsed.data.dataUrl
      return toProfile(user)
    })
    return HttpResponse.json(updated)
  }),

  http.delete('*/api/profile/avatar', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const userId = currentUserId(request)
    if (!userId) return unauthorized()
    const updated = db.write((state) => {
      const user = state.users.find((item) => item.id === userId)!
      user.avatar = null
      return toProfile(user)
    })
    return HttpResponse.json(updated)
  }),

  http.post('*/api/profile/password', async ({ request }) => {
    const failure = await simulateNetwork(request)
    if (failure) return failure
    const userId = currentUserId(request)
    const user = userId ? findUser(userId) : undefined
    if (!user) return unauthorized()
    const parsed = passwordSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return errorResponse(422, 'VALIDATION', 'Revise os campos de senha.', {
        fields: fieldErrors(parsed.error),
      })
    }
    if ((await sha256(`${user.salt}:${parsed.data.currentPassword}`)) !== user.passwordHash) {
      return errorResponse(422, 'VALIDATION', 'A senha atual está incorreta.', {
        fields: { currentPassword: 'A senha atual está incorreta.' },
      })
    }
    const salt = crypto.randomUUID().slice(0, 8)
    const passwordHash = await sha256(`${salt}:${parsed.data.newPassword}`)
    db.write((state) => {
      const target = state.users.find((item) => item.id === user.id)!
      target.salt = salt
      target.passwordHash = passwordHash
    })
    return new HttpResponse(null, { status: 204 })
  }),
]
