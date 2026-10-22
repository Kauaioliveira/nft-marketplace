import { ZoomIn } from 'lucide-react'
import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export function NftGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0)
  const current = images[active] ?? images[0]!

  return (
    <div className="grid grid-cols-[100px_1fr] gap-7 max-md:grid-cols-1">
      <ul aria-label="Imagens do NFT" className="flex gap-4 max-md:order-2 md:flex-col">
        {images.map((image, index) => (
          <li key={`${image}-${index}`}>
            <button
              type="button"
              aria-label={`Ver imagem ${index + 1} de ${images.length}`}
              aria-pressed={index === active}
              onClick={() => setActive(index)}
              className={cn(
                'block size-[72px] overflow-hidden rounded-md border-2 md:size-[100px]',
                index === active
                  ? 'border-brand'
                  : 'border-transparent opacity-80 hover:opacity-100',
              )}
            >
              <img
                src={image.replace('.webp', '-sm.webp')}
                alt=""
                width={100}
                height={100}
                className="size-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>
      <div className="bg-surface-card relative p-5">
        <img
          src={current}
          alt={`Arte do NFT ${name}, imagem ${active + 1} de ${images.length}`}
          width={404}
          height={404}
          fetchPriority="high"
          className="aspect-square w-full rounded-[24px] object-cover"
        />
        <Dialog>
          <DialogTrigger
            render={
              <button
                type="button"
                aria-label="Ampliar imagem"
                className="bg-ink text-foreground hover:text-brand absolute top-3 right-3 grid size-9 place-items-center rounded-full"
              />
            }
          >
            <ZoomIn className="size-5" aria-hidden />
          </DialogTrigger>
          <DialogContent className="bg-ink max-w-[min(90vw,800px)] p-4 sm:max-w-[min(90vw,800px)]">
            <DialogTitle className="mb-2">{name}</DialogTitle>
            <img
              src={current}
              alt={`Arte do NFT ${name} ampliada`}
              width={800}
              height={800}
              className="aspect-square w-full rounded-xl object-cover"
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
