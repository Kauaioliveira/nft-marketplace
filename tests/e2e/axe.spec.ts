import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { addToCart, ana, login, start } from './support'

async function audit(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const summary = results.violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.nodes
        .map((node) => node.target.join(' '))
        .slice(0, 4)
        .join(' | ')}`,
  )
  expect(summary, label).toEqual([])
}

test.describe('auditoria automática de acessibilidade (axe)', () => {
  // Four full-page audits per test take longer than the default timeout on the mobile profile.
  test.describe.configure({ timeout: 90_000 })

  test('páginas públicas', async ({ page }) => {
    await start(page)
    await expect(page.getByTestId('nft-card')).toHaveCount(9)
    await audit(page, 'início')

    await page.goto('/nfts/nft-1')
    await expect(page.getByTestId('detail-price')).toBeVisible()
    await audit(page, 'detalhe')

    await page.goto('/login')
    await audit(page, 'login')
    await page.goto('/register')
    await audit(page, 'cadastro')
  })

  test('páginas privadas', async ({ page }) => {
    await start(page, 'default', '/login')
    await login(page, ana)
    await addToCart(page, 'nft-1')
    await audit(page, 'carrinho')
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page.getByLabel('Endereço da carteira')).toHaveValue(/^0xA91F/)
    await audit(page, 'pagamento')
    await page.goto('/profile')
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Ana Souza')
    await audit(page, 'perfil')
    await page.goto('/wallets')
    await expect(page.getByRole('form', { name: 'Carteira principal' })).toBeVisible()
    await audit(page, 'carteiras')
  })
})
