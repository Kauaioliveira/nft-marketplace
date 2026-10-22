import { expect, test, type Page } from '@playwright/test'
import { addToCart, ana, login, start } from './support'

/** Waits for fonts, images and toasts so the screenshot only shows settled content. */
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() =>
    [...document.images]
      .filter((image) => image.loading !== 'lazy')
      .every((image) => image.complete),
  )
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 10_000 })
  await page.mouse.move(0, 0)
}

const options = { animations: 'disabled' as const, maxDiffPixelRatio: 0.01 }

test.describe('regressão visual', () => {
  test('início', async ({ page }) => {
    await start(page)
    await expect(page.getByTestId('nft-card')).toHaveCount(9)
    await settle(page)
    await expect(page).toHaveScreenshot('inicio.png', options)
  })

  test('detalhe do NFT', async ({ page }) => {
    await start(page, 'default', '/nfts/nft-1')
    await expect(page.getByTestId('detail-price')).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('detalhe.png', options)
  })

  test('carrinho', async ({ page }) => {
    await start(page)
    await addToCart(page, 'nft-1', 2)
    await addToCart(page, 'nft-5')
    await expect(page.getByTestId('summary-total')).toHaveText('3.786 ETH')
    await settle(page)
    await expect(page).toHaveScreenshot('carrinho.png', options)
  })

  test('pagamento', async ({ page }) => {
    await start(page, 'default', '/login')
    await login(page, ana)
    await addToCart(page, 'nft-1', 2)
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page.getByLabel('Endereço da carteira')).toHaveValue(/^0xA91F/)
    await settle(page)
    await expect(page).toHaveScreenshot('pagamento.png', options)
  })
})
