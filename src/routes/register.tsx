import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/page-placeholder'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  return <PagePlaceholder title="Criar conta" />
}
