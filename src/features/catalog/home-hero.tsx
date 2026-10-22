import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const slides = [
  { image: '/assets/nfts/ape-glasses.webp', alt: 'Macaco de óculos redondos e jaqueta verde' },
  { image: '/assets/nfts/ape-turtleneck.webp', alt: 'Macaco de gola alta e blazer claro' },
  { image: '/assets/nfts/ape-headphones.webp', alt: 'Macaco ruivo com fones de ouvido' },
]

export function HomeHero() {
  const [active, setActive] = useState(0)
  const slide = slides[active] ?? slides[0]!

  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto max-w-[1440px] px-4 pt-6 md:px-10 md:pt-8 xl:px-[120px]"
    >
      <div className="relative grid grid-cols-[1.15fr_1fr] items-center gap-3 overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_40%_45%,#7a4a28_0%,#3d2414_45%,var(--color-surface-card)_100%)] p-4 sm:gap-6 sm:p-6 md:grid-cols-[1fr_minmax(0,450px)] md:rounded-none md:bg-none md:p-0">
        <div className="flex flex-col gap-2 sm:gap-4 md:pl-10">
          <p className="text-sm sm:text-base md:text-[15px]">Bem-vindo à Kurio</p>
          <h1
            id="hero-title"
            className="text-lg leading-7 font-bold uppercase sm:text-[28px] sm:leading-[44px] lg:text-[43px] lg:leading-[70px]"
          >
            Seja dono do futuro <br className="hidden md:block" />
            da arte digital
          </h1>
          <p className="text-sand line-clamp-3 max-w-[560px] text-xs leading-5 sm:line-clamp-none sm:text-base sm:leading-6 md:text-[15px]">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital
            rara, apoie artistas e tenha uma parte da cultura da internet.
          </p>
          <Link
            to="/"
            hash="catalogo"
            className="text-brand md:bg-brand md:text-ink md:hover:bg-brand-light inline-flex w-fit items-center gap-2 font-bold uppercase md:rounded-md md:px-7 md:py-2.5"
          >
            Explorar
            <ArrowRight className="size-5 md:hidden" aria-hidden />
          </Link>
          <div
            className="flex gap-2 md:mt-8 md:mr-24 md:ml-auto"
            role="group"
            aria-label="Destaques do banner"
          >
            {slides.map((item, index) => (
              <button
                key={item.image}
                type="button"
                aria-label={`Mostrar destaque ${index + 1}`}
                aria-pressed={index === active}
                onClick={() => setActive(index)}
                // 24px hit area around the 12px dot (minimum touch target).
                className={cn(
                  'before:bg-brand grid size-6 place-items-center before:size-3 before:rounded-full before:transition before:content-[""]',
                  index !== active && 'before:opacity-50',
                )}
              />
            ))}
          </div>
        </div>
        <img
          src={slide.image}
          alt={slide.alt}
          width={450}
          height={450}
          // The hero art is the largest element on first paint, so it is fetched first.
          fetchPriority="high"
          className="aspect-square w-full rounded-[20px] object-cover md:rounded-[24px]"
        />
      </div>
    </section>
  )
}
