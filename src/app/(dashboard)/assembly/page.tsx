'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Boxes, CheckCircle2, ClipboardList, HardHat, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
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
import { useMaterials } from '@/lib/hooks/use-materials'
import { useSKU } from '@/lib/hooks/use-skus'
import {
  useAddLaborEntry,
  useAddWorkOrderConsumption,
  useAdvanceStatus,
  useWorkOrderConsumptions,
  useWorkOrderLaborEntries,
  useWorkOrders,
} from '@/lib/hooks/use-work-orders'
import { useMe } from '@/lib/hooks/use-auth'
import type { LaborStage, MaterialType, WorkOrder } from '@/types/api'

// ── Constants ────────────────────────────────────────────────────────────────

const LABOR_STAGE_LABEL: Record<LaborStage, string> = {
  CNC: 'CNC',
  GRINDING: 'Mài',
  ASSEMBLY: 'Lắp ráp',
  POLISHING: 'Hoàn thiện',
}

// Foreman cards focus on stages relevant to assembly. CNC is recorded
// elsewhere (kiosk) so we hide it from the dropdown.
const FOREMAN_LABOR_STAGES: LaborStage[] = ['GRINDING', 'ASSEMBLY', 'POLISHING']

// ── Helpers ──────────────────────────────────────────────────────────────────

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase()
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

// ── Per-WO card ──────────────────────────────────────────────────────────────

interface AssemblyCardProps {
  wo: WorkOrder
}

