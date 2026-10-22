import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import type { Coupon, Summary } from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/money'
import { useCartMutations } from './use-cart'

export function SummaryRows({
  summary,
  feeLabel = 'Taxa estimada',
}: {
  summary: Summary
  feeLabel?: string
}) {
  return (
    <dl className="flex flex-col gap-3 text-[17px]" data-testid="summary">
      <div className="flex justify-between gap-4">
        <dt>Subtotal</dt>
        <dd data-testid="summary-subtotal">{formatEth(summary.subtotalEth, 6)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt>Desconto</dt>
        <dd data-testid="summary-discount">(-) {formatEth(summary.discountEth, 6)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt>Taxa de rede</dt>
        <dd className="flex flex-col items-end">
          <span data-testid="summary-fee">{formatEth(summary.networkFeeEth, 6)}</span>
          <span className="text-accent-text text-xs">{feeLabel}</span>
        </dd>
      </div>
      <div className="border-border-soft mt-2 flex justify-between gap-4 border-t pt-4 font-bold">
        <dt>Total</dt>
        <dd className="text-brand" data-testid="summary-total">
          {formatEth(summary.totalEth, 6)}
        </dd>
      </div>
    </dl>
  )
}

export function SummarySkeleton() {
  return (
    <div role="status" aria-label="Carregando resumo" className="flex flex-col gap-4">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex justify-between">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-24" />
        </div>
      ))}
    </div>
  )
}

const couponSchema = z.object({ code: z.string().trim().min(1, 'Digite um código promocional.') })

export function CouponForm({ coupon }: { coupon: Coupon | null }) {
  const { coupon: applyMutation, clearCoupon } = useCartMutations()
  const form = useForm<{ code: string }>({
    resolver: zodResolver(couponSchema),
    defaultValues: { code: '' },
  })
  const error = form.formState.errors.code?.message

  if (coupon) {
    return (
      <div
        className="border-success/60 flex items-center justify-between gap-3 rounded-sm border px-3 py-2"
        role="status"
      >
        <span>
          Cupom <strong>{coupon.code}</strong> aplicado ({coupon.percentOff}% de desconto)
        </span>
        <Button
          variant="link"
          className="text-brand h-auto p-0"
          onClick={() => clearCoupon.mutate()}
          disabled={clearCoupon.isPending}
        >
          Remover
        </Button>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(({ code }) =>
        applyMutation.mutate(code, {
          onError: (apiError) =>
            form.setError('code', { message: apiError.fields?.code ?? apiError.message }),
          onSuccess: () => form.reset(),
        }),
      )}
    >
      <label htmlFor="coupon-code" className="mb-2 block text-[15px] font-bold">
        Código promocional
      </label>
      <div className="flex">
        <input
          id="coupon-code"
          placeholder="Digite o código promocional..."
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'coupon-error' : undefined}
          className="border-brand placeholder:text-sand/80 h-10 min-w-0 flex-1 rounded-l-sm border bg-transparent px-2 text-sm uppercase placeholder:normal-case"
          {...form.register('code')}
        />
        <Button
          type="submit"
          className="h-10 rounded-l-none px-5 text-[15px] font-bold"
          disabled={applyMutation.isPending}
        >
          {applyMutation.isPending ? 'Aplicando…' : 'Aplicar'}
        </Button>
      </div>
      {error && (
        <p id="coupon-error" role="alert" className="text-coral mt-1 text-sm">
          {error}
        </p>
      )}
    </form>
  )
}
