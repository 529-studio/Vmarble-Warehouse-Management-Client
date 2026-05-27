'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, FileSpreadsheet, FileWarning, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RoleGate } from '@/components/auth/role-gate'
import { LoadingPlanUploadError } from '@/lib/api/loading-plans'
import { useCustomers } from '@/lib/hooks/use-customers'
import {
  useActiveLoadingPlan,
  useApproveLoadingPlan,
  useLoadingPlanDiff,
  useUploadLoadingPlan,
} from '@/lib/hooks/use-loading-plans'
import { ApiClientError } from '@/lib/api/client'
import type {
  Container,
  LoadingPlan,
  LoadingPlanDiff,
  LoadingPlanLine,
  LoadingPlanRowError,
  LoadingPlanUploadResult,
} from '@/types/api'

const MAX_FILE_BYTES = 10 * 1024 * 1024
const ACCEPT_EXT = '.xlsx'
const ACCEPT_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

function formatNumber(n: number, fractionDigits = 0): string {
  return n.toLocaleString('vi-VN', { maximumFractionDigits: fractionDigits })
}

interface LoadingPlanTabProps {
  container: Container
  /** Disable interactions when container is SEALED/SHIPPED/CANCELLED. */
  editable: boolean
}

/**
 * Excel upload + parse-preview + v2 confirm-diff for a container.
 *
 * State machine inside this single component:
 *   idle              → no file picked, just the drop zone
 *   file-picked       → filename shown + Parse button
 *   parsing           → POST in flight
 *   preview (200)     → preview table + Approve
 *   parse-error (4xx) → row-level errors panel
 *   approving         → POST /approve in flight
 *   need-supersede    → BE 412; v2 confirm dialog enforces 2-step
 */
