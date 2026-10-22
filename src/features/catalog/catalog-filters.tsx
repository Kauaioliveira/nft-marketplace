import Big from 'big.js'
import { useId, useState, type FormEvent } from 'react'
import { networks, nftCategories, type NftList } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { categoryLabels, networkLabels } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { CatalogSearch } from './search'

type FiltersProps = {
  search: CatalogSearch
  facets: NftList['facets'] | undefined
  onChange: (patch: Partial<CatalogSearch>) => void
}

function toggle<T>(list: T[] | undefined, value: T) {
  const next = new Set(list ?? [])
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next.size > 0 ? [...next] : undefined
}

export function CatalogFilters({ search, facets, onChange }: FiltersProps) {
  return (
    <div className="bg-surface-card flex flex-col gap-6 px-5 py-6">
      <fieldset>
        <legend className="mb-3 text-lg font-bold">Coleções</legend>
        <ul className="space-y-1">
          {nftCategories.map((category) => {
            const checked = search.category?.includes(category) ?? false
            return (
              <li key={category}>
                <FacetOption
                  label={categoryLabels[category]}
                  count={facets?.category[category] ?? 0}
                  checked={checked}
                  onToggle={() => onChange({ category: toggle(search.category, category) })}
                />
              </li>
            )
          })}
        </ul>
      </fieldset>

      <PriceRange
        min={search.minPrice}
        max={search.maxPrice}
        onApply={(minPrice, maxPrice) => onChange({ minPrice, maxPrice })}
      />

      <fieldset>
        <legend className="mb-3 text-lg font-bold">Rede</legend>
        <ul className="space-y-1">
          {networks.map((network) => (
            <li key={network}>
              <FacetOption
                label={networkLabels[network]}
                count={facets?.network[network] ?? 0}
                checked={search.network?.includes(network) ?? false}
                onToggle={() => onChange({ network: toggle(search.network, network) })}
              />
            </li>
          ))}
        </ul>
      </fieldset>
    </div>
  )
}

function FacetOption(props: {
  label: string
  count: number
  checked: boolean
  onToggle: () => void
}) {
  const id = useId()
  // An option that would return nothing with the other active filters cannot be picked,
  // unless it is already selected (so it can still be cleared).
  const disabled = props.count === 0 && !props.checked
  return (
    <label
      htmlFor={id}
      className={cn(
        'has-[:focus-visible]:outline-amber flex cursor-pointer items-center justify-between gap-3 rounded px-3 py-1.5 text-base has-[:focus-visible]:outline-2',
        props.checked ? 'text-brand' : 'text-sand hover:text-foreground',
        disabled && 'hover:text-sand cursor-not-allowed opacity-50',
      )}
    >
      <span className="flex items-center gap-2">
        <input
          id={id}
          type="checkbox"
          checked={props.checked}
          disabled={disabled}
          onChange={props.onToggle}
          className="size-4 accent-[var(--color-brand)]"
        />
        {props.label}
      </span>
      <span aria-label={`${props.count} resultados`}>({props.count})</span>
    </label>
  )
}

function PriceRange(props: {
  min: string | undefined
  max: string | undefined
  onApply: (min: string | undefined, max: string | undefined) => void
}) {
  const [min, setMin] = useState(props.min ?? '')
  const [max, setMax] = useState(props.max ?? '')
  const [error, setError] = useState<string | null>(null)
  const errorId = useId()
  const minId = useId()
  const maxId = useId()

  // Keeps the inputs in sync when the URL changes through back/forward.
  const [synced, setSynced] = useState({ min: props.min, max: props.max })
  if (synced.min !== props.min || synced.max !== props.max) {
    setSynced({ min: props.min, max: props.max })
    setMin(props.min ?? '')
    setMax(props.max ?? '')
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const normalize = (value: string) => value.trim().replace(',', '.')
    const nextMin = normalize(min)
    const nextMax = normalize(max)
    const valid = (value: string) => value === '' || /^\d+(\.\d+)?$/.test(value)
    if (!valid(nextMin) || !valid(nextMax)) {
      setError('Use apenas números, como 0.5 ou 2.')
      return
    }
    if (nextMin && nextMax && new Big(nextMin).gt(nextMax)) {
      setError('O preço mínimo não pode ser maior que o máximo.')
      return
    }
    setError(null)
    props.onApply(nextMin || undefined, nextMax || undefined)
  }

  return (
    <form onSubmit={submit} noValidate>
      <fieldset>
        <legend className="mb-3 text-lg font-bold">Faixa de preço</legend>
        <div className="flex items-center gap-2 px-3">
          <label className="sr-only" htmlFor={minId}>
            Preço mínimo em ETH
          </label>
          <input
            id={minId}
            inputMode="decimal"
            placeholder="Mín."
            value={min}
            onChange={(event) => setMin(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className="border-input bg-ink w-full min-w-0 rounded-md border px-2 py-1.5 text-sm"
          />
          <span aria-hidden>–</span>
          <label className="sr-only" htmlFor={maxId}>
            Preço máximo em ETH
          </label>
          <input
            id={maxId}
            inputMode="decimal"
            placeholder="Máx."
            value={max}
            onChange={(event) => setMax(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className="border-input bg-ink w-full min-w-0 rounded-md border px-2 py-1.5 text-sm"
          />
          <span className="text-sand text-sm">ETH</span>
        </div>
        {error && (
          <p id={errorId} className="text-coral mt-2 px-3 text-sm">
            {error}
          </p>
        )}
        <Button type="submit" size="sm" className="mt-3 ml-3 font-bold">
          Aplicar
        </Button>
      </fieldset>
    </form>
  )
}
