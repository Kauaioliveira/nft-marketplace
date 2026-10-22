import Big from 'big.js'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { createOrder, requestQuote, type OrderInput } from '@/api/checkout'
import type { Network, Quote } from '@/api/contracts'
import type { ApiError } from '@/api/errors'
import { useAnnounce } from '@/components/live-announcer-context'
import { formatEth } from '@/lib/money'
import { useNftChanges } from '@/realtime/nft-changes'
import { clearPendingAttempt, savePendingAttempt, type PendingAttempt } from './checkout-storage'

type QuoteIssue = { name?: string; reason: string; priceEth?: string; available?: number }

function describeIssues(error: ApiError) {
  const details = error.details as { reason?: string; issues?: QuoteIssue[] } | undefined
  const lines = (details?.issues ?? []).map((issue) =>
    issue.reason === 'price_changed' && issue.priceEth
      ? `${issue.name}: novo preço ${formatEth(issue.priceEth)}`
      : `${issue.name ?? 'Um item'}: ${issue.available ? `só ${issue.available} disponível(is)` : 'indisponível'}`,
  )
  return [error.message, ...lines].join(' ')
}

/** Network or timeout: the order may exist on the server, so the only safe move is a retry with the same key. */
function isUncertain(error: ApiError) {
  return error.code === 'TIMEOUT' || error.code === 'NETWORK' || error.code === 'TRANSIENT'
}

/**
 * Review and submission of an order. Each reviewed quote gets one idempotency key; clicking twice
 * or retrying after a timeout sends the same key, so the API answers with the same order.
 */
export function usePlaceOrder(userId: string) {
  const navigate = useNavigate()
  const announce = useAnnounce()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [staleReason, setStaleReason] = useState<string | null>(null)
  const [uncertain, setUncertain] = useState(false)
  const attemptRef = useRef<PendingAttempt | null>(null)

  const quoteMutation = useMutation({
    mutationFn: requestQuote,
    onSuccess: (next) => {
      setQuote(next)
      setStaleReason(null)
      setUncertain(false)
      attemptRef.current = null
    },
  })

  const orderMutation = useMutation({
    mutationFn: (attempt: PendingAttempt) =>
      createOrder(attempt.input as OrderInput, attempt.idempotencyKey),
    onSuccess: (order) => {
      clearPendingAttempt()
      attemptRef.current = null
      void navigate({ to: '/orders/$orderId', params: { orderId: order.id }, replace: true })
    },
    onError: (error) => {
      const reason = (error.details as { reason?: string } | undefined)?.reason
      if (
        error.code === 'CONFLICT' &&
        (reason === 'quote_outdated' || reason === 'quote_expired')
      ) {
        // Nothing was charged; the user must review a fresh quote and confirm again.
        clearPendingAttempt()
        attemptRef.current = null
        setStaleReason(describeIssues(error))
        announce(error.message)
        return
      }
      if (isUncertain(error)) {
        setUncertain(true)
        announce('Não recebemos a confirmação do pedido. Tente novamente com segurança.')
        return
      }
      clearPendingAttempt()
      attemptRef.current = null
      announce(error.message)
    },
  })

  // A price or stock change on any quoted item invalidates the review on the spot.
  useNftChanges((nft) => {
    if (!quote) return
    const item = quote.items.find((line) => line.nftId === nft.id)
    if (!item) return
    const edition = nft.editions.find((candidate) => candidate.id === item.editionId)
    if (!edition) return
    if (!new Big(edition.priceEth).eq(item.unitPriceEth)) {
      setStaleReason(
        `O preço de ${item.name} mudou para ${formatEth(edition.priceEth)}. Atualize a cotação para continuar.`,
      )
    } else if (edition.available < item.quantity) {
      setStaleReason(
        `${item.name} (${item.editionLabel}) ficou indisponível na quantidade escolhida. Volte ao carrinho para ajustar.`,
      )
    }
  })

  const startReview = (network: Network) => quoteMutation.mutateAsync(network)

  const submit = (input: Omit<OrderInput, 'quoteId'>) => {
    if (!quote || staleReason || orderMutation.isPending) return
    // Reuse the attempt (same key) when retrying; otherwise start a new one for this quote.
    const attempt = attemptRef.current ?? {
      userId,
      idempotencyKey: crypto.randomUUID(),
      input: { ...input, quoteId: quote.id },
    }
    attemptRef.current = attempt
    savePendingAttempt(attempt)
    setUncertain(false)
    orderMutation.mutate(attempt)
  }

  /** Resends an attempt saved before a refresh, with its original key and body. */
  const resume = (attempt: PendingAttempt) => {
    attemptRef.current = attempt
    setUncertain(false)
    orderMutation.mutate(attempt)
  }

  const reset = () => {
    setQuote(null)
    setStaleReason(null)
    setUncertain(false)
    attemptRef.current = null
    orderMutation.reset()
  }

  return {
    quote,
    staleReason,
    uncertain,
    quoteMutation,
    orderMutation,
    startReview,
    refreshQuote: () => quote && quoteMutation.mutate(quote.network),
    submit,
    resume,
    reset,
  }
}