export function LoadingPlanTab({ container, editable }: LoadingPlanTabProps) {
  const containerId = container.id

  const { data: activePlan, isLoading: activePlanLoading } =
    useActiveLoadingPlan(containerId)

  const upload = useUploadLoadingPlan()
  const approve = useApproveLoadingPlan()

  const customers = useCustomers({ is_active: true, limit: 200 })
  const customerOptions = customers.data?.items ?? []

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [customerId, setCustomerId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const [previewResult, setPreviewResult] =
    useState<LoadingPlanUploadResult | null>(null)
  const [parseError, setParseError] = useState<LoadingPlanUploadError | null>(null)

  const [supersedeOpen, setSupersedeOpen] = useState(false)
  const [supersedeAck, setSupersedeAck] = useState(false)

  const previewPlanId = previewResult?.plan?.id ?? null
  const prevApprovedId =
    activePlan && activePlan.status === 'APPROVED' && activePlan.id !== previewPlanId
      ? activePlan.id
      : null
  const diff = useLoadingPlanDiff(previewPlanId, prevApprovedId)

  const errors = previewResult?.errors ?? parseError?.result.errors ?? []
  const warnings = previewResult?.warnings ?? parseError?.result.warnings ?? []
  const previewLines = previewResult?.lines ?? previewResult?.plan?.lines ?? []

  const canApprove =
    !!previewResult?.plan && errors.length === 0 && !approve.isPending && editable

  const reset = () => {
    setFile(null)
    setPreviewResult(null)
    setParseError(null)
    setSupersedeAck(false)
    setSupersedeOpen(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const validateAndAccept = (f: File): boolean => {
    const lower = f.name.toLowerCase()
    if (!lower.endsWith('.xlsx')) {
      toast.error('Chỉ chấp nhận file .xlsx (Excel mới). Vui lòng xuất lại từ Excel.')
      return false
    }
    if (f.size > MAX_FILE_BYTES) {
      toast.error(`File lớn hơn 10MB (đang là ${formatBytes(f.size)}). Vui lòng nén bớt.`)
      return false
    }
    setFile(f)
    setPreviewResult(null)
    setParseError(null)
    return true
  }

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) validateAndAccept(f)
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) validateAndAccept(f)
  }

  const submitParse = () => {
    if (!file || !customerId) return
    upload.mutate(
      {
        containerId,
        input: { customerId, file, notes: notes.trim() || undefined },
      },
      {
        onSuccess: (result) => {
          setPreviewResult(result)
          setParseError(null)
        },
        onError: (err) => {
          if (err instanceof LoadingPlanUploadError) {
            setParseError(err)
            setPreviewResult(null)
          }
        },
      },
    )
  }

  const submitApprove = (confirmSupersede = false) => {
    const planId = previewResult?.plan?.id
    if (!planId) return
    approve.mutate(
      {
        id: planId,
        containerId,
        body: { confirm_supersede: confirmSupersede, notes: notes.trim() || undefined },
      },
      {
        onSuccess: () => {
          setSupersedeOpen(false)
          setSupersedeAck(false)
          reset()
        },
        onError: (err) => {
          if (err instanceof ApiClientError && err.status === 412) {
            setSupersedeOpen(true)
          }
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      {activePlanLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : (
        <ActivePlanBanner plan={activePlan} />
      )}

      <RoleGate
        min="PLANNER"
        fallback={
          <Alert>
            <AlertTitle>Chỉ Sales/Admin có quyền upload</AlertTitle>
            <AlertDescription>
              Bạn có thể xem trạng thái plan ở trên nhưng không thể upload Excel mới.
            </AlertDescription>
          </Alert>
        }
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upload packing-list Excel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="lp-customer">Khách hàng</Label>
                <Select
                  value={customerId}
                  onValueChange={setCustomerId}
                  disabled={upload.isPending || !editable}
                >
                  <SelectTrigger id="lp-customer">
                    <SelectValue placeholder={customers.isLoading ? 'Đang tải…' : 'Chọn khách'} />
                  </SelectTrigger>
                  <SelectContent>
                    {customerOptions.length === 0 ? (
                      <SelectItem value="__none" disabled>Chưa có khách nào</SelectItem>
                    ) : (
                      customerOptions.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} · {c.code}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lp-notes">Ghi chú (tuỳ chọn)</Label>
                <Input
                  id="lp-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="VD: lô đầu tháng 6, dùng template mới…"
                  disabled={upload.isPending || !editable}
                />
              </div>
            </div>

            <div
              role="button"
              tabIndex={0}
              aria-label="Upload Excel packing list"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  fileInputRef.current?.click()
                }
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/30 hover:border-muted-foreground/60'
              } ${(!editable || upload.isPending) ? 'pointer-events-none opacity-60' : ''}`}
            >
              {file ? (
                <>
                  <FileSpreadsheet className="size-10 text-primary" />
                  <div>
                    <div className="font-medium">{file.name}</div>
                    <div className="text-xs text-muted-foreground">{formatBytes(file.size)}</div>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="size-10 text-muted-foreground" />
                  <div className="font-medium">
                    Kéo thả Excel packing list từ Zalo vào đây hoặc click để chọn file
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Chỉ chấp nhận <code>.xlsx</code> (Excel 2007+), tối đa 10MB.
                  </div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={`${ACCEPT_EXT},${ACCEPT_MIME}`}
                className="hidden"
                onChange={onPickFile}
                disabled={!editable || upload.isPending}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {file && (
                <Button variant="outline" onClick={reset} disabled={upload.isPending}>
                  <X className="size-4" /> Bỏ chọn
                </Button>
              )}
              <Button
                onClick={submitParse}
                disabled={!file || !customerId || upload.isPending || !editable}
              >
                {upload.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Đang parse…
                  </>
                ) : (
                  <>
                    Parse <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </RoleGate>

      {parseError && (
        <ErrorPanel
          status={parseError.status}
          errors={parseError.result.errors ?? []}
          customerId={customerId}
        />
      )}

      {previewResult?.plan && (
        <PreviewPanel
          container={container}
          plan={previewResult.plan}
          lines={previewLines}
          warnings={warnings}
          canApprove={canApprove}
          isApproving={approve.isPending}
          hasPrevApproved={!!prevApprovedId}
          onApprove={() => {
            // If a previous APPROVED plan exists, BE will 412 unless we
            // pre-confirm. Show the dialog up-front so the planner sees the
            // diff before committing.
            if (prevApprovedId) {
              setSupersedeOpen(true)
              return
            }
            submitApprove(false)
          }}
          onCancel={reset}
        />
      )}

      <Dialog
        open={supersedeOpen}
        onOpenChange={(o) => {
          if (!o && !approve.isPending) {
            setSupersedeOpen(false)
            setSupersedeAck(false)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approve v2 sẽ xoá toàn bộ scan</DialogTitle>
            <DialogDescription>
              Container đã có plan đang APPROVED. Approve plan v2 sẽ supersede v1
              và worker phải scan lại từ đầu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {diff.isLoading && <Skeleton className="h-32 w-full" />}
            {diff.isError && (
              <Alert variant="destructive">
                <AlertTitle>Không tải được diff</AlertTitle>
                <AlertDescription>
                  Vẫn có thể approve nhưng bạn nên xem v1 trước khi xác nhận.
                </AlertDescription>
              </Alert>
            )}
            {diff.data && <DiffTable diff={diff.data} />}

            <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
              <Checkbox
                checked={supersedeAck}
                onCheckedChange={(c) => setSupersedeAck(c === true)}
                disabled={approve.isPending}
              />
              <span>
                Tôi hiểu rằng worker sẽ phải scan lại từ đầu và mọi tiến độ đã quét
                trên plan cũ sẽ bị xoá.
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!approve.isPending) {
                  setSupersedeOpen(false)
                  setSupersedeAck(false)
                }
              }}
              disabled={approve.isPending}
            >
              Huỷ
            </Button>
            <Button
              variant="destructive"
              onClick={() => submitApprove(true)}
              disabled={!supersedeAck || approve.isPending}
            >
              {approve.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Đang approve…
                </>
              ) : (
                'Tôi hiểu, RE-LOAD'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ActivePlanBanner({ plan }: { plan: LoadingPlan | null | undefined }) {
  if (!plan) {
    return (
      <Alert>
        <AlertTitle>Chưa có loading plan</AlertTitle>
        <AlertDescription>
          Container chưa có packing-list Excel nào được upload. Upload bên dưới để bắt đầu.
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <Alert>
      <AlertTitle className="flex items-center gap-2">
        Plan v{plan.version}
        <Badge variant={plan.status === 'APPROVED' ? 'default' : 'outline'}>
          {plan.status}
        </Badge>
      </AlertTitle>
      <AlertDescription className="text-xs text-muted-foreground">
        {plan.lines?.length ?? 0} dòng · upload lúc{' '}
        {plan.parsed_at ? new Date(plan.parsed_at).toLocaleString('vi-VN') : '—'}
        {plan.approved_at
          ? ` · approved lúc ${new Date(plan.approved_at).toLocaleString('vi-VN')}`
          : ''}
      </AlertDescription>
    </Alert>
  )
}

function ErrorPanel({
  status,
  errors,
  customerId,
}: {
  status: number
  errors: LoadingPlanRowError[]
  customerId: string
}) {
  const mappingDeepLink = customerId
    ? `/customers/${customerId}/sku-mappings`
    : '/customers'

  return (
    <Alert variant="destructive">
      <FileWarning className="size-4" />
      <AlertTitle>
        Excel có {errors.length} lỗi - không thể approve (HTTP {status})
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <ul className="space-y-2">
          {errors.map((err, i) => (
            <li
              key={i}
              className="rounded border border-destructive/30 bg-destructive/5 p-2 text-sm"
            >
              <div className="font-medium">
                [Hàng {err.row}
                {err.col ? ` · cột ${err.col}` : ''}] {err.message}
              </div>
              {err.code === 'MAPPING_MISSING' && (
                <Link
                  href={mappingDeepLink}
                  className="text-xs underline underline-offset-2 hover:text-destructive"
                >
                  → Mở trang mapping của khách
                </Link>
              )}
              {err.code === 'INVALID_UNIT' && (
                <div className="text-xs text-muted-foreground">
                  Đơn vị hợp lệ: <code>piece</code>, <code>set</code>, <code>pair</code>.
                </div>
              )}
              {err.code === 'QTY_ZERO' && (
                <div className="text-xs text-muted-foreground">
                  Số lượng phải &gt; 0. Sửa lại Excel rồi upload.
                </div>
              )}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}

function PreviewPanel({
  container,
  plan,
  lines,
  warnings,
  canApprove,
  isApproving,
  hasPrevApproved,
  onApprove,
  onCancel,
}: {
  container: Container
  plan: LoadingPlan
  lines: LoadingPlanLine[]
  warnings: LoadingPlanRowError[]
  canApprove: boolean
  isApproving: boolean
  hasPrevApproved: boolean
  onApprove: () => void
  onCancel: () => void
}) {
  const totalUnits = useMemo(
    () => lines.reduce((sum, l) => sum + (l.qty_planned_pieces ?? 0), 0),
    [lines],
  )
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          PLAN v{plan.version} · {container.code}
          <Badge variant="outline">{plan.status}</Badge>
          <span className="text-xs text-muted-foreground">
            {formatNumber(totalUnits)} units
          </span>
          {hasPrevApproved && <Badge variant="secondary">Sẽ supersede plan v1</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-0">
        {warnings.length > 0 && (
          <div className="px-6">
            <Alert>
              <AlertTitle>{warnings.length} cảnh báo (vẫn approve được)</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 text-xs">
                  {warnings.map((w, i) => (
                    <li key={i}>
                      [Hàng {w.row}] {w.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-right">#</TableHead>
              <TableHead>Mã khách</TableHead>
              <TableHead>Mã DB</TableHead>
              <TableHead className="text-right">Qty Excel</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Pieces</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Plan không có dòng nào.
                </TableCell>
              </TableRow>
            ) : (
              lines.map((ln) => (
                <TableRow key={ln.id}>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {ln.excel_row_num}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{ln.customer_sku_code}</TableCell>
                  <TableCell className="font-mono text-xs">{ln.sku_id ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(ln.qty_in_excel)}
                  </TableCell>
                  <TableCell className="text-xs">{ln.unit_in_excel}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatNumber(ln.qty_planned_pieces)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex flex-wrap items-center justify-end gap-2 px-6 pb-4">
          <Button variant="outline" onClick={onCancel} disabled={isApproving}>
            Huỷ
          </Button>
          <RoleGate min="PLANNER">
            <Button onClick={onApprove} disabled={!canApprove}>
              {isApproving ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Đang approve…
                </>
              ) : (
                'Approve plan'
              )}
            </Button>
          </RoleGate>
        </div>
      </CardContent>
    </Card>
  )
}

function DiffTable({ diff }: { diff: LoadingPlanDiff }) {
  const rows = useMemo(() => {
    type Row = {
      key: string
      label: string
      old: number | null
      next: number | null
      delta: number
    }
    const out: Row[] = []
    for (const a of diff.added) {
      out.push({
        key: `add-${a.id}`,
        label: a.customer_sku_code || a.sku_id || a.id,
        old: null,
        next: a.qty_planned_pieces,
        delta: a.qty_planned_pieces,
      })
    }
    for (const r of diff.removed) {
      out.push({
        key: `rem-${r.id}`,
        label: r.customer_sku_code || r.sku_id || r.id,
        old: r.qty_planned_pieces,
        next: null,
        delta: -r.qty_planned_pieces,
      })
    }
    for (const c of diff.changed) {
      out.push({
        key: `chg-${c.sku_id ?? c.customer_sku_code}`,
        label: c.customer_sku_code || c.sku_id || '—',
        old: c.old_qty,
        next: c.new_qty,
        delta: c.new_qty - c.old_qty,
      })
    }
    return out
  }, [diff])

  if (rows.length === 0) {
    return (
      <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
        Plan v2 trùng khớp với v1 (không có dòng nào thêm/bớt/đổi qty).
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead className="text-right">v1</TableHead>
          <TableHead className="text-right">v2</TableHead>
          <TableHead className="text-right">Δ</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.key}>
            <TableCell className="font-mono text-xs">{r.label}</TableCell>
            <TableCell className="text-right tabular-nums">
              {r.old === null ? '—' : formatNumber(r.old)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {r.next === null ? '—' : formatNumber(r.next)}
            </TableCell>
            <TableCell
              className={`text-right tabular-nums font-medium ${
                r.delta > 0 ? 'text-emerald-600' : r.delta < 0 ? 'text-destructive' : ''
              }`}
            >
              {r.delta > 0 ? `+${formatNumber(r.delta)}` : formatNumber(r.delta)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
