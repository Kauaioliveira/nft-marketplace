import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: ReactNode
  required?: boolean
  /** Hides the label visually when the layout uses placeholders only (login card). */
  srOnlyLabel?: boolean
}

export const inputClass =
  'h-10 w-full rounded-sm border border-input bg-transparent px-4 text-[15px] placeholder:text-sand/80 aria-[invalid=true]:border-coral focus-visible:border-amber focus-visible:outline-none'

/** Label, input and error message wired together for screen readers. */
export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(function FormField(
  { label, error, hint, required, srOnlyLabel, className, type, id, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const hintId = `${inputId}-hint`
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className={cn('text-[15px]', srOnlyLabel && 'sr-only')}>
        {label}
        {required && (
          <span className="text-coral" aria-hidden>
            *
          </span>
        )}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={isPassword && revealed ? 'text' : type}
          aria-invalid={Boolean(error)}
          aria-required={required}
          aria-describedby={
            [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined
          }
          className={cn(inputClass, isPassword && 'pr-11')}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            aria-label={revealed ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={revealed}
            className="text-sand hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
          >
            {revealed ? (
              <Eye className="size-5" aria-hidden />
            ) : (
              <EyeOff className="size-5" aria-hidden />
            )}
          </button>
        )}
      </div>
      {hint && (
        <p id={hintId} className="text-sand text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-coral text-sm">
          {error}
        </p>
      )}
    </div>
  )
})
