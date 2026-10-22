import { forwardRef, useId, type SelectHTMLAttributes } from 'react'
import { inputClass } from '@/components/form-field'
import { cn } from '@/lib/utils'

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  error?: string
  required?: boolean
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, required, children, id, ...props },
  ref,
) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-[15px]">
        {label}
        {required && (
          <span className="text-coral" aria-hidden>
            *
          </span>
        )}
      </label>
      <select
        ref={ref}
        id={selectId}
        aria-invalid={Boolean(error)}
        aria-required={required}
        aria-describedby={error ? `${selectId}-error` : undefined}
        className={cn(inputClass, 'bg-ink')}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="text-coral text-sm">
          {error}
        </p>
      )}
    </div>
  )
})
