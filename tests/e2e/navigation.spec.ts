import { expect, test, type Page } from '@playwright/test'
import { addToCart, start } from './support'

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 768

/** The visible navigation: header menu from tablet up, bottom bar on phones. */
function nav(page: Page) {
  return isDesktop(page)
    ? page.getByRole('navigation', { name: 'Principal' })
    : page.getByRole('navigation', { name: 'Navegação rápida' })
}

test.describe('navegação e busca do cabeçalho', () => {
  test('a aba ativa acompanha a seção atual', async ({ page }) => {
    await start(page)
    const current = nav(page).locator('[aria-current="page"]')
    await expect(current).toHaveCount(1)
    await expect(current).toHaveText('Início')

    await page.goto('/nfts/nft-1')
    await expect(current).toHaveCount(1)
    await expect(current).toHaveText(isDesktop(page) ? 'Mercado' : 'Início')

    await addToCart(page, 'nft-1')
    await expect(current).toHaveCount(1)
    await expect(current).toHaveText(isDesktop(page) ? 'Mercado' : 'Carrinho')
  })

  test('busca do cabeçalho leva ao catálogo filtrado e funciona pelo teclado', async ({ page }) => {
    await start(page, 'default', '/nfts/nft-6')
    await page.getByRole('button', { name: 'Buscar NFTs' }).click()
    const field = page.getByRole('searchbox', { name: 'Buscar por nome, coleção ou criador' })
    await expect(field).toBeFocused()

    // Escape closes and gives focus back to the icon.
    await page.keyboard.press('Escape')
    await expect(field).toBeHidden()
    await expect(page.getByRole('button', { name: 'Buscar NFTs' })).toBeFocused()

    await page.keyboard.press('Enter')
    await page.keyboard.type('golden')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/\?q=golden#catalogo$/)
    await expect(page.getByText('2 NFTs encontrados')).toBeVisible()
    await expect(page.getByRole('searchbox', { name: 'Buscar NFTs' })).toHaveValue('golden')
  })
})
