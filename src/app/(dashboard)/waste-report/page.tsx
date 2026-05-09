'use client'

import { Suspense, useMemo, useState, useSyncExternalStore } from 'react'
import { Calendar, Download, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { mapApiErrorVi } from '@/lib/api/client'
import { costingApi } from '@/lib/api/costing'
import { can, getCurrentRoleFromCookie } from '@/lib/auth/authorization'
import { useMaterials } from '@/lib/hooks/use-materials'
import { useWasteReport } from '@/lib/hooks/use-waste-report'
import type { WasteReportFilter, WasteReportRow } from '@/types/api'

const ALL_MATERIALS = '__all__'

function useCurrentRole() {
  return useSyncExternalStore(
    () => () => {},
    () => getCurrentRoleFromCookie(),
    () => null,
  )
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function defaultFromDate(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return isoDate(d)
}

function formatM2(mm2: number): string {
  return (mm2 / 1_000_000).toLocaleString('vi-VN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
}

function formatCostPerM2(row: WasteReportRow): string {
  if (row.waste_area_mm2 <= 0) return '—'
  const m2 = row.waste_area_mm2 / 1_000_000
  return formatVND(row.total_waste_cost.amount / m2)
}

function buildCsvFilename(filter: WasteReportFilter): string {
  const from = filter.from ?? 'all'
  const to = filter.to ?? 'all'
  return `waste-report_${from}_${to}.csv`
}

function triggerCsvDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ── Page content ──────────────────────────────────────────────────────────────

function WasteReportContent() {
  const role = useCurrentRole()
  const canRead = can(role, 'read', 'waste_report')
  const canExport = can(role, 'generate', 'waste_report')

  const today = isoDate(new Date())
  const [from, setFrom] = useState<string>(defaultFromDate())
  const [to, setTo] = useState<string>(today)
  const [materialId, setMaterialId] = useState<string>(ALL_MATERIALS)
  const [downloading, setDownloading] = useState(false)

  const filter: WasteReportFilter = useMemo(
    () => ({
      from,
      to,
      ...(materialId !== ALL_MATERIALS ? { material_id: materialId } : {}),
    }),
    [from, to, materialId],
  )

  const { data: materialsData } = useMaterials({ limit: 200 })
  const materials = useMemo(() => materialsData?.items ?? [], [materialsData?.items])

  const {
    data: rows,
    isLoading,
    isFetching,
    isError,
    error,
  } = useWasteReport(canRead ? filter : {})

  const reportRows: WasteReportRow[] = useMemo(() => rows ?? [], [rows])

  const totals = useMemo(() => {
    return reportRows.reduce(
      (acc, r) => ({
        sheets: acc.sheets + r.sheets_consumed,
        areaMm2: acc.areaMm2 + r.waste_area_mm2,
        cost: acc.cost + r.total_waste_cost.amount,
      }),
      { sheets: 0, areaMm2: 0, cost: 0 },
    )
  }, [reportRows])

  const chartData = useMemo(
    () =>
      reportRows.map((r) => ({
        name: r.material_name || r.material_id.slice(0, 8),
        cost: r.total_waste_cost.amount,
      })),
    [reportRows],
  )

  async function handleDownloadCsv() {
    setDownloading(true)
    try {
      const blob = await costingApi.wasteReportCsvBlob(filter)
      triggerCsvDownload(blob, buildCsvFilename(filter))
      toast.success('Đã tải báo cáo CSV')
    } catch (err) {
      toast.error(mapApiErrorVi(err, 'Tải CSV thất bại'))
    } finally {
      setDownloading(false)
    }
  }

  function resetRange() {
    setFrom(defaultFromDate())
    setTo(today)
  }

  if (!canRead) {
    return (
      <div className="rounded-lg border bg-muted/20 p-6 text-sm text-muted-foreground">
        Bạn không có quyền xem báo cáo hao hụt. Liên hệ quản trị viên nếu cần truy cập.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="waste-from" className="text-xs text-muted-foreground">
              Từ ngày
            </Label>
            <div className="flex items-center gap-1.5">
              <Calendar className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                id="waste-from"
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-muted-foreground text-sm" aria-hidden="true">–</span>
              <input
                aria-label="Đến ngày"
                type="date"
                value={to}
                min={from}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button variant="outline" size="sm" onClick={resetRange} className="gap-1">
                <RotateCcw className="size-3" />
                30 ngày
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vật liệu</Label>
            <Select value={materialId} onValueChange={setMaterialId}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_MATERIALS}>Tất cả vật liệu</SelectItem>
                {materials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {canExport && (
          <Button onClick={handleDownloadCsv} disabled={downloading || isLoading}>
            {downloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Tải CSV
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Số tấm tiêu thụ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {isLoading ? <Skeleton className="h-7 w-20" /> : totals.sheets.toLocaleString('vi-VN')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Tổng diện tích hao hụt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {isLoading ? <Skeleton className="h-7 w-24" /> : `${formatM2(totals.areaMm2)} m²`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Tổng chi phí hao hụt</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-red-700">
              {isLoading ? <Skeleton className="h-7 w-32" /> : formatVND(totals.cost)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Chi phí hao hụt theo vật liệu</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-60 w-full" />
          ) : chartData.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Không có dữ liệu hao hụt trong khoảng thời gian đã chọn.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 12, right: 12, left: 12, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) => (v / 1_000_000).toLocaleString('vi-VN') + 'tr'}
                />
                <Tooltip formatter={(v: number) => formatVND(v)} />
                <Bar dataKey="cost" fill="#dc2626" name="Chi phí hao hụt" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <div className={`rounded-lg border transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
        <div className="border-b px-4 py-3 text-sm font-medium text-muted-foreground">
          {isLoading ? 'Đang tải…' : `Chi tiết theo vật liệu (${reportRows.length})`}
        </div>

        {isError ? (
          <p className="p-4 text-sm text-destructive">{mapApiErrorVi(error, 'Không thể tải báo cáo.')}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vật liệu</TableHead>
                <TableHead className="text-right">Số tấm</TableHead>
                <TableHead className="text-right">Hao hụt (m²)</TableHead>
                <TableHead className="text-right">Chi phí TB / m²</TableHead>
                <TableHead className="text-right">Tổng chi phí hao hụt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : reportRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Không có dữ liệu hao hụt trong khoảng thời gian đã chọn.
                  </TableCell>
                </TableRow>
              ) : (
                reportRows.map((r) => (
                  <TableRow key={r.material_id}>
                    <TableCell className="font-medium">{r.material_name}</TableCell>
                    <TableCell className="text-right">{r.sheets_consumed.toLocaleString('vi-VN')}</TableCell>
                    <TableCell className="text-right">{formatM2(r.waste_area_mm2)}</TableCell>
                    <TableCell className="text-right">{formatCostPerM2(r)}</TableCell>
                    <TableCell className="text-right font-medium text-red-700">
                      {formatVND(r.total_waste_cost.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function WasteReportPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Trash2 className="size-6 text-muted-foreground" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-bold">Báo cáo hao hụt</h1>
          <p className="text-sm text-muted-foreground">
            Tổng hợp chi phí hao hụt theo vật liệu (BR-C03). Phân bổ chi phí dựa trên giá tấm gốc.
          </p>
        </div>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <WasteReportContent />
      </Suspense>
    </div>
  )
}
