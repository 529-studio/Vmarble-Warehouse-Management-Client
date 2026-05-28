'use client'

import { useId, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useApproveLoadingException,
  useRejectLoadingException,
} from '@/lib/hooks/use-loading-exceptions'
import type {
  LoadingException,
  LoadingExceptionResolution,
} from '@/types/api'

const RESOLUTION_LABEL: Record<LoadingExceptionResolution, string> = {
  BACKORDER: 'Backorder — tạo dòng SO carry-over',
  CANCEL_FROM_SO: 'Cancel khỏi SO — giảm qty SO line',
  SUBSTITUTE_ACCEPTED: 'Substitute — khách chấp nhận SKU thay thế',
  WRITE_OFF: 'Write-off — ghi nhận thiệt hại',
  DEFER_TO_NEXT: 'Defer — chuyển sang container kế tiếp',
}

/**
 * Per BE: BR-D17 BACKORDER requires `parent_so_line_id`; BR-D18
 * SUBSTITUTE_ACCEPTED requires `substitute_sku_id`. The picker exposes the
 * matching extra inputs depending on the chosen resolution.
 */
const RESOLUTIONS_FOR_TYPE: Record<string, LoadingExceptionResolution[]> = {
  SHORT_SHIPPED: ['BACKORDER', 'CANCEL_FROM_SO', 'DEFER_TO_NEXT'],
  OVER_LOADED: ['WRITE_OFF', 'CANCEL_FROM_SO'],
  WRONG_SKU: ['SUBSTITUTE_ACCEPTED', 'CANCEL_FROM_SO', 'WRITE_OFF'],
  SUBSTITUTION: ['SUBSTITUTE_ACCEPTED'],
  DAMAGED_AT_LOADING: ['WRITE_OFF', 'BACKORDER'],
  UNPLANNED_UNIT: ['CANCEL_FROM_SO', 'WRITE_OFF'],
  CUSTOMER_CHANGE: ['CANCEL_FROM_SO', 'SUBSTITUTE_ACCEPTED', 'BACKORDER'],
}

const DEFAULT_RESOLUTIONS: LoadingExceptionResolution[] = [
  'BACKORDER',
  'CANCEL_FROM_SO',
  'SUBSTITUTE_ACCEPTED',
  'WRITE_OFF',
  'DEFER_TO_NEXT',
]

export interface ApproveExceptionDialogProps {
  exception: LoadingException | null
  containerId: string
  onCompleted: () => void
  onCancel: () => void
}

type Mode = 'approve' | 'reject'

/**
 * Single dialog used for both APPROVE (with resolution + extras) and REJECT
 * (free-text reason). Switching mode inside the same shell keeps focus + audit
 * context together — admin often flips between the two while reviewing
 * photos.
 */
