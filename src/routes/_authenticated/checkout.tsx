import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/page-placeholder'

export const Route = createFileRoute('/_authenticated/checkout')({
  component: CheckoutPage,
})

function CheckoutPage() {
  return <PagePlaceholder title="Pagamento" />
}
