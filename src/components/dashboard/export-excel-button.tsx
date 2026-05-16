'use client'

import { useState, useSyncExternalStore } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { mapApiErrorVi } from '@/lib/api/client'
import { reportsApi, type ExportFilter, type ExportReport } from '@/lib/api/reports'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'

interface ExportExcelButtonProps {
  report: ExportReport
  filter?: ExportFilter
  /** Override the default "Xuất Excel" label — useful when sitting next to other buttons. */
  label?: string
  /** Pass-through className to align with surrounding toolbars. */
  className?: string
  /** Disable beyond the role check (e.g. while the parent list is still loading). */
  disabled?: boolean
}

function useCurrentRole() {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/**
 * Shared Excel export button. Hidden entirely for roles that cannot generate
 * reports so /skus, /pos, /work-orders don't show a useless action to planner
 * or warehouse users.
 */
export function ExportExcelButton({
  report,
  filter,
  label = 'Xuất Excel',
  className,
  disabled,
}: ExportExcelButtonProps) {
  const role = useCurrentRole()
  const [downloading, setDownloading] = useState(false)

  if (!can(role, 'generate', 'reports')) return null

  async function handleClick() {
    setDownloading(true)
    const toastId = toast.loading('Đang chuẩn bị file...')
    try {
      const { blob, filename } = await reportsApi.exportXlsx(report, filter)
      triggerDownload(blob, filename)
      toast.success('Đã tải file Excel', { id: toastId })
    } catch (err) {
      toast.error(mapApiErrorVi(err, 'Tải Excel thất bại'), { id: toastId })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={disabled || downloading}
      className={className}
    >
      {downloading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-4" aria-hidden="true" />
      )}
      {label}
    </Button>
  )
}
