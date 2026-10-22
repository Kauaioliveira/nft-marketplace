import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      // Shimmer: a moving highlight over the surface color. Disabled with reduced motion.
      aria-hidden="true"
      className={cn(
        'animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--color-surface-raised)_0%,var(--color-surface-dark)_50%,var(--color-surface-raised)_100%)] bg-[length:200%_100%] motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
