import { Link } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'

type NotFoundProps = {
  title?: string
  description?: string
}

export function NotFound({
  title = 'Página não encontrada',
  description = 'O endereço acessado não existe ou foi removido.',
}: NotFoundProps) {
  return (
    <section className="mx-auto flex max-w-[1440px] flex-col items-start gap-4 px-4 py-24 md:px-[120px]">
      <p className="text-accent-text text-sm">Erro 404</p>
      <h1 className="text-2xl font-bold uppercase md:text-[28px]">{title}</h1>
      <p className="text-sand">{description}</p>
      <Link to="/" className={buttonVariants()}>
        Voltar ao início
      </Link>
    </section>
  )
}
