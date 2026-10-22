import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  addToCart,
  applyCoupon,
  cartKeys,
  cartQuery,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from '@/api/cart'
import type { Cart } from '@/api/contracts'
import { useAnnounce } from '@/components/live-announcer-context'
import { useCartOwner } from '@/features/session/use-session'

export function useCart() {
  const { owner, isPending } = useCartOwner()
  // Waits for the session check so a user never reads the visitor cart by accident.
  return useQuery({ ...cartQuery(owner), enabled: !isPending })
}

/**
 * Cart mutations. The API answers with the full cart, which replaces the cached one: totals are
 * always the server's, never recomputed on the client.
 */
export function useCartMutations() {
  const queryClient = useQueryClient()
  const { owner } = useCartOwner()
  const announce = useAnnounce()
  const key = cartKeys.current(owner)

  const onSuccess = (cart: Cart) => queryClient.setQueryData(key, cart)
  const onError = (error: Error) => {
    toast.error(error.message)
    announce(error.message)
    // A conflict means our copy is stale (stock or price changed): fetch the truth again.
    void queryClient.invalidateQueries({ queryKey: key })
  }

  const add = useMutation({
    mutationFn: addToCart,
    onSuccess: (cart) => {
      onSuccess(cart)
      announce('Item adicionado ao carrinho.')
    },
    onError,
  })
  const update = useMutation({
    mutationFn: ({ lineId, quantity }: { lineId: string; quantity: number }) =>
      updateCartItem(lineId, quantity),
    onSuccess: (cart) => {
      onSuccess(cart)
      announce('Quantidade atualizada.')
    },
    onError,
  })
  const remove = useMutation({
    mutationFn: removeCartItem,
    onSuccess: (cart) => {
      onSuccess(cart)
      announce('Item removido do carrinho.')
    },
    onError,
  })
  const coupon = useMutation({
    mutationFn: applyCoupon,
    onSuccess: (cart) => {
      onSuccess(cart)
      announce(`Cupom ${cart.coupon?.code ?? ''} aplicado.`)
    },
  })
  const clearCoupon = useMutation({
    mutationFn: removeCoupon,
    onSuccess: (cart) => {
      onSuccess(cart)
      announce('Cupom removido.')
    },
    onError,
  })

  return { add, update, remove, coupon, clearCoupon }
}
