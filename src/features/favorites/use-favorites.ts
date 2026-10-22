import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { toast } from 'sonner'
import { favoriteKeys, favoritesQuery, setFavorite } from '@/api/favorites'
import { useAnnounce } from '@/components/live-announcer-context'
import { useSession } from '@/features/session/use-session'

export function useFavorites() {
  const { user } = useSession()
  const query = useQuery({ ...favoritesQuery(user?.id ?? ''), enabled: Boolean(user) })
  return { ids: new Set(query.data ?? []), isLoading: query.isLoading, user }
}

/**
 * Optimistic toggle: the heart changes immediately and rolls back if the API fails.
 * Visitors are sent to the login page and come back to the same screen.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const { user } = useSession()
  const announce = useAnnounce()
  const navigate = useNavigate()
  const href = useRouterState({ select: (state) => state.location.href })

  const mutation = useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean }) =>
      setFavorite(nftId, favorite),
    onMutate: async ({ nftId, favorite }) => {
      const key = favoriteKeys.list(user!.id)
      // Stops an in-flight refetch from overwriting the optimistic value.
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<string[]>(key)
      queryClient.setQueryData<string[]>(key, (ids = []) =>
        favorite ? [...new Set([...ids, nftId])] : ids.filter((id) => id !== nftId),
      )
      return { previous, key }
    },
    onError: (_error, { favorite }, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous)
      const message = favorite
        ? 'Não foi possível favoritar. Tente novamente.'
        : 'Não foi possível remover dos favoritos. Tente novamente.'
      toast.error(message)
      announce(message)
    },
    onSuccess: (ids, { favorite }) => {
      queryClient.setQueryData(favoriteKeys.list(user!.id), ids)
      announce(favorite ? 'Adicionado aos favoritos.' : 'Removido dos favoritos.')
    },
  })

  return (nftId: string, favorite: boolean) => {
    if (!user) {
      void navigate({ to: '/login', search: { redirect: href } })
      return
    }
    mutation.mutate({ nftId, favorite })
  }
}
