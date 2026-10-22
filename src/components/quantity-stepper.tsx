import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

type QuantityStepperProps = {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  label: string
  disabled?: boolean
  size?: 'sm' | 'lg'
}

const buttonClass =
  'grid place-items-center rounded-full bg-brand text-ink hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-40'

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  label,
  disabled,
  size = 'lg',
}: QuantityStepperProps) {
  const sizeClass = size === 'lg' ? 'size-8 md:size-[31px]' : 'size-6'
  return (
    <div role="group" aria-label={label} className="flex items-center gap-3">
      <button
        type="button"
        className={cn(buttonClass, sizeClass)}
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Diminuir quantidade"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <output aria-live="polite" aria-label="Quantidade" className="min-w-6 text-center text-lg">
        {value}
      </output>
      <button
        type="button"
        className={cn(buttonClass, sizeClass)}
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Aumentar quantidade"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  )
}