export function ApproveExceptionDialog({
  exception,
  containerId,
  onCompleted,
  onCancel,
}: ApproveExceptionDialogProps) {
  const open = exception !== null
  const resolutionId = useId()
  const notesId = useId()
  const substituteId = useId()
  const parentLineId = useId()

  const allowedResolutions = exception
    ? RESOLUTIONS_FOR_TYPE[exception.exception_type] ?? DEFAULT_RESOLUTIONS
    : DEFAULT_RESOLUTIONS

  const [mode, setMode] = useState<Mode>('approve')
  const [resolution, setResolution] = useState<LoadingExceptionResolution>(
    allowedResolutions[0] ?? 'WRITE_OFF',
  )
  const [notes, setNotes] = useState('')
  const [substituteSkuId, setSubstituteSkuId] = useState('')
  const [parentSoLineId, setParentSoLineId] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  const resetKey = open ? exception.id : ''
  const [prevKey, setPrevKey] = useState(resetKey)
  if (prevKey !== resetKey) {
    setPrevKey(resetKey)
    setMode('approve')
    setResolution(allowedResolutions[0] ?? 'WRITE_OFF')
    setNotes('')
    setSubstituteSkuId('')
    setParentSoLineId('')
    setRejectReason('')
  }

  const approve = useApproveLoadingException()
  const reject = useRejectLoadingException()
  const pending = approve.isPending || reject.isPending

  if (!exception) return null

  const requiresSubstitute = resolution === 'SUBSTITUTE_ACCEPTED'
  const requiresParentLine = resolution === 'BACKORDER'

  const approveDisabled =
    pending ||
    (requiresSubstitute && !substituteSkuId.trim()) ||
    (requiresParentLine && !parentSoLineId.trim())
  const rejectDisabled = pending || !rejectReason.trim()

  const submit = () => {
    if (mode === 'reject') {
      reject.mutate(
        { id: exception.id, containerId, body: { reason: rejectReason.trim() } },
        { onSuccess: onCompleted },
      )
      return
    }
    approve.mutate(
      {
        id: exception.id,
        containerId,
        body: {
          resolution,
          resolution_notes: notes.trim() || undefined,
          substitute_sku_id: requiresSubstitute ? substituteSkuId.trim() : undefined,
          parent_so_line_id: requiresParentLine ? parentSoLineId.trim() : undefined,
        },
      },
      { onSuccess: onCompleted },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onCancel()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-amber-600" aria-hidden />
            Xử lý exception · {exception.exception_type}
          </DialogTitle>
          <DialogDescription>
            Lý do: <span className="text-foreground">{exception.reason}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-md border bg-muted/30 p-1">
          <button
            type="button"
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'approve'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setMode('approve')}
            disabled={pending}
          >
            Duyệt
          </button>
          <button
            type="button"
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'reject'
                ? 'bg-background text-destructive shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setMode('reject')}
            disabled={pending}
          >
            Từ chối
          </button>
        </div>

        {mode === 'approve' ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={resolutionId}>Resolution</Label>
              <Select
                value={resolution}
                onValueChange={(v) => setResolution(v as LoadingExceptionResolution)}
                disabled={pending}
              >
                <SelectTrigger id={resolutionId}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedResolutions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {RESOLUTION_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {requiresSubstitute && (
              <div className="space-y-1.5">
                <Label htmlFor={substituteId}>
                  Substitute SKU ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={substituteId}
                  value={substituteSkuId}
                  onChange={(e) => setSubstituteSkuId(e.target.value)}
                  placeholder="UUID của SKU thay thế"
                  disabled={pending}
                />
                <p className="text-xs text-muted-foreground">
                  Bắt buộc khi resolution = SUBSTITUTE_ACCEPTED (BR-D18).
                </p>
              </div>
            )}

            {requiresParentLine && (
              <div className="space-y-1.5">
                <Label htmlFor={parentLineId}>
                  Parent SO line ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={parentLineId}
                  value={parentSoLineId}
                  onChange={(e) => setParentSoLineId(e.target.value)}
                  placeholder="UUID của SO line gốc"
                  disabled={pending}
                />
                <p className="text-xs text-muted-foreground">
                  Bắt buộc khi resolution = BACKORDER (BR-D17). Hệ thống sẽ tạo dòng carry-over.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor={notesId}>Ghi chú resolution (tuỳ chọn)</Label>
              <Textarea
                id={notesId}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Liên hệ Zalo: ..."
                rows={2}
                disabled={pending}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor={notesId}>
              Lý do từ chối <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id={notesId}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="VD: Bằng chứng ảnh không rõ, yêu cầu raise lại."
              rows={3}
              disabled={pending}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Reject vẫn block SEAL cho tới khi user xử lý exception khác.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
            Huỷ
          </Button>
          <Button
            type="button"
            variant={mode === 'reject' ? 'destructive' : 'default'}
            onClick={submit}
            disabled={mode === 'reject' ? rejectDisabled : approveDisabled}
          >
            {pending ? 'Đang xử lý…' : mode === 'reject' ? 'Từ chối' : 'Duyệt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
