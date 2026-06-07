'use client'

import { Suspense, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchInput } from '@/components/ui/search-input'
import { DataPagination } from '@/components/ui/data-pagination'
import {
  DateRangeFilter,
  defaultFromIso,
  isoToday,
} from '@/components/dashboard/date-range-filter'
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
import { useRemnants } from '@/lib/hooks/use-remnants'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { usePageParams } from '@/lib/hooks/use-page-params'
import type { RemnantStatus } from '@/types/api'

const STATUS_LABELS: Record<RemnantStatus | 'ALL', string> = {
  ALL: 'Tất cả trạng thái',
  AVAILABLE: 'Sẵn có',
  ALLOCATED: 'Đã phân bổ',
  CONSUMED: 'Đã dùng',
  WASTE: 'Phế liệu',
  EXPIRED: 'Hết hạn',
}

const statusVariant = (status: RemnantStatus) => {
  if (status === 'AVAILABLE') return 'default' as const
  if (status === 'ALLOCATED') return 'secondary' as const
  return 'outline' as const
}

function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 6 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

// ── Inner component — uses useSearchParams (must be inside <Suspense>) ────────

function RemnantsContent() {
  const { page, search, limit, setPage, setSearch, getParam, setParams } = usePageParams(10)

  const [inputValue, setInputValue] = useState(search)
  const debouncedSearch = useDebounce(inputValue, 400)

  const [prevDebounced, setPrevDebounced] = useState(debouncedSearch)
  if (prevDebounced !== debouncedSearch) {
    setPrevDebounced(debouncedSearch)
    setSearch(debouncedSearch)
  }

  const [statusFilter, setStatusFilter] = useState<RemnantStatus | 'ALL'>('ALL')

  const dateFrom = getParam('from') ?? defaultFromIso()
  const dateTo = getParam('to') ?? isoToday()

  const { data, isLoading, isFetching, isError } = useRemnants({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    from: dateFrom,
    to: dateTo,
  })

  const isPending = isFetching && inputValue !== debouncedSearch

  const items = data?.items ?? []
  const totalItems = data?.total_items ?? 0
  const totalPages = data?.total_pages ?? 1

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={inputValue}
          onChange={(v) => { setInputValue(v) }}
          isPending={isPending}
          placeholder="Tìm theo ID, kích thước…"
          containerClassName="w-full sm:max-w-sm"
        />

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as RemnantStatus | 'ALL')
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Lọc trạng thái" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_LABELS) as (RemnantStatus | 'ALL')[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DateRangeFilter
          from={dateFrom}
          to={dateTo}
          onChange={({ from, to }) => setParams({ from, to })}
          className="sm:ml-auto"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm">
        {isError ? (
          <p className="p-6 text-sm text-destructive">
            Không thể tải dữ liệu. Kiểm tra kết nối API.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Kích thước (mm)</TableHead>
                <TableHead>Nguồn gốc</TableHead>
                <TableHead>Phân bổ cho lệnh cắt</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton rows={limit} />
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {debouncedSearch
                      ? `Không tìm thấy kết quả cho "${debouncedSearch}"`
                      : 'Không có tấm lẻ nào'}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((r) => (
                  <TableRow
                    key={r.id}
                    className={isFetching ? 'opacity-60 transition-opacity' : ''}
                  >
                    <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}…</TableCell>
                    <TableCell>
                      {r.dimensions.length_mm} × {r.dimensions.width_mm}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.parent_board_id
                        ? `Tấm nguyên: ${r.parent_board_id.slice(0, 6)}…`
                        : r.parent_remnant_id
                          ? `Tấm lẻ: ${r.parent_remnant_id.slice(0, 6)}…`
                          : '—'}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.allocated_to_wo ? `${r.allocated_to_wo.slice(0, 8)}…` : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && !isError && (
        <DataPagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          limit={limit}
          onPageChange={setPage}
        />
      )}
    </>
  )
}

// ── Page shell ────────────────────────────────────────────────────────────────

export default function RemnantsPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Kho tấm lẻ</h1>
      <Suspense
        fallback={
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        }
      >
        <RemnantsContent />
      </Suspense>
    </div>
  )
}
