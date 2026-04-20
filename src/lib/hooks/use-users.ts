import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/lib/api/users'
import type { CreateUserInput, UpdateUserInput } from '@/types/api'

export const USERS_KEY = 'users'

export function useUsers() {
  return useQuery({
    queryKey: [USERS_KEY],
    queryFn: () => usersApi.list(),
    staleTime: 30_000,
    // Backend authn.Service returns a slice []UserDetail, so no need to unwrap .items
    // unless it gets paginated in the future.
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] })
    },
  })
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      usersApi.toggleActive(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USERS_KEY] })
    },
  })
}
