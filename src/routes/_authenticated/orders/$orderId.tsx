import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/page-placeholder'

export const Route = createFileRoute('/_authenticated/orders/$orderId')({
  component: OrderConfirmationPage,
})

function OrderConfirmationPage() {
  const { orderId } = Route.useParams()
  return <PagePlaceholder title={`Pedido ${orderId}`} />
}
