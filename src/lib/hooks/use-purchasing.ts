import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { purchasingApi } from '@/lib/api/purchasing'
import { mapApiErrorVi } from '@/lib/api/client'
import type { CreateMPOInput, AddMPOItemInput, MPOFilter } from '@/types/api'

export const MPO_KEY = 'purchase-orders'

export function useMPOs(filter: MPOFilter = {}) {
  return useQuery({
    queryKey: [MPO_KEY, filter],
    queryFn: () => purchasingApi.list(filter),
    placeholderData: (prev) => prev,
  })
}

export function useMPO(id: string | null) {
  return useQuery({
    queryKey: [MPO_KEY, id],
    queryFn: () => purchasingApi.getById(id!),
    enabled: !!id,
  })
}

export function useCreateMPO() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateMPOInput) => purchasingApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MPO_KEY] })
      toast.success('Đã tạo đơn nhập vật liệu')
    },
    onError: (err) => {
      toast.error(mapApiErrorVi(err, 'Tạo đơn nhập thất bại'))
    },
  })
}

export function useAddMPOItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AddMPOItemInput }) =>
      purchasingApi.addItem(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [MPO_KEY, id] })
      toast.success('Đã thêm dòng hàng')
    },
    onError: (err) => {
      toast.error(mapApiErrorVi(err, 'Thêm dòng hàng thất bại'))
    },
  })
}

export function useRemoveMPOItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, itemId }: { id: string; itemId: string }) =>
      purchasingApi.removeItem(id, itemId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [MPO_KEY, id] })
      toast.success('Đã xoá dòng hàng')
    },
    onError: (err) => {
      toast.error(mapApiErrorVi(err, 'Xoá dòng hàng thất bại'))
    },
  })
}

export function useOrderMPO() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => purchasingApi.order(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [MPO_KEY] })
      queryClient.invalidateQueries({ queryKey: [MPO_KEY, id] })
      toast.success('Đã xác nhận đặt hàng')
    },
    onError: (err) => {
      toast.error(mapApiErrorVi(err, 'Xác nhận đặt hàng thất bại'))
    },
  })
}

export function useReceiveMPO() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => purchasingApi.receive(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [MPO_KEY] })
      queryClient.invalidateQueries({ queryKey: [MPO_KEY, id] })
      toast.success('Đã xác nhận nhận hàng — lô vật liệu đã được tạo')
    },
    onError: (err) => {
      toast.error(mapApiErrorVi(err, 'Xác nhận nhận hàng thất bại'))
    },
  })
}

export function useCancelMPO() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => purchasingApi.cancel(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [MPO_KEY] })
      queryClient.invalidateQueries({ queryKey: [MPO_KEY, id] })
      toast.success('Đã huỷ đơn nhập')
    },
    onError: (err) => {
      toast.error(mapApiErrorVi(err, 'Huỷ đơn nhập thất bại'))
    },
  })
}
