import { useMutation, useQueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import { toast } from 'sonner'
import { barcodeApi } from '@/lib/api/barcode'
import { mapApiErrorVi } from '@/lib/api/client'
import { BARCODES_KEY, SCAN_EVENTS_KEY } from '@/lib/hooks/use-barcode'
import { WORK_ORDERS_KEY } from '@/lib/hooks/use-work-orders'
import type { ScanResult, ScanCheckpoint } from '@/types/api'

// ── Device info helper ────────────────────────────────────────────────────────
// Reads / generates a stable device ID from localStorage and derives a
// human-readable device name from the browser UA string.

const DEVICE_ID_KEY = 'scan_device_id'

function generateDeviceId(): string {
  const id = crypto.randomUUID()
  try { localStorage.setItem(DEVICE_ID_KEY, id) } catch { /* storage blocked */ }
  return id
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  try {
    return localStorage.getItem(DEVICE_ID_KEY) ?? generateDeviceId()
  } catch {
    return generateDeviceId()
  }
}

export function getDeviceName(): string {
  if (typeof window === 'undefined' || !navigator.userAgent) return 'Unknown'
  const ua = navigator.userAgent
  const mobile = /Android|iPhone|iPad|iPod/i.test(ua)
  const tablet = /iPad/i.test(ua)
  let browser = 'Browser'
  if (/Chrome\/\d/i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome'
  else if (/Firefox\/\d/i.test(ua)) browser = 'Firefox'
  else if (/Safari\/\d/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari'
  else if (/Edg\//i.test(ua)) browser = 'Edge'
  const form = tablet ? 'Tablet' : mobile ? 'Mobile' : 'Desktop'
  return `${browser} on ${form}`
}

// ── Zustand scan-session store ────────────────────────────────────────────────

interface ScanSessionEntry {
  scanResult: ScanResult
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
  QC_PASSED: 'QC Đạt',
  QC_FAILED: 'QC Lỗi',
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
      deviceId?: string
      deviceName?: string
      shift?: string
      note?: string
    }) => barcodeApi.recordScan(input),

    onSuccess: (scanResult, variables) => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(200)
      }
      const label = CHECKPOINT_LABEL[variables.checkpoint]
      toast.success(`Đã quét: ${variables.barcodeId.slice(-8)} tại ${label}`)
      addEntry({
        scanResult,
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
