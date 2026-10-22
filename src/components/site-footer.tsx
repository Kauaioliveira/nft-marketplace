import { Link } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { categoryLabels } from '@/lib/labels'

const highlights = [
  {
    letter: 'W',
    title: 'Segurança da carteira',
    text: 'Proteja sua carteira e colecione arte digital verificada com confiança.',
  },
  {
    letter: 'C',
    title: 'Criadores em destaque',
    text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.',
  },
  {
    letter: 'D',
    title: 'Alertas de lançamentos',
    text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.',
  },
]

const helpLinks = [
  'Central de ajuda',
  'Como comprar NFTs',
  'Carteira e segurança',
  'Política do mercado',
  'Denunciar item',
]
const footerCategories = ['digital-art', 'photography', 'music', '3d', 'utility'] as const

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-24 w-full max-w-[1440px] px-4 pb-6 md:px-[120px]">
      <div className="bg-surface-card">
        <div className="grid grid-cols-1 gap-8 px-6 py-8 md:grid-cols-2 lg:grid-cols-4 lg:px-12">
          {highlights.map((item) => (
            <div key={item.title} className="lg:border-brand lg:border-r lg:pr-6">
              <span
                aria-hidden
                className="bg-brand text-ink mb-3 grid size-[74px] place-items-center rounded-full text-2xl font-bold"
              >
                {item.letter}
              </span>
              <h2 className="mb-2 text-lg font-bold">{item.title}</h2>
              <p className="text-sand text-[15px] leading-[22px]">{item.text}</p>
            </div>
          ))}
          <NewsletterForm />
        </div>

        <div className="bg-surface-dark grid grid-cols-1 gap-4 px-8 py-6 text-[15px] sm:grid-cols-2 lg:grid-cols-4">
          <span className="font-bold tracking-[0.06em]">KURIO</span>
          <span>Feito para colecionadores, criadores e cultura</span>
          <span>contato@email.com</span>
          <span>+55 11 4002 8922</span>
        </div>

        <div className="grid grid-cols-1 gap-8 px-8 py-8 sm:grid-cols-2 lg:grid-cols-4">
          <nav aria-label="Meu perfil">
            <h2 className="mb-3 text-lg font-bold">Meu perfil</h2>
            <ul className="space-y-2 text-[15px]">
              <li>
                <Link to="/profile" className="hover:text-brand">
                  Meu perfil
                </Link>
              </li>
              <li>
                <Link to="/wallets" className="hover:text-brand">
                  Carteiras
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-brand">
                  Carrinho
                </Link>
              </li>
            </ul>
          </nav>
          <div>
            <h2 className="mb-3 text-lg font-bold">Central de ajuda</h2>
            {/* Editorial and support pages are outside this delivery, so these are plain text. */}
            <ul className="text-sand space-y-2 text-[15px]">
              {helpLinks.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
          <nav aria-label="Coleções">
            <h2 className="mb-3 text-lg font-bold">Coleções</h2>
            <ul className="space-y-2 text-[15px]">
              {footerCategories.map((category) => (
                <li key={category}>
                  <Link
                    to="/"
                    search={{ category: [category] }}
                    hash="catalogo"
                    className="hover:text-brand"
                  >
                    {categoryLabels[category]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <h2 className="mb-3 text-lg font-bold">Carteiras compatíveis</h2>
            <p className="border-border-soft bg-surface-dark text-accent-text inline-block rounded border px-3 py-1.5 text-[11px] font-bold tracking-wide">
              METAMASK · WALLETCONNECT · COINBASE
            </p>
          </div>
        </div>
      </div>
      <p className="pt-5 text-center text-[15px]">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}

function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Informe um e-mail válido.')
      return
    }
    setError(null)
    // There is no newsletter API in this delivery, so we do not pretend the signup worked.
    toast.info('A newsletter ainda não está disponível nesta versão.')
  }

  return (
    <form onSubmit={submit} noValidate aria-labelledby="newsletter-title">
      <h2 id="newsletter-title" className="mb-3 text-lg leading-tight font-bold">
        Antecipe-se ao próximo lançamento
      </h2>
      <div className="flex">
        <label htmlFor="newsletter-email" className="sr-only">
          E-mail
        </label>
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="digite seu e-mail..."
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'newsletter-error' : undefined}
          className="bg-surface-dark placeholder:text-sand/80 min-w-0 flex-1 rounded-l-md px-3 py-2 text-[15px]"
        />
        <button
          type="submit"
          className="bg-brand text-ink hover:bg-brand-light rounded-r-md px-3 text-lg font-bold"
        >
          Enviar
        </button>
      </div>
      {error && (
        <p id="newsletter-error" className="text-coral mt-1 text-sm">
          {error}
        </p>
      )}
      <p className="text-sand mt-3 text-sm leading-[22px]">
        Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
      </p>
    </form>
  )
}
