import { z } from 'zod'

export const authSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
  reason: z.enum(['expired']).optional().catch(undefined),
})

/** Only same-site paths are accepted, so a crafted link cannot send the user elsewhere. */
export function safeRedirect(redirect: string | undefined) {
  if (!redirect || !redirect.startsWith('/') || redirect.startsWith('//')) return '/'
  if (redirect.startsWith('/login') || redirect.startsWith('/register')) return '/'
  return redirect
}
