'use client'

import { useState, useSyncExternalStore } from 'react'
import { Lock, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ApiClientError, mapApiErrorVi } from '@/lib/api/client'
import { getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import { useOverflowStatus, usePreAssignSheet } from '@/lib/hooks/use-inventory'

function useCurrentRole(): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
}

interface IssueNewSheetButtonProps {
  sheetId: string
  workOrderId: string
  /** Visible button label, e.g. "Cấp tấm cho lệnh cắt" */
  label?: string
  /** Override variant; defaults to default (primary) */
  variant?: React.ComponentProps<typeof Button>['variant']
  size?: React.ComponentProps<typeof Button>['size']
  className?: string
  onSuccess?: () => void
}

/**
 * Pre-assigns a board sheet to a work order. Honours the overflow lock:
 * when overflow status is RED the button is disabled for everyone, and only
 * admins see a "Ghi đè (admin)" link that opens a reason-input modal and
 * retries with `force=true`.
 */
export function IssueNewSheetButton({
  sheetId,
  workOrderId,
  label = 'Cấp tấm cho lệnh cắt',
  variant = 'default',
  size = 'default',
  className,
  onSuccess,
}: IssueNewSheetButtonProps) {
  const role = useCurrentRole()
  const isAdmin = role === 'admin'
  const { data: overflow } = useOverflowStatus()
  const blocked = overflow?.block_new_sheet_issue ?? false

  const [overrideOpen, setOverrideOpen] = useState(false)
  const { mutate, isPending } = usePreAssignSheet()

  const issue = (force: boolean, reason?: string) => {
    mutate(
      { sheetId, workOrderId, force, reason },
      {
        onSuccess: () => {
          toast.success(force ? 'Đã ghi đè và cấp tấm mới' : 'Đã cấp tấm cho lệnh cắt')
          setOverrideOpen(false)
          onSuccess?.()
        },
        onError: (err) => {
          if (err instanceof ApiClientError && err.status === 412) {
            toast.error('Kho tấm lẻ đang quá tải — không thể xuất tấm mới.')
            return
          }
          toast.error(mapApiErrorVi(err, 'Không thể cấp tấm. Vui lòng thử lại.'))
        },
      },
    )
  }

  if (blocked) {
    return (
      <div className={className}>
        <div className="inline-flex items-center gap-2">
          <Button variant={variant} size={size} disabled>
            <Lock className="size-4" aria-hidden="true" />
            {label}
          </Button>
          <span className="text-xs text-muted-foreground">
            Khoá do kho tấm lẻ vượt {overflow?.threshold_pct?.toFixed(0) ?? '15'}%
          </span>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setOverrideOpen(true)}
            className="mt-1 block text-xs font-medium text-red-700 underline-offset-2 hover:underline"
          >
            Ghi đè (admin)
          </button>
        )}

        <OverflowBypassDialog
          open={overrideOpen}
          onOpenChange={setOverrideOpen}
          isPending={isPending}
          onConfirm={(reason) => issue(true, reason)}
        />
      </div>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={isPending}
      onClick={() => issue(false)}
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  )
}

interface OverflowBypassDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isPending: boolean
  onConfirm: (reason: string) => void
}

function OverflowBypassDialog({ open, onOpenChange, isPending, onConfirm }: OverflowBypassDialogProps) {
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)
  const reasonInvalid = reason.trim().length < 10

  const handleClose = () => {
    setReason('')
    setTouched(false)
    onOpenChange(false)
  }

  const handleSubmit = () => {
    setTouched(true)
    if (reasonInvalid) return
    onConfirm(reason.trim())
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleClose())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="size-5" aria-hidden="true" />
            Ghi đè khoá tràn kho?
          </DialogTitle>
          <DialogDescription>
            Hành động này sẽ xuất một tấm nguyên trong khi kho tấm lẻ đang vượt ngưỡng. Lý do sẽ
            được ghi vào nhật ký kiểm toán (<code>OVERFLOW_BYPASSED</code>).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Label htmlFor="overflow-bypass-reason">Lý do ghi đè *</Label>
          <Textarea
            id="overflow-bypass-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            rows={3}
            placeholder="vd: Lệnh gấp cho khách VIP, không có tấm lẻ phù hợp kích thước"
          />
          {touched && reasonInvalid && (
            <p className="text-xs text-destructive">Lý do phải dài ít nhất 10 ký tự.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Huỷ
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Ghi đè & xuất tấm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
