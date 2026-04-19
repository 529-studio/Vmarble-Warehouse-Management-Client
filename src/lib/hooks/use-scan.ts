import { useMutation, useQueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import { toast } from 'sonner'
import { barcodeApi } from '@/lib/api/barcode'
import { mapApiErrorVi } from '@/lib/api/client'
import { BARCODES_KEY, SCAN_EVENTS_KEY } from '@/lib/hooks/use-barcode'
import { WORK_ORDERS_KEY } from '@/lib/hooks/use-work-orders'
import type { ScanEvent, ScanCheckpoint } from '@/types/api'

// ── Zustand scan-session store ────────────────────────────────────────────────

interface ScanSessionEntry {
  scanEvent: ScanEvent
  /** Short display label — last 8 chars of barcode_id */
  barcodeShort: string
}

interface ScanStore {
  history: ScanSessionEntry[]
  addEntry: (entry: ScanSessionEntry) => void
  clear: () => void
}

export const useScanStore = create<ScanStore>((set) => ({
  history: [],
  addEntry: (entry) =>
    set((s) => ({ history: [entry, ...s.history].slice(0, 5) })),
  clear: () => set({ history: [] }),
}))

// ── Mutation hook ─────────────────────────────────────────────────────────────

const CHECKPOINT_LABEL: Record<ScanCheckpoint, string> = {
  CNC_COMPLETE: 'Hoàn thành CNC',
  FINISHED_GOODS: 'Hoàn thành gia công',
  SHIPPED: 'Xuất kho',
}

export function useRecordScan() {
  const addEntry = useScanStore((s) => s.addEntry)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      barcodeId: string
      checkpoint: ScanCheckpoint
      scannedBy: string
    }) => barcodeApi.recordScan(input),

    onSuccess: (scanEvent, variables) => {
      const label = CHECKPOINT_LABEL[variables.checkpoint]
      toast.success(`Đã quét: ${variables.barcodeId.slice(-8)} tại ${label}`)
      addEntry({
        scanEvent,
        barcodeShort: variables.barcodeId.slice(-8),
      })
      queryClient.invalidateQueries({ queryKey: [SCAN_EVENTS_KEY, variables.barcodeId] })
      queryClient.invalidateQueries({ queryKey: [BARCODES_KEY, variables.barcodeId] })
      queryClient.invalidateQueries({ queryKey: [BARCODES_KEY] })
      queryClient.invalidateQueries({ queryKey: [WORK_ORDERS_KEY] })
    },

    onError: (err: unknown) => {
      toast.error(mapApiErrorVi(err, 'Quét mã thất bại'))
    },
  })
}
