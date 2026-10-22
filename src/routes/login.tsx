import { createFileRoute } from '@tanstack/react-router'
import { PagePlaceholder } from '@/components/page-placeholder'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  return <PagePlaceholder title="Entrar" />
}
