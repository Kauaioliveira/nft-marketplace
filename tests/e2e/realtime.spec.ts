import { expect, test } from '@playwright/test'
import { addToCart, ana, armFailure, devCall, login, start } from './support'

test.describe('tempo real e favoritos', () => {
  test('nft.updated pelo socket atualiza o catálogo; duplicados e antigos são ignorados', async ({
    page,
  }) => {
    await start(page)
    const price = page.getByTestId('price-nft-1')
    await expect(price).toHaveText('1.19 ETH')

    await page.getByRole('button', { name: 'Cenários' }).click()
    await page.getByRole('button', { name: 'Simular alteração de preço' }).click()
    // Only the socket event refreshes this card; the panel request does not touch the cache.
    await expect(price).toHaveText('1.309 ETH')
    await expect(page.getByTestId('live-region')).toHaveText('Emerald Ape #042 foi atualizado.')

    await devCall(page, 'replay-last-event')
    await devCall(page, 'nfts/nft-1/stale-event')
    await page.waitForTimeout(500)
    await expect(price).toHaveText('1.309 ETH')

    // After a dropped connection the client reconnects and keeps receiving events.
    await devCall(page, 'drop-socket')
    await page.waitForTimeout(1500)
    await devCall(page, 'nfts/nft-1/bump-price')
    await expect(price).toHaveText('1.4399 ETH')
  })

  test('carrinho aberto reflete a mudança de preço e avisa o usuário', async ({ page }) => {
    await start(page)
    await addToCart(page, 'nft-1')
    await expect(page.getByTestId('summary-subtotal')).toHaveText('1.19 ETH')
    await devCall(page, 'nfts/nft-1/bump-price')
    await expect(
      page.getByRole('alert').filter({ hasText: 'mudou de 1.19 ETH para 1.309 ETH' }),
    ).toBeVisible()
    await expect(page.getByTestId('summary-subtotal')).toHaveText('1.309 ETH')
  })

  test('pedido pendente é retomado após refresh sem criar outra compra', async ({ page }) => {
    await start(page, 'default', '/login')
    await login(page, ana)
    await addToCart(page, 'nft-2')
    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await page.getByRole('button', { name: 'Conectar MetaMask' }).click()
    await expect(page.getByText('Conectada', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Revisar compra' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar compra' }).click()

    await expect(
      page.getByRole('heading', { name: 'Aguardando confirmação na rede' }),
    ).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('receipt')).toBeVisible({ timeout: 15_000 })
  })

  test('favorito otimista desfaz em caso de falha e persiste quando dá certo', async ({ page }) => {
    await start(page, 'default', '/login')
    await login(page, ana)
    await page.goto('/nfts/nft-1')
    const favorite = page.getByRole('button', { name: 'Favoritar', exact: true })
    await expect(favorite).toBeVisible()

    await armFailure(page, 'PUT', '/api/favorites/nft-1', 500)
    await favorite.click()
    await expect(
      page.getByText('Não foi possível favoritar. Tente novamente.').first(),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Favoritar', exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Favoritar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Favoritado', exact: true })).toBeVisible()
    // The heart flips before the API answers; wait for the confirmation before reloading.
    await expect(page.getByTestId('live-region')).toHaveText('Adicionado aos favoritos.')
    await page.reload()
    await expect(page.getByRole('button', { name: 'Favoritado', exact: true })).toBeVisible()
  })
})
