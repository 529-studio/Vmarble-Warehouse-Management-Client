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

/** Slug order mirrors the production flow. */
const SLUG_ORDER: CheckpointSlug[] = ['cnc', 'processing', 'shipping']

export function getCheckpointBySlug(slug: string): (typeof CHECKPOINT_ROUTES)[CheckpointSlug] | null {
  if (slug in CHECKPOINT_ROUTES) {
    return CHECKPOINT_ROUTES[slug as CheckpointSlug]
  }
  return null
}

/** Returns the next checkpoint slug in the production flow, or null if this is the last. */
export function getNextCheckpointSlug(slug: string): CheckpointSlug | null {
  const idx = SLUG_ORDER.indexOf(slug as CheckpointSlug)
  if (idx === -1 || idx === SLUG_ORDER.length - 1) return null
  return SLUG_ORDER[idx + 1]
}

