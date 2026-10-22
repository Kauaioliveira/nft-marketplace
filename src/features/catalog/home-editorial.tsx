import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

const promos = [
  {
    title: 'Lançamentos gênesis de edição limitada',
    text: 'Colecione edições escassas diretamente dos criadores antes da revelação pública.',
    image: '/assets/nfts/ape-glasses-sm.webp',
    search: { tab: 'new' as const },
  },
  {
    title: 'Arte digital selecionada e muito mais',
    text: 'Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.',
    image: '/assets/nfts/ape-turtleneck-sm.webp',
    search: { category: ['digital-art' as const] },
  },
]

const articles = [
  {
    date: '12 de setembro',
    minutes: 6,
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    image: '/assets/nfts/ape-turtleneck-sm.webp',
  },
  {
    date: '13 de setembro',
    minutes: 2,
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
    image: '/assets/nfts/ape-glasses-sm.webp',
  },
  {
    date: '15 de setembro',
    minutes: 3,
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    image: '/assets/nfts/ape-bucket-hat-sm.webp',
  },
  {
    date: '15 de setembro',
    minutes: 2,
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
    image: '/assets/nfts/ape-headphones-sm.webp',
  },
]

export function HomeEditorial() {
  return (
    <>
      <section
        aria-label="Destaques"
        className="mx-auto mt-24 grid max-w-[1440px] gap-6 px-4 md:px-[120px] lg:grid-cols-2"
      >
        {promos.map((promo) => (
          <article
            key={promo.title}
            className="bg-surface-card grid grid-cols-[minmax(0,287px)_1fr] items-center overflow-hidden"
          >
            <img
              src={promo.image}
              alt=""
              width={287}
              height={250}
              loading="lazy"
              className="h-full w-full rounded-[20px] object-cover"
            />
            <div className="flex flex-col items-end gap-3 p-4 text-right md:p-6">
              <h2 className="text-lg font-bold md:text-xl">{promo.title}</h2>
              <p className="text-sand text-sm md:text-[15px]">{promo.text}</p>
              <Link
                to="/"
                search={promo.search}
                hash="catalogo"
                className="bg-brand text-ink hover:bg-brand-light inline-flex items-center gap-2 rounded-md px-6 py-2.5"
              >
                Explorar
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section
        aria-labelledby="journal-title"
        className="mx-auto mt-24 max-w-[1440px] px-4 md:px-[120px]"
      >
        <h2 id="journal-title" className="text-center text-[28px] font-bold">
          Diário da Cunhagem
        </h2>
        <p className="text-sand mt-3 text-center text-[15px]">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
        <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {articles.map((article) => (
            <li key={article.title} className="bg-surface-card overflow-hidden rounded-lg">
              <img
                src={article.image}
                alt=""
                width={268}
                height={195}
                loading="lazy"
                className="aspect-[268/195] w-full object-cover"
              />
              <div className="p-4">
                <p className="text-sand text-[13px]">
                  {article.date} | Leitura de {article.minutes} min
                </p>
                <h3 className="mt-2 text-lg font-bold">{article.title}</h3>
                <p className="text-sand mt-2 text-sm">{article.text}</p>
                {/* Articles are outside this delivery, so there is no "read more" link. */}
                <p className="text-accent-text mt-2 text-sm font-bold">Em breve</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
