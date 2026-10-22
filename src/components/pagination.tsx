import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type PaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

const itemClass =
  'grid size-9 place-items-center rounded border border-border-soft text-sm hover:bg-surface-raised disabled:pointer-events-none disabled:opacity-40'

function visiblePages(page: number, total: number) {
  const pages = new Set([1, total, page - 1, page, page + 1])
  return [...pages].filter((value) => value >= 1 && value <= total).sort((a, b) => a - b)
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null
  const pages = visiblePages(page, totalPages)
  return (
    <nav aria-label="Paginação" className="flex justify-end">
      <ul className="flex items-center gap-2">
        <li>
          <button
            type="button"
            className={itemClass}
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
        </li>
        {pages.map((value, index) => (
          <li key={value} className="flex items-center gap-2">
            {index > 0 && value - (pages[index - 1] ?? value) > 1 && <span aria-hidden>…</span>}
            <button
              type="button"
              className={cn(
                itemClass,
                value === page && 'border-brand bg-brand text-ink hover:bg-brand font-bold',
              )}
              aria-current={value === page ? 'page' : undefined}
              aria-label={`Página ${value}`}
              onClick={() => onPageChange(value)}
            >
              {value}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            className={itemClass}
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            aria-label="Próxima página"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </li>
      </ul>
    </nav>
  )
}
