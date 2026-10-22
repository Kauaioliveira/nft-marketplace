import { useNavigate } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'

/**
 * Search icon of the header. It opens a field that sends the term to the catalog (`/?q=`), where
 * the results, filters and empty state already live.
 */
export function HeaderSearch() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const close = () => {
    setOpen(false)
    toggleRef.current?.focus()
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const q = term.trim()
    setOpen(false)
    setTerm('')
    void navigate({ to: '/', search: { q: q || undefined }, hash: 'catalogo' })
  }

  return (
    <div className="relative">
      <button
        ref={toggleRef}
        type="button"
        aria-label={open ? 'Fechar busca' : 'Buscar NFTs'}
        aria-expanded={open}
        aria-controls="header-search"
        onClick={() => (open ? close() : setOpen(true))}
        className="hover:bg-secondary rounded-md p-2"
      >
        {open ? <X className="size-6" aria-hidden /> : <Search className="size-6" aria-hidden />}
      </button>
      {open && (
        <form
          id="header-search"
          role="search"
          aria-label="Buscar NFTs"
          onSubmit={submit}
          onKeyDown={(event) => {
            if (event.key === 'Escape') close()
          }}
          className="bg-surface-card border-border-soft absolute top-full right-0 z-40 mt-2 flex w-[min(320px,calc(100vw-2rem))] gap-2 rounded-lg border p-2 shadow-xl"
        >
          <label htmlFor="header-search-input" className="sr-only">
            Buscar por nome, coleção ou criador
          </label>
          <input
            ref={inputRef}
            id="header-search-input"
            type="search"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Buscar NFTs"
            className="bg-ink border-input min-w-0 flex-1 rounded-md border px-3 py-2 text-[15px]"
          />
          <button type="submit" className="bg-brand text-ink rounded-md px-3 text-sm font-bold">
            Buscar
          </button>
        </form>
      )}
    </div>
  )
}
