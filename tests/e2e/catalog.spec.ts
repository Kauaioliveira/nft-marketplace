import { expect, test } from '@playwright/test'
import { start } from './support'

test.describe('catálogo', () => {
  test('busca, filtros combinados, ordenação e paginação ficam na URL e voltam pelo histórico', async ({
    page,
  }) => {
    await start(page)
    const results = page.getByRole('list', { name: 'NFTs' })
    await expect(page.getByText('40 NFTs encontrados')).toBeVisible()

    // Pagination
    await page.getByRole('button', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(page.getByRole('button', { name: 'Página 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )

    // A filter change goes back to page 1
    await page.getByRole('combobox', { name: /Ordenar por/ }).selectOption('price-asc')
    await expect(page).toHaveURL(/sort=price-asc/)
    await expect(page).not.toHaveURL(/page=2/)
    await expect(results.getByTestId(/^price-/).first()).toHaveText('0.02 ETH')

    // Search and combined filters
    await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('golden')
    await expect(page).toHaveURL(/q=golden/)
    await expect(page.getByText('2 NFTs encontrados')).toBeVisible()

    await page.getByRole('searchbox', { name: 'Buscar NFTs' }).fill('')
    await expect(page.getByText('40 NFTs encontrados')).toBeVisible()
    const isDesktop = (page.viewportSize()?.width ?? 0) >= 1024
    if (!isDesktop) await page.getByRole('button', { name: /^Filtros/ }).click()
    await page.getByRole('checkbox', { name: /Música/ }).check()
    await page.getByRole('checkbox', { name: /Polygon/ }).check()
    await expect(page).toHaveURL(/category=/)
    await expect(page).toHaveURL(/network=/)
    if (!isDesktop) await page.keyboard.press('Escape')
    // Golden Beat plus four generated NFTs are music on Polygon.
    await expect(results.getByRole('listitem')).toHaveCount(5)
    await expect(results.getByRole('link', { name: 'Golden Beat #207' })).toBeVisible()

    // Refresh keeps everything
    await page.reload()
    await expect(results.getByRole('listitem')).toHaveCount(5)

    // Back undoes the last filter, forward reapplies it
    await page.goBack()
    await expect(page).not.toHaveURL(/network=/)
    await page.goForward()
    await expect(page).toHaveURL(/network=/)
    await expect(results.getByRole('listitem')).toHaveCount(5)
  })

  test('mostra vazio, erro e recuperação após nova tentativa', async ({ page }) => {
    await start(page, 'default', '/?q=inexistente')
    await expect(page.getByText('Nenhum NFT encontrado.')).toBeVisible()
    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(page.getByText('40 NFTs encontrados')).toBeVisible()

    await start(page, 'offline')
    await expect(page.getByText('Não foi possível carregar o catálogo.')).toBeVisible({
      timeout: 15_000,
    })
  })

  test('acesso direto ao detalhe e NFT inexistente', async ({ page }) => {
    await start(page, 'default', '/nfts/nft-6')
    await expect(page.getByRole('heading', { level: 1, name: 'Ivory Baron #088' })).toBeVisible()
    await page.goto('/nfts/nao-existe')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await page.goto('/rota/que/nao/existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
  })

  test('edição esgotada fica indisponível no detalhe', async ({ page }) => {
    // nft-5 has its 1/1 edition sold out in the fixtures.
    await start(page, 'default', '/nfts/nft-5')
    await expect(page.getByRole('radio', { name: /^1\/1 / })).toBeDisabled()
  })

  test('filtros combinados no painel (drawer no mobile): URL legível, opção sem resultado e limpar', async ({
    page,
  }) => {
    await start(page)
    const results = page.getByRole('list', { name: 'NFTs' })
    const isDesktop = (page.viewportSize()?.width ?? 0) >= 1024
    if (!isDesktop) await page.getByRole('button', { name: /^Filtros/ }).click()
    // On mobile the filters live in the drawer; the visible copy is the one to use.
    const panel = isDesktop
      ? page.getByRole('complementary', { name: 'Filtros do catálogo' })
      : page.getByRole('dialog')

    await panel.getByRole('checkbox', { name: /Música/ }).check()
    await panel.getByLabel('Preço mínimo em ETH').fill('0,5')
    await panel.getByLabel('Preço máximo em ETH').fill('2')
    await panel.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page).toHaveURL(/[?&]category=music(&|$)/)
    await expect(page).toHaveURL(/minPrice=0\.5/)
    await expect(page).toHaveURL(/maxPrice=2(&|$)/)

    // Music between 0.5 and 2 ETH only exists on Polygon, so Ethereum has nothing to add.
    await expect(panel.getByRole('checkbox', { name: /Ethereum/ })).toBeDisabled()
    if (!isDesktop) await page.keyboard.press('Escape')
    await expect(page.getByText('1 NFT encontrado')).toBeVisible()
    await expect(results.getByRole('link', { name: 'Golden Beat #207' })).toBeVisible()

    await page.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(page.getByText('40 NFTs encontrados')).toBeVisible()
    await expect(page).not.toHaveURL(/category=/)
  })
})
