import type { ScanCheckpoint } from '@/types/api'

export type CheckpointSlug = 'cnc' | 'processing' | 'shipping'

export const CHECKPOINT_ROUTES: Record<CheckpointSlug, {
  checkpoint: ScanCheckpoint
  label: string
  description: string
  href: string
}> = {
  cnc: {
    checkpoint: 'CNC_COMPLETE',
    label: 'CNC',
    description: 'Xác nhận hoàn thành công đoạn cắt CNC',
    href: '/scan/cnc',
  },
  processing: {
    checkpoint: 'FINISHED_GOODS',
    label: 'Hoàn thiện',
    description: 'Xác nhận hoàn thành gia công thành phẩm',
    href: '/scan/processing',
  },
  shipping: {
    checkpoint: 'SHIPPED',
    label: 'Xuất kho',
    description: 'Xác nhận bàn giao và xuất kho thành phẩm',
    href: '/scan/shipping',
  },
}

export const CHECKPOINT_LABEL: Record<ScanCheckpoint, string> = {
  CNC_COMPLETE: 'Hoàn thành CNC',
  FINISHED_GOODS: 'Hoàn thành gia công',
  SHIPPED: 'Xuất kho',
}

export function getCheckpointBySlug(slug: string): (typeof CHECKPOINT_ROUTES)[CheckpointSlug] | null {
  if (slug in CHECKPOINT_ROUTES) {
    return CHECKPOINT_ROUTES[slug as CheckpointSlug]
  }
  return null
}
