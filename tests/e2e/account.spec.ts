import { expect, test } from '@playwright/test'
import { addToCart, ana, bruno, devCall, login, start } from './support'

test.describe('conta e sessão', () => {
  test('cadastro valida campos e trata conflito de e-mail', async ({ page }) => {
    await start(page, 'default', '/register')
    const main = page.getByRole('main')
    await main.getByRole('button', { name: 'Criar conta' }).click()
    await expect(
      main.getByText('Use de 3 a 20 letras, números, ponto ou sublinhado.'),
    ).toBeVisible()

    await main.getByPlaceholder('Nome de usuário').fill('nova.colecionadora')
    await main.getByPlaceholder('Digite seu e-mail').fill(ana.email)
    await main.getByPlaceholder('Senha', { exact: true }).fill('Senha123!')
    await main.getByPlaceholder('Confirmar senha').fill('Senha123!')
    await main.getByRole('button', { name: 'Criar conta' }).click()
    await expect(main.getByText('Este e-mail já está cadastrado.')).toBeVisible()

    await main.getByPlaceholder('Digite seu e-mail').fill('nova@example.com')
    await main.getByRole('button', { name: 'Criar conta' }).click()
    await expect(page.getByRole('button', { name: /nova\.colecionadora/ })).toBeVisible()
  })

  test('login com senha errada, sessão após refresh e logout', async ({ page }) => {
    await start(page, 'default', '/login')
    const main = page.getByRole('main')
    await main.getByLabel('E-mail').fill(ana.email)
    await main.getByPlaceholder('Senha').fill('errada123')
    await main.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(main.getByText('E-mail ou senha incorretos.')).toBeVisible()

    await login(page, ana)
    await page.reload()
    await expect(page.getByRole('button', { name: /Ana Souza/ })).toBeVisible()

    await page.getByRole('button', { name: /Ana Souza/ }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await expect(page.getByRole('banner').getByRole('link', { name: 'Entrar' })).toBeVisible()
    await page.goto('/checkout')
    await expect(page).toHaveURL(/\/login\?redirect=/)
  })

  test('troca de usuário não mostra favoritos nem carrinho do anterior', async ({ page }) => {
    await start(page, 'default', '/login')
    await login(page, ana)
    await addToCart(page, 'nft-1')
    await page.goto('/nfts/nft-3')
    // Ana has nft-3 among her favorites in the fixtures.
    await expect(page.getByRole('button', { name: 'Favoritado', exact: true })).toBeVisible()

    await page.getByRole('button', { name: /Ana Souza/ }).click()
    await page.getByRole('menuitem', { name: 'Sair' }).click()
    await page.goto('/login')
    await login(page, bruno)

    await page.goto('/nfts/nft-3')
    await expect(page.getByRole('button', { name: 'Favoritar', exact: true })).toBeVisible()
    await page.goto('/cart')
    await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
  })

  test('sessão expirada no checkout volta ao login e preserva o rascunho', async ({ page }) => {
    await start(page, 'default', '/login')
    await login(page, ana)
    await addToCart(page, 'nft-2')
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await page.getByLabel('Código de indicação').fill('AMIGO-10')

    await devCall(page, 'expire-sessions')
    // The next authenticated request answers 401. A background refetch may get there before the
    // click, so the click is best effort and the assertions below check the outcome.
    await page
      .getByRole('button', { name: 'Conectar MetaMask' })
      .click({ timeout: 3_000 })
      .catch(() => {})
    await expect(page).toHaveURL(/\/login\?.*reason=expired/)
    await expect(
      page.getByText('Sua sessão expirou. Entre novamente para continuar de onde parou.'),
    ).toBeVisible()

    await login(page, ana)
    await expect(page).toHaveURL(/\/checkout/)
    await expect(page.getByLabel('Código de indicação')).toHaveValue('AMIGO-10')
  })

  test('carrinho do visitante persiste após refresh e é mantido ao entrar', async ({ page }) => {
    await start(page)
    await addToCart(page, 'nft-4', 2)
    await page.reload()
    await expect(page.getByTestId('summary-subtotal')).toHaveText('2.58 ETH')

    await page.goto('/login?redirect=%2Fcart')
    await login(page, ana)
    await expect(page).toHaveURL(/\/cart$/)
    await expect(page.getByTestId('summary-subtotal')).toHaveText('2.58 ETH')
  })
})
