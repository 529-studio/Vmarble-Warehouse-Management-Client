'use client'

import { use, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ClipboardCheck, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useWorkOrder, usePartialCompleteWorkOrder } from '@/lib/hooks/use-work-orders'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import type { ShortfallReason } from '@/types/api'

const SHORTFALL_REASONS: { value: ShortfallReason; label: string }[] = [
  { value: 'MATERIAL_SHORTAGE', label: 'Thiếu nguyên vật liệu' },
  { value: 'DEFECT', label: 'Lỗi sản phẩm' },
  { value: 'TIME_SHORTAGE', label: 'Thiếu thời gian' },
  { value: 'OTHER', label: 'Khác' },
]

function useCurrentRole() {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function ReportFormShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/work-orders">
            <ArrowLeft className="size-4" />
            Quay lại
          </Link>
        </Button>
        <ClipboardCheck className="size-5 text-muted-foreground" aria-hidden="true" />
        <h1 className="text-2xl font-bold">Báo cáo hoàn thành</h1>
      </div>
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

function ReportForm({ id }: { id: string }) {
  const router = useRouter()
  const role = useCurrentRole()
  // BR-WO-AGS: BE only allows partial-complete from IN_PROCESSING. The "advance"
  // action gates the same path so we reuse it as the policy check here.
  const canReport = can(role, 'advance', 'work_orders')

  const { data: wo, isLoading, isError } = useWorkOrder(id)
  const { mutate: report, isPending } = usePartialCompleteWorkOrder()

  // `null` sentinel = not yet typed by the worker; render falls back to the
  // planned quantity. Once the user touches the field, this holds the raw
  // string so partial input ("", "1", "10") doesn't get clobbered.
  const [actualQty, setActualQty] = useState<string | null>(null)
  const [reason, setReason] = useState<ShortfallReason | ''>('')
  const [detail, setDetail] = useState('')
  const [carryOver, setCarryOver] = useState(true)

  if (isLoading) {
    return (
      <ReportFormShell>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </ReportFormShell>
    )
  }

  if (isError || !wo) {
    return (
      <ReportFormShell>
        <p className="text-sm text-destructive">Không thể tải thông tin lệnh sản xuất.</p>
      </ReportFormShell>
    )
  }

  if (!canReport) {
    return (
      <ReportFormShell>
        <p className="text-sm text-muted-foreground">
          Bạn không có quyền báo cáo hoàn thành lệnh sản xuất.
        </p>
      </ReportFormShell>
    )
  }

  if (wo.status !== 'IN_PROCESSING') {
    return (
      <ReportFormShell>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-700" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-900">
                Lệnh phải đang ở trạng thái Đang xử lý mới có thể báo cáo hoàn thành.
              </p>
              <p className="text-sm text-amber-800">Trạng thái hiện tại: {wo.status}</p>
              <Button asChild size="sm" variant="outline">
                <Link href={`/work-orders/${id}`}>Quay lại trang lệnh</Link>
              </Button>
            </div>
          </div>
        </div>
      </ReportFormShell>
    )
  }

  const plannedQty = wo.quantity
  // Until the worker has typed anything, treat the field as if it already
  // holds plannedQty (the default in the issue spec). This avoids ref-during-
  // render hacks while still seeding the form from server data.
  const inputValue = actualQty ?? String(plannedQty)
  const parsed = Number(inputValue)
  const validQty =
    inputValue !== '' && Number.isFinite(parsed) && parsed >= 0 && parsed <= plannedQty
  const defectQty = validQty ? plannedQty - parsed : 0
  const isShort = validQty && defectQty > 0
  const reasonValid = !isShort || reason !== ''

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validQty || !reasonValid || isPending) return

    report(
      {
        id,
        input: {
          actual_qty: parsed,
          ...(isShort && reason ? { shortfall_reason: reason } : {}),
          ...(detail.trim() ? { shortfall_detail: detail.trim() } : {}),
          carry_over: isShort && carryOver,
        },
      },
      {
        onSuccess: (result) => {
          // BR-#292: when a carry-over WO is spawned, land the worker on it so
          // they can keep producing the shortfall. Otherwise return to the
          // (now read-only) source WO detail.
          const next = result.carry_over_wo?.id ?? id
          router.push(`/work-orders/${next}`)
        },
      },
    )
  }

  return (
    <ReportFormShell>
      <div className="rounded-lg border bg-card p-4">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field label="Mã lệnh" value={<span className="font-mono">{shortId(wo.id)}</span>} />
          <Field label="SKU" value={wo.sku_code ?? wo.sku_id.slice(0, 8)} />
          <Field label="Tên SKU" value={wo.sku_name ?? '—'} />
          <Field
            label="Số lượng kế hoạch"
            value={<span className="font-medium">{plannedQty}</span>}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border bg-card p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="actual_qty">Số lượng đạt *</Label>
            <Input
              id="actual_qty"
              type="number"
              inputMode="numeric"
              min={0}
              max={plannedQty}
              step={1}
              className="h-12 text-lg"
              value={inputValue}
              onChange={(e) => setActualQty(e.target.value)}
              disabled={isPending}
              required
            />
            <p className="text-xs text-muted-foreground">Trong khoảng 0 - {plannedQty}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="defect_qty">Số lượng lỗi</Label>
            <Input
              id="defect_qty"
              type="number"
              className="h-12 text-lg"
              value={validQty ? defectQty : ''}
              readOnly
              disabled
              tabIndex={-1}
            />
            <p className="text-xs text-muted-foreground">Tự tính = kế hoạch − đạt</p>
          </div>
        </div>

        {isShort && (
          <div className="space-y-1.5">
            <Label htmlFor="shortfall_reason">Lý do thiếu hụt *</Label>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as ShortfallReason)}
              disabled={isPending}
            >
              <SelectTrigger id="shortfall_reason" className="h-12">
                <SelectValue placeholder="Chọn lý do" />
              </SelectTrigger>
              <SelectContent>
                {SHORTFALL_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="shortfall_detail">Ghi chú</Label>
          <Textarea
            id="shortfall_detail"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            disabled={isPending}
            rows={3}
            placeholder={
              isShort
                ? 'Mô tả thêm về phần hàng thiếu hoặc lỗi gặp phải.'
                : 'Ghi chú tuỳ chọn cho lần báo cáo này.'
            }
          />
        </div>

        {validQty && (
          <div className="rounded-lg border p-4">
            {isShort ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-amber-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-900">
                      Hoàn thành một phần: {parsed}/{plannedQty}, còn thiếu {defectQty}.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Trạng thái lệnh sẽ chuyển sang PARTIAL_COMPLETE.
                    </p>
                  </div>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-input bg-background px-3 py-2.5 text-sm transition-colors hover:bg-accent">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 cursor-pointer"
                    checked={carryOver}
                    onChange={(e) => setCarryOver(e.target.checked)}
                    disabled={isPending}
                  />
                  <span>
                    <span className="font-medium">Tạo lệnh phát sinh</span> cho {defectQty} sản
                    phẩm còn thiếu (mặc định bật).
                  </span>
                </label>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-emerald-900">
                    Hoàn thành đầy đủ {plannedQty}/{plannedQty}.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Trạng thái lệnh sẽ chuyển sang PARTIAL_COMPLETE với actual_qty = quantity
                    (không tạo lệnh phát sinh).
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            className="h-12 px-8"
            disabled={isPending || !validQty || !reasonValid}
          >
            {isPending ? 'Đang gửi…' : 'Gửi báo cáo'}
          </Button>
          <Button type="button" variant="outline" asChild disabled={isPending}>
            <Link href={`/work-orders/${id}`}>Huỷ</Link>
          </Button>
        </div>
      </form>
    </ReportFormShell>
  )
}

export default function WorkOrderReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return <ReportForm id={id} />
}
