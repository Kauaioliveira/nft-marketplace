import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/page-placeholder'

export const Route = createFileRoute('/_authenticated/wallets')({
  component: WalletsPage,
})

function WalletsPage() {
  return <PagePlaceholder title="Carteiras" />
}
