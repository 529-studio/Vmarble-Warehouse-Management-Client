import { useMutation, useQueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import { barcodeApi } from '@/lib/api/barcode'
import type { BarcodeRecord, ScanCheckpoint } from '@/types/api'

// ── Zustand store for scan state ──────────────────────────────────────────────

interface ScanStore {
  lastScanned: BarcodeRecord | null
  scanHistory: BarcodeRecord[]
  setLastScanned: (record: BarcodeRecord) => void
  clearScan: () => void
}

export const useScanStore = create<ScanStore>((set) => ({
  lastScanned: null,
  scanHistory: [],
  setLastScanned: (record) =>
    set((s) => ({
      lastScanned: record,
      scanHistory: [record, ...s.scanHistory].slice(0, 20),
    })),
  clearScan: () => set({ lastScanned: null }),
}))

// ── Mutation hook for recording a checkpoint scan ─────────────────────────────

export function useRecordScan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      barcodeId: string
      checkpoint: ScanCheckpoint
      scannedBy: string
    }) => barcodeApi.recordScan(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scan-events'] })
    },
  })
}
