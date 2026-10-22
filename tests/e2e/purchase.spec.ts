import { expect, test } from '@playwright/test'
import { addToCart, ana, login, start } from './support'

test.describe('compra completa', () => {
  test('do catálogo ao recibo confirmado, removendo só o que foi comprado', async ({ page }) => {
    await start(page)

    // Catalog → detail
    await page.getByRole('link', { name: 'Emerald Ape #042' }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'Emerald Ape #042' })).toBeVisible()
    await expect(page.getByTestId('detail-price')).toHaveText('1.19 ETH')

    // Detail → cart with 2 units of the 1/50 edition
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await page.getByRole('button', { name: 'COMPRAR' }).click()
    await expect(page).toHaveURL(/\/cart$/)
    await expect(page.getByTestId('summary-subtotal')).toHaveText('2.38 ETH')
    await expect(page.getByTestId('summary-total')).toHaveText('2.396 ETH')

    // Checkout requires login and comes back to it afterwards
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/)
    await login(page, ana)
    await expect(page).toHaveURL(/\/checkout$/)

    // The visitor cart was merged into Ana's cart
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible()

    // Wallet connection (prefilled from Ana's saved MetaMask wallet)
    await expect(page.getByLabel('Endereço da carteira')).toHaveValue(/^0xA91F/)
    await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
    await expect(page.getByText('Conectada', { exact: true })).toBeVisible()

    // Review shows the API quote, then confirm
    await page.getByRole('button', { name: 'Revisar compra' }).click()
    const review = page.getByRole('dialog', { name: 'Revise seu pedido' })
    await expect(review).toBeVisible()
    await expect(review.getByTestId('summary-total')).toHaveText('2.396 ETH')
    await review.getByRole('button', { name: 'Confirmar compra' }).click()

    // Pending → confirmed through order.updated
    await expect(page).toHaveURL(/\/orders\/order-/)
    await expect(
      page.getByRole('heading', { name: 'Seus NFTs agora estão na sua carteira' }),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('receipt-total')).toHaveText('2.396 ETH')

    // The purchased line left the cart
    await page.getByRole('link', { name: /Carrinho, / }).click()
    await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
  })

  test('mantém no carrinho os itens que não foram comprados quando o pagamento é recusado', async ({
    page,
  }) => {
    await start(page, 'payment-declined')
    await page.goto('/login')
    await login(page, ana)
    await addToCart(page, 'nft-2')

    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
    await expect(page.getByText('Conectada', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Revisar compra' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar compra' }).click()

    await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible({
      timeout: 15_000,
    })
    await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
    await expect(page.getByRole('link', { name: 'Sage Nomad #009' }).first()).toBeVisible()
  })
})
