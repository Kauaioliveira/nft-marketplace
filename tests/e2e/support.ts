import { expect, type Page } from '@playwright/test'

export const ana = { email: 'ana@example.com', password: 'Senha123!', name: 'Ana Souza' }
export const bruno = { email: 'bruno@example.com', password: 'Senha123!', name: 'Bruno Lima' }

/**
 * Calls a mock control endpoint from inside the page. Requests made by Playwright itself would
 * skip the Service Worker, so they would never reach MSW.
 */
export async function devCall(page: Page, path: string, body?: unknown) {
  const status = await page.evaluate(
    async ({ path, body }) => {
      const response = await fetch(`/api/__dev/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      return response.status
    },
    { path, body },
  )
  expect(status, `dev call ${path}`).toBeLessThan(300)
}

/** Each test starts from a known db: the `scenario` param resets it before the app loads. */
export async function start(page: Page, scenario = 'default', path = '/') {
  const separator = path.includes('?') ? '&' : '?'
  await page.goto(`${path}${separator}scenario=${scenario}`)
  await expect(page.getByRole('link', { name: 'Kurio' })).toBeVisible()
}

export async function login(page: Page, user = ana) {
  const main = page.getByRole('main')
  await main.getByLabel('E-mail').fill(user.email)
  await main.getByPlaceholder('Senha').fill(user.password)
  await main.getByRole('button', { name: 'Entrar', exact: true }).click()
  // Login navigates away when the session is ready; waiting avoids racing the next step.
  await expect(page).not.toHaveURL(/\/login/)
}

export async function loginFromHeader(page: Page, user = ana) {
  await page.goto('/login')
  await login(page, user)
  await expect(
    page.getByRole('button', { name: new RegExp(user.name.split(' ')[0]!) }),
  ).toBeVisible()
}

/** Adds the default edition of an NFT through the detail page. */
export async function addToCart(page: Page, nftId: string, quantity = 1) {
  await page.goto(`/nfts/${nftId}`)
  const increase = page.getByRole('button', { name: 'Aumentar quantidade' })
  for (let index = 1; index < quantity; index += 1) await increase.click()
  await page.getByRole('button', { name: 'COMPRAR' }).click()
  await expect(page).toHaveURL(/\/cart$/)
}

export async function armFailure(page: Page, method: string, path: string, status: number) {
  await devCall(page, 'fail-next', { method, path, status })
}
