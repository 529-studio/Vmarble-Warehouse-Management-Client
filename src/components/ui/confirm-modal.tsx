'use client'

import { AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

export interface ConfirmModalProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  confirmVariant?: 'default' | 'destructive'
  isPending?: boolean
  pendingLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Hủy',
  confirmVariant = 'default',
  isPending = false,
  pendingLabel = 'Đang xử lý…',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const isDestructive = confirmVariant === 'destructive'

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle
            className={cn(
              isDestructive && 'flex items-center gap-2 text-lg font-bold text-foreground',
            )}
          >
            {isDestructive && (
              <AlertTriangle className="size-5 shrink-0 text-destructive" aria-hidden="true" />
            )}
            <span>{title}</span>
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending} variant={confirmVariant}>
            {isPending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
