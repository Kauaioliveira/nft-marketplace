import { expect, test } from '@playwright/test'
import { ana, armFailure, start } from './support'

test.describe('teclado, foco e estados de carregamento', () => {
  test('link de pular conteúdo e login inteiro pelo teclado', async ({ page }) => {
    await start(page, 'default', '/login')
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused()

    const main = page.getByRole('main')
    await main.getByLabel('E-mail').focus()
    await page.keyboard.type(ana.email)
    await page.keyboard.press('Tab')
    await page.keyboard.type(ana.password)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: /Ana Souza/ })).toBeVisible()
  })

  test('diálogo prende o foco e devolve ao botão ao fechar', async ({ page }) => {
    await start(page, 'default', '/nfts/nft-1')
    const trigger = page.getByRole('button', { name: 'Ampliar imagem' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Emerald Ape #042' })
    await expect(dialog).toBeVisible()

    // Tabbing several times keeps focus inside the dialog.
    for (let index = 0; index < 4; index += 1) await page.keyboard.press('Tab')
    expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('erros de formulário ficam associados aos campos', async ({ page }) => {
    await start(page, 'default', '/register')
    const main = page.getByRole('main')
    await main.getByRole('button', { name: 'Criar conta' }).click()
    const email = main.getByPlaceholder('Digite seu e-mail')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await email.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`[id="${describedBy}"]`)).toHaveText('Informe seu e-mail.')
  })

  test('skeletons no carregamento lento mantêm o espaço do conteúdo', async ({ page }) => {
    await page.goto('/?scenario=slow')
    await expect(page.getByTestId('nft-card-skeleton')).toHaveCount(9)
    // Measured inside the page in one go: the skeleton may be gone a moment later.
    const skeletonWidth = await page
      .waitForFunction(
        () =>
          document.querySelector('[data-testid="nft-card-skeleton"]')?.getBoundingClientRect()
            .width,
      )
      .then((handle) => handle.jsonValue())
    await expect(page.getByTestId('nft-card').first()).toBeVisible({ timeout: 15_000 })
    const cardBox = await page.getByTestId('nft-card').first().boundingBox()
    // Same column width, so the grid does not jump when data arrives.
    expect(Math.abs(Number(skeletonWidth) - (cardBox?.width ?? 0))).toBeLessThan(2)

    await page.goto('/nfts/nft-2')
    await expect(page.getByRole('status', { name: 'Carregando NFT' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Sage Nomad #009' })).toBeVisible({
      timeout: 15_000,
    })
  })

  test('falha ao carregar mostra erro e recupera com nova tentativa', async ({ page }) => {
    await start(page)
    // Three transient failures in a row exhaust the automatic retries.
    for (let index = 0; index < 3; index += 1) await armFailure(page, 'GET', '/api/nfts/nft-2', 503)
    await page.getByRole('link', { name: 'Sage Nomad #009' }).first().click()
    await expect(page.getByText('Não foi possível carregar este NFT.')).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Sage Nomad #009' })).toBeVisible()
  })

  test('sem rolagem horizontal em 390px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    for (const path of ['/', '/nfts/nft-1', '/cart', '/login']) {
      await start(page, 'default', path)
      await page.waitForTimeout(300)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      )
      expect(overflow, path).toBeLessThanOrEqual(0)
    }
  })
})
