'use client'

import { useId, useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBulkApproveLoadingExceptions } from '@/lib/hooks/use-loading-exceptions'
import type { BulkApproveResult, LoadingExceptionResolution } from '@/types/api'

/** BE rejects BACKORDER and SUBSTITUTE_ACCEPTED in bulk — they need per-row context. */
const BULK_RESOLUTIONS: { value: LoadingExceptionResolution; label: string }[] = [
  { value: 'WRITE_OFF', label: 'Write-off — ghi nhận thiệt hại' },
  { value: 'CANCEL_FROM_SO', label: 'Cancel khỏi SO — giảm qty SO line' },
  { value: 'DEFER_TO_NEXT', label: 'Defer — chuyển sang container kế tiếp' },
]

const FAILURE_LABEL: Record<string, string> = {
  NOT_FOUND: 'Không tìm thấy',
  INVALID_TRANSITION: 'Đã được xử lý',
  INVALID_INPUT: 'Dữ liệu không hợp lệ',
  PRECONDITION_FAILED: 'Điều kiện chưa đạt',
  INTERNAL: 'Lỗi máy chủ',
}

export interface BulkApproveDialogProps {
  open: boolean
  ids: string[]
  /** Container IDs touched — used to invalidate per-container caches. */
  containerIds: string[]
  onCompleted: () => void
  onCancel: () => void
}

/**
 * Bulk APPROVE up to 50 exceptions in one go. Renders the partial-success
 * payload inline: green list of approved ids, red list of failed ones with
 * the BE failure code translated. Caller decides what to do with the
 * remaining failed ids (typically: leave them selected and let the planner
 * try a different resolution per-row).
 */
export function BulkApproveDialog({
  open,
  ids,
  containerIds,
  onCompleted,
  onCancel,
}: BulkApproveDialogProps) {
  const resolutionId = useId()
  const notesId = useId()

  const [resolution, setResolution] = useState<LoadingExceptionResolution>('WRITE_OFF')
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState<BulkApproveResult | null>(null)

  const bulk = useBulkApproveLoadingExceptions()

  // Reset state every time the dialog opens with a new selection.
  const resetKey = open ? ids.join(',') : ''
  const [prevKey, setPrevKey] = useState(resetKey)
  if (prevKey !== resetKey) {
    setPrevKey(resetKey)
    setResolution('WRITE_OFF')
    setNotes('')
    setResult(null)
  }

  const submit = () => {
    bulk.mutate(
      {
        body: {
          ids,
          resolution,
          resolution_notes: notes.trim() || undefined,
        },
        containerIds,
      },
      {
        onSuccess: (res) => setResult(res),
      },
    )
  }

  const totalApproved = result?.approved.length ?? 0
  const totalFailed = result?.failed.length ?? 0

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !bulk.isPending) onCancel()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Duyệt hàng loạt {ids.length} exception</DialogTitle>
          <DialogDescription>
            BACKORDER và SUBSTITUTE_ACCEPTED không được duyệt hàng loạt — cần xử lý từng dòng vì cần context riêng (parent SO line / substitute SKU).
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={resolutionId}>Resolution áp dụng cho tất cả</Label>
              <Select
                value={resolution}
                onValueChange={(v) =>
                  setResolution(v as LoadingExceptionResolution)
                }
                disabled={bulk.isPending}
              >
                <SelectTrigger id={resolutionId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BULK_RESOLUTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={notesId}>Ghi chú resolution (tuỳ chọn)</Label>
              <Textarea
                id={notesId}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Lý do batch xử lý…"
                rows={2}
                disabled={bulk.isPending}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 rounded-md border bg-emerald-50 p-3 text-emerald-900">
              <CheckCircle2 className="size-5 shrink-0" aria-hidden />
              <span>
                Duyệt thành công <strong>{totalApproved}</strong> / {ids.length}
                exception.
              </span>
            </div>
            {totalFailed > 0 && (
              <div className="space-y-2 rounded-md border bg-rose-50 p-3 text-rose-900">
                <div className="flex items-center gap-2">
                  <XCircle className="size-5 shrink-0" aria-hidden />
                  <span>
                    <strong>{totalFailed}</strong> exception không duyệt được:
                  </span>
                </div>
                <ul className="space-y-1 text-xs">
                  {result!.failed.map((f) => (
                    <li key={f.id} className="font-mono">
                      <span className="font-semibold">
                        {FAILURE_LABEL[f.code] ?? f.code}
                      </span>{' '}
                      — {f.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={bulk.isPending}
              >
                Huỷ
              </Button>
              <Button
                type="button"
                onClick={submit}
                disabled={bulk.isPending || ids.length === 0}
              >
                {bulk.isPending ? 'Đang xử lý…' : `Duyệt ${ids.length} dòng`}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={onCompleted}>
              Đóng
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
