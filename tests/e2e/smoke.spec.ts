import { expect, test } from '@playwright/test'

test.describe('smoke', () => {
  test('loads the catalog from the mock API and handles unknown routes', async ({ page }) => {
    await page.goto('/?scenario=default')

    const list = page.getByRole('list', { name: 'NFTs' })
    await expect(list.getByRole('listitem')).toHaveCount(12)
    await expect(page.getByText('40 NFTs encontrados')).toBeVisible()

    await page.goto('/rota-que-nao-existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })

  test('receives a price change through Socket.IO', async ({ page }) => {
    await page.goto('/?scenario=default')
    await expect(page.getByRole('list', { name: 'NFTs' }).getByRole('listitem')).toHaveCount(12)
    await expect(page.getByTestId('price-nft-40')).toHaveText('3.1 ETH')

    await page.getByRole('button', { name: 'Cenários' }).click()
    await page.getByRole('button', { name: 'Simular alteração de preço' }).click()

    // Neither the panel nor the request refresh the list: only the socket event does.
    await expect(page.getByTestId('price-nft-40')).toHaveText('3.41 ETH')
    await expect(page.getByTestId('live-region')).toHaveText('Preço de Semente Rara atualizado.')
  })
})
