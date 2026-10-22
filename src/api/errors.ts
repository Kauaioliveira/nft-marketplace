import { isAxiosError } from 'axios'
import { z } from 'zod'

export const apiErrorCodes = [
  'VALIDATION',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'UNAVAILABLE',
  'TRANSIENT',
] as const

/** Codes sent by the API plus the ones produced on the client when there is no response. */
export type ErrorCode = (typeof apiErrorCodes)[number] | 'NETWORK' | 'TIMEOUT' | 'UNKNOWN'

export const errorBodySchema = z.object({
  error: z.object({
    code: z.enum(apiErrorCodes),
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
})

export type ErrorBody = z.infer<typeof errorBodySchema>

export class ApiError extends Error {
  readonly code: ErrorCode
  readonly status: number | null
  readonly fields: Record<string, string> | undefined

  constructor(
    code: ErrorCode,
    message: string,
    status: number | null = null,
    fields?: Record<string, string>,
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.fields = fields
  }

  /** Only failures that may succeed on a second try. 4xx answers are final. */
  get isRetryable() {
    return this.code === 'TRANSIENT' || this.code === 'NETWORK' || this.code === 'TIMEOUT'
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError('TIMEOUT', 'A requisição demorou demais para responder.')
    }
    if (!error.response) {
      return new ApiError('NETWORK', 'Sem conexão com o servidor.')
    }
    const parsed = errorBodySchema.safeParse(error.response.data)
    if (parsed.success) {
      const { code, message, fields } = parsed.data.error
      return new ApiError(code, message, error.response.status, fields)
    }
    return new ApiError('UNKNOWN', 'Resposta inesperada do servidor.', error.response.status)
  }

  return new ApiError('UNKNOWN', error instanceof Error ? error.message : 'Erro desconhecido.')
}

/** Validates a response against its contract so a schema drift surfaces as an ApiError. */
export function parseResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    throw new ApiError('UNKNOWN', 'A resposta do servidor não segue o contrato esperado.')
  }
  return result.data
}

declare module '@tanstack/react-query' {
  interface Register {
    // Every request goes through the Axios interceptor, so failures are always ApiError.
    defaultError: ApiError
  }
}
