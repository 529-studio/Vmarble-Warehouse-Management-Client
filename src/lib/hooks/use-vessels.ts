import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { vesselsApi } from '@/lib/api/vessels'
import type { CreateVesselInput, UpdateVesselInput, VesselsFilter } from '@/types/api'

export const VESSELS_KEY = 'vessels'

export function useVessels(filter: VesselsFilter = {}) {
  return useQuery({
    queryKey: [VESSELS_KEY, filter],
    queryFn: () => vesselsApi.list(filter),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useVessel(id: string | null) {
  return useQuery({
    queryKey: [VESSELS_KEY, id],
    queryFn: () => vesselsApi.getById(id!),
    enabled: !!id,
    staleTime: 15_000,
  })
}

export function useVesselContainers(id: string | null) {
  return useQuery({
    queryKey: [VESSELS_KEY, id, 'containers'],
    queryFn: () => vesselsApi.listContainers(id!),
    enabled: !!id,
    staleTime: 15_000,
  })
}

export function useCreateVessel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateVesselInput) => vesselsApi.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VESSELS_KEY] })
      toast.success('Đã tạo tàu.')
    },
    onError: () => toast.error('Không thể tạo tàu. Vui lòng thử lại.'),
  })
}

export function useUpdateVessel(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateVesselInput) => vesselsApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VESSELS_KEY] })
      toast.success('Đã cập nhật tàu.')
    },
    onError: () => toast.error('Không thể cập nhật tàu. Vui lòng thử lại.'),
  })
}

export function useDeleteVessel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => vesselsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VESSELS_KEY] })
      toast.success('Đã xoá tàu.')
    },
    onError: () => toast.error('Không thể xoá tàu. Vui lòng thử lại.'),
  })
}
