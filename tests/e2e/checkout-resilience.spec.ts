import { expect, test, type Page } from '@playwright/test'
import { addToCart, ana, login, mockStats, start } from './support'

async function openReview(page: Page, scenario: string, nftId = 'nft-2') {
  await start(page, scenario, '/login')
  await login(page, ana)
  await addToCart(page, nftId)
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
  await expect(page.getByText('Conectada', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Revisar compra' }).click()
  const review = page.getByRole('dialog', { name: 'Revise seu pedido' })
  await expect(review).toBeVisible()
  return review
}

test.describe('checkout resiliente', () => {
  test('preço alterado via Socket.IO bloqueia a cotação antiga e exige nova confirmação', async ({
    page,
  }) => {
    const review = await openReview(page, 'price-change')
    await expect(review.getByTestId('summary-subtotal')).toHaveText('1.69 ETH')

    // The mock changes the price after the quote and emits nft.updated.
    await expect(review.getByText(/O preço de Sage Nomad #009 mudou/)).toBeVisible({
      timeout: 10_000,
    })
    await expect(review.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()

    await review.getByRole('button', { name: 'Atualizar cotação' }).click()
    await expect(review.getByTestId('summary-subtotal')).toHaveText('1.9435 ETH')
    await review.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByTestId('receipt-total')).toHaveText('1.9595 ETH', { timeout: 15_000 })
  })

  test('timeout após criar o pedido recupera o mesmo pedido pela chave de idempotência', async ({
    page,
  }) => {
    test.setTimeout(60_000)
    const review = await openReview(page, 'order-timeout')
    await review.getByRole('button', { name: 'Confirmar compra' }).click()

    // The first response is lost (client timeout after 8s); the retry reuses the same key.
    await expect(review.getByText(/Não recebemos a confirmação do pedido/)).toBeVisible({
      timeout: 15_000,
    })
    await review.getByRole('button', { name: 'Tentar novamente' }).click()
    await expect(page.getByTestId('receipt')).toBeVisible({ timeout: 15_000 })
    const firstOrderUrl = page.url()
    expect((await mockStats(page)).orders).toBe(1)

    // A refresh shows the same confirmed order, and the cart holds nothing to buy twice.
    await page.reload()
    await expect(page.getByTestId('receipt')).toBeVisible()
    expect(page.url()).toBe(firstOrderUrl)
    await page.goto('/cart')
    await expect(page.getByText('Seu carrinho está vazio.')).toBeVisible()
  })

  test('clique repetido em confirmar cria um único pedido', async ({ page }) => {
    const review = await openReview(page, 'default')
    await review.getByRole('button', { name: 'Confirmar compra' }).dblclick()
    await expect(page.getByTestId('receipt')).toBeVisible({ timeout: 15_000 })
    expect((await mockStats(page)).orders).toBe(1)
  })

  test('carteira que recusa a conexão mostra o erro e não deixa revisar', async ({ page }) => {
    await start(page, 'wallet-rejected', '/login')
    await login(page, ana)
    await addToCart(page, 'nft-2')
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
    await expect(
      page.getByRole('alert').filter({ hasText: 'A conexão foi recusada na carteira.' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Revisar compra' }).click()
    await expect(
      page.getByText('Conecte a carteira selecionada antes de revisar o pedido.'),
    ).toBeVisible()
  })
})