function AssemblyCard({ wo }: AssemblyCardProps) {
  const { data: sku, isLoading: skuLoading } = useSKU(wo.sku_id)
  const { data: consumptions } = useWorkOrderConsumptions(wo.id)
  const { data: laborEntries } = useWorkOrderLaborEntries(wo.id)
  const { data: materialsData, isLoading: materialsLoading } = useMaterials({ limit: 200 })

  const addConsumption = useAddWorkOrderConsumption()
  const addLabor = useAddLaborEntry()
  const advance = useAdvanceStatus()

  const [materialId, setMaterialId] = useState('')
  const [quantity, setQuantity] = useState('')

  const [stage, setStage] = useState<LaborStage>('ASSEMBLY')
  const [minutes, setMinutes] = useState('')
  const [ratePerHour, setRatePerHour] = useState('')

  const [completeOpen, setCompleteOpen] = useState(false)

  const materials = useMemo(() => materialsData?.items ?? [], [materialsData?.items])
  const selectedMaterial = useMemo(
    () => materials.find((m) => m.id === materialId),
    [materials, materialId],
  )

  const requiresMetal = sku?.requires_metal ?? false
  const hasMetalConsumption = (consumptions ?? []).some((c) => c.material_type === 'METAL')
  const blockedByMissingMetal = requiresMetal && !hasMetalConsumption

  const totalConsumed = consumptions?.length ?? 0
  const totalLabor = laborEntries?.length ?? 0
  const totalMinutes = (laborEntries ?? []).reduce((sum, e) => sum + e.minutes, 0)

  function handleAddConsumption(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMaterial) return
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0) return

    addConsumption.mutate(
      {
        workOrderId: wo.id,
        input: {
          material_id: selectedMaterial.id,
          material_type: selectedMaterial.type as MaterialType,
          quantity: qty,
          unit: selectedMaterial.unit,
        },
      },
      {
        onSuccess: () => {
          setMaterialId('')
          setQuantity('')
        },
      },
    )
  }

  function handleAddLabor(e: React.FormEvent) {
    e.preventDefault()
    const mins = Number(minutes)
    const rate = Number(ratePerHour)
    if (!Number.isFinite(mins) || mins <= 0) return
    if (!Number.isFinite(rate) || rate < 0) return

    addLabor.mutate(
      {
        workOrderId: wo.id,
        input: { stage, minutes: mins, rate_per_hour: rate },
      },
      {
        onSuccess: () => {
          setMinutes('')
          // Keep stage + rate so the foreman can rapidly log multiple entries
          // for the same shift without retyping.
        },
      },
    )
  }

  function handleAdvance() {
    if (blockedByMissingMetal) {
      toast.error('SKU yêu cầu METAL — cần ghi nhận ít nhất 1 vật tư METAL trước khi hoàn thành')
      return
    }
    advance.mutate(
      { id: wo.id, input: { status: 'COMPLETED' } },
      { onSuccess: () => setCompleteOpen(false) },
    )
  }

  return (
    <article className="rounded-xl border bg-card shadow-sm">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
              Đang xử lý
            </Badge>
            <Link
              href={`/work-orders/${wo.id}`}
              className="font-mono text-sm font-semibold text-primary hover:underline"
            >
              {shortId(wo.id)}
            </Link>
            {requiresMetal && (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                Cần METAL
              </Badge>
            )}
          </div>
          <div className="mt-1 truncate text-sm font-medium">
            {skuLoading ? <Skeleton className="h-4 w-40" /> : (sku?.name ?? wo.sku_code ?? '—')}
          </div>
          <p className="text-xs text-muted-foreground">
            {wo.sku_code ?? '—'} · Số lượng: <span className="font-semibold">{wo.quantity}</span>
            {wo.estimated_hours ? ` · Ước tính: ${wo.estimated_hours}h` : null}
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setCompleteOpen(true)}
          disabled={advance.isPending || blockedByMissingMetal}
          title={blockedByMissingMetal ? 'Cần ghi nhận vật tư METAL trước' : undefined}
        >
          {advance.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          Hoàn thành
        </Button>
      </header>

      {/* Quick-entry forms */}
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        {/* Consumption */}
        <form onSubmit={handleAddConsumption} className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Boxes className="size-4 text-muted-foreground" />
            Vật tư phụ
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {totalConsumed} mục
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`mat-${wo.id}`} className="text-xs">Vật tư</Label>
            <Select value={materialId} onValueChange={setMaterialId} disabled={materialsLoading}>
              <SelectTrigger id={`mat-${wo.id}`} className="w-full">
                <SelectValue placeholder={materialsLoading ? 'Đang tải…' : 'Chọn vật tư'} />
              </SelectTrigger>
              <SelectContent>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} <span className="text-muted-foreground">({m.type})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor={`qty-${wo.id}`} className="text-xs">Số lượng</Label>
              <Input
                id={`qty-${wo.id}`}
                type="number"
                min="0"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Đơn vị</Label>
              <Input value={selectedMaterial?.unit ?? '—'} disabled />
            </div>
          </div>

          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={!selectedMaterial || !quantity || addConsumption.isPending}
          >
            {addConsumption.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Ghi nhận vật tư
          </Button>
        </form>

        {/* Labor */}
        <form onSubmit={handleAddLabor} className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="size-4 text-muted-foreground" />
            Công lao động
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              {totalLabor} mục · {totalMinutes} phút
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`stage-${wo.id}`} className="text-xs">Công đoạn</Label>
            <Select value={stage} onValueChange={(v) => setStage(v as LaborStage)}>
              <SelectTrigger id={`stage-${wo.id}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOREMAN_LABOR_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>{LABOR_STAGE_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor={`mins-${wo.id}`} className="text-xs">Phút</Label>
              <Input
                id={`mins-${wo.id}`}
                type="number"
                min="0"
                step="1"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="60"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`rate-${wo.id}`} className="text-xs">Đơn giá VNĐ/giờ</Label>
              <Input
                id={`rate-${wo.id}`}
                type="number"
                min="0"
                step="1000"
                value={ratePerHour}
                onChange={(e) => setRatePerHour(e.target.value)}
                placeholder="50000"
              />
            </div>
          </div>

          <Button
            type="submit"
            size="sm"
            className="w-full"
            disabled={!minutes || !ratePerHour || addLabor.isPending}
          >
            {addLabor.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Ghi nhận công
          </Button>
        </form>
      </div>

      {/* Advance dialog */}
      <AlertDialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hoàn thành lệnh sản xuất?</AlertDialogTitle>
            <AlertDialogDescription>
              Lệnh <span className="font-mono font-medium">{shortId(wo.id)}</span> sẽ chuyển sang
              trạng thái Hoàn thành. Sau đó kế toán có thể chốt giá thành.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {blockedByMissingMetal && (
            <p className="text-sm text-destructive">
              SKU này yêu cầu vật tư METAL. Cần ghi nhận ít nhất 1 vật tư METAL trước khi hoàn thành.
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdvance} disabled={advance.isPending || blockedByMissingMetal}>
              {advance.isPending ? 'Đang xử lý…' : 'Xác nhận hoàn thành'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AssemblyPage() {
  const { data: me } = useMe()
  // BE has no team / assignee filter on /work-orders for foreman yet — pull all
  // IN_PROCESSING work orders for now. When BE adds ?foreman_id, switch to a
  // server-side filter so foremen don't see other shops' lists.
  const { data, isLoading, isError } = useWorkOrders({ status: 'IN_PROCESSING', limit: 100 })
  const workOrders = useMemo(() => data?.items ?? [], [data?.items])

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <HardHat className="size-6 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-2xl font-bold">Xưởng gia công</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {me?.full_name ? `Chào ${me.full_name}, ` : ''}
            quản lý các lệnh đang gia công — ghi nhận vật tư, công lao động và đánh dấu hoàn thành.
          </p>
        </div>
        <Link href="/work-orders" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          Tất cả lệnh sản xuất <ArrowRight className="size-4" />
        </Link>
      </header>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-destructive">
          Không thể tải danh sách lệnh đang gia công.
        </p>
      ) : workOrders.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-12 text-center">
          <HardHat className="mx-auto size-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium">Chưa có lệnh nào đang gia công</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Lệnh sẽ tự động hiển thị ở đây khi CNC chuyển trạng thái sang &quot;Đang xử lý&quot;.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{workOrders.length}</span> lệnh đang xử lý
            {workOrders.some((wo) => {
              return wo.assigned_to && me?.id === wo.assigned_to
            }) && ' · có lệnh được giao cho bạn'}
          </p>
        </div>
      )}

      {workOrders.length > 0 && (
        <div className="space-y-4">
          {workOrders.map((wo) => (
            <AssemblyCard key={wo.id} wo={wo} />
          ))}
        </div>
      )}
    </div>
  )
}
