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
import {
  TRANSITION_DESCRIPTION,
  TRANSITION_LABEL,
  type LifecycleAction,
} from '@/lib/delivery/transitions'
import {
  useCancelContainer,
  useReopenContainer,
  useSealContainer,
  useShipContainer,
} from '@/lib/hooks/use-containers'

export interface LifecycleDialogProps {
  open: boolean
  action: LifecycleAction | null
  containerId: string | null
  containerCode?: string | null
  /** Called after the BE accepts the transition. */
  onCompleted: () => void
  /** Called when the user dismisses the dialog without completing. */
  onCancel: () => void
}

/**
 * Drives the four lifecycle endpoints (seal/ship/reopen/cancel) from a single
 * confirmation dialog. `reopen` is the only action that hard-requires a
 * `reason` (BR-D06); the other three accept an optional `note`.
 *
 * Cancel and reopen render as destructive — they remove a container from the
 * loading flow or break a sealed seal.
 */
export function LifecycleDialog({
  open,
  action,
  containerId,
  containerCode,
  onCompleted,
  onCancel,
}: LifecycleDialogProps) {
  const reasonId = useId()
  const noteId = useId()
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')

  const seal = useSealContainer()
  const ship = useShipContainer()
  const reopen = useReopenContainer()
  const cancel = useCancelContainer()

  const pending =
    seal.isPending || ship.isPending || reopen.isPending || cancel.isPending

  // Reset form whenever a fresh dialog opens — otherwise stale text leaks
  // between two consecutive transitions. Done synchronously during render
  // (instead of an effect) to avoid cascading re-renders.
  const formKey = open ? `${action ?? ''}:${containerId ?? ''}` : ''
  const [prevFormKey, setPrevFormKey] = useState(formKey)
  if (prevFormKey !== formKey) {
    setPrevFormKey(formKey)
    setReason('')
    setNote('')
  }

  if (!action) return null

  const requireReason = action === 'reopen'
  const isDestructive = action === 'cancel' || action === 'reopen'

  const submit = () => {
    if (!containerId) return
    const trimmedReason = reason.trim()
    const trimmedNote = note.trim() || undefined

    if (requireReason && !trimmedReason) return

    const onSuccess = () => onCompleted()

    if (action === 'seal') {
      seal.mutate({ id: containerId, body: { note: trimmedNote } }, { onSuccess })
      return
    }
    if (action === 'ship') {
      ship.mutate({ id: containerId, body: { note: trimmedNote } }, { onSuccess })
      return
    }
    if (action === 'cancel') {
      cancel.mutate({ id: containerId, body: { note: trimmedNote } }, { onSuccess })
      return
    }
    reopen.mutate(
      { id: containerId, body: { reason: trimmedReason, note: trimmedNote } },
      { onSuccess },
    )
  }

  const submitDisabled = pending || (requireReason && !reason.trim())

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !pending) onCancel()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDestructive && (
              <AlertTriangle
                className="size-5 shrink-0 text-destructive"
                aria-hidden="true"
              />
            )}
            <span>{TRANSITION_LABEL[action]}</span>
          </DialogTitle>
          <DialogDescription>
            {containerCode ? (
              <>
                Container <span className="font-mono font-semibold">{containerCode}</span>.{' '}
              </>
            ) : null}
            {TRANSITION_DESCRIPTION[action]}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {requireReason && (
            <div className="space-y-1.5">
              <Label htmlFor={reasonId}>
                Lý do <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id={reasonId}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="VD: Sai SKU trong dòng hàng, cần điều chỉnh trước khi xuất."
                rows={3}
                disabled={pending}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Bắt buộc — sẽ được lưu vào lịch sử audit.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={noteId}>Ghi chú (tuỳ chọn)</Label>
            <Textarea
              id={noteId}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Thông tin thêm cho audit log."
              rows={2}
              disabled={pending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={pending}
          >
            Huỷ
          </Button>
          <Button
            type="button"
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={submit}
            disabled={submitDisabled}
          >
            {pending ? 'Đang xử lý…' : TRANSITION_LABEL[action]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
