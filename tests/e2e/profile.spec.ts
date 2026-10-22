import { expect, test } from '@playwright/test'
import { ana, login, start } from './support'

// 1x1 transparent PNG.
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

test.describe('perfil e carteiras', () => {
  test.beforeEach(async ({ page }) => {
    await start(page, 'default', '/login')
    await login(page, ana)
  })

  test('edita dados com validação, conflito da API e persistência após refresh', async ({
    page,
  }) => {
    await page.goto('/profile')
    const name = page.getByLabel('Nome de exibição')
    await expect(name).toHaveValue('Ana Souza')

    await name.fill('A')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('Informe como quer ser chamado.')).toBeVisible()

    await name.fill('Ana S.')
    await page.getByLabel('Nome de usuário').fill('bruno.lima')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByText('Este nome de usuário já está em uso.')).toBeVisible()

    await page.getByLabel('Nome de usuário').fill('ana.s')
    await page.getByRole('button', { name: 'Salvar', exact: true }).click()
    await expect(page.getByTestId('live-region')).toHaveText('Dados do perfil salvos.')

    await page.reload()
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Ana S.')
    await expect(page.getByRole('button', { name: /Ana S\./ })).toBeVisible()
  })

  test('avatar: envia, rejeita arquivo grande e remove', async ({ page }) => {
    await page.goto('/profile')
    const input = page.getByTestId('avatar-input')

    await input.setInputFiles({
      name: 'grande.png',
      mimeType: 'image/png',
      buffer: Buffer.alloc(300_000, 1),
    })
    await expect(page.getByText('A imagem precisa ter no máximo 200 KB.').first()).toBeVisible()

    await input.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: tinyPng })
    await expect(page.getByRole('img', { name: 'Seu avatar' })).toBeVisible()

    await page.getByRole('button', { name: 'Remover' }).click()
    await expect(page.getByRole('img', { name: 'Sem avatar' })).toBeVisible()
  })

  test('altera a senha com validação e entra com a nova', async ({ page }) => {
    await page.goto('/profile')
    const form = page.getByRole('form', { name: 'Alterar senha' })
    await form.getByLabel('Senha atual').fill('Errada123')
    await form.getByLabel('Nova senha', { exact: true }).fill('NovaSenha9')
    await form.getByLabel('Confirmar nova senha').fill('Diferente9')
    await form.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(form.getByText('As senhas não conferem.')).toBeVisible()

    await form.getByLabel('Confirmar nova senha').fill('NovaSenha9')
    await form.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(form.getByText('A senha atual está incorreta.')).toBeVisible()

    await form.getByLabel('Senha atual').fill(ana.password)
    await form.getByRole('button', { name: 'Alterar senha' }).click()
    await expect(page.getByTestId('live-region')).toHaveText('Senha alterada.')

    await page
      .getByRole('navigation', { name: 'Meu perfil' })
      .getByRole('button', { name: 'Sair' })
      .click()
    await page.goto('/login')
    await login(page, { ...ana, password: 'NovaSenha9' })
    await expect(page.getByRole('button', { name: /Ana Souza/ })).toBeVisible()
  })

  test('carteiras principal e secundária com validação e conflito de endereço', async ({
    page,
  }) => {
    await page.goto('/wallets')
    const primary = page.getByRole('form', { name: 'Carteira principal' })
    await expect(primary.getByLabel('Endereço da carteira')).toHaveValue(/^0xA91F/)

    await primary.getByLabel('Endereço da carteira').fill('0x123')
    await primary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(primary.getByText(/Endereço inválido/)).toBeVisible()
    await primary
      .getByLabel('Endereço da carteira')
      .fill('0xA91F3c7B2d4E5f6071829304a5B6c7D8e9F0E82C')

    const secondarySection = page.getByRole('region', { name: 'Carteira secundária' })
    await secondarySection.getByRole('button', { name: 'Adicionar' }).click()
    const secondary = page.getByRole('form', { name: 'Carteira secundária' })
    await secondary.getByLabel('Apelido da carteira').fill('Reserva')
    await secondarySection.getByLabel('Igual à carteira principal').check()
    await expect(secondary.getByLabel('Rede')).toHaveValue('ethereum')
    await secondary
      .getByLabel('Endereço da carteira')
      .fill('0xA91F3c7B2d4E5f6071829304a5B6c7D8e9F0E82C')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(
      secondary.getByText('Este endereço já está cadastrado na outra carteira.'),
    ).toBeVisible()

    await secondary
      .getByLabel('Endereço da carteira')
      .fill('0x00000000000000000000000000000000000000B2')
    await secondary.getByRole('button', { name: 'Salvar carteira' }).click()
    await expect(page.getByTestId('live-region')).toHaveText('Carteira secundária salva.')

    await page.reload()
    await expect(
      page.getByRole('form', { name: 'Carteira secundária' }).getByLabel('Endereço da carteira'),
    ).toHaveValue('0x00000000000000000000000000000000000000B2')
  })
})
