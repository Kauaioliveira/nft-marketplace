import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/page-placeholder'

export const Route = createFileRoute('/cart')({
  component: CartPage,
})

function CartPage() {
  return <PagePlaceholder title="Carrinho de NFTs" />
}
