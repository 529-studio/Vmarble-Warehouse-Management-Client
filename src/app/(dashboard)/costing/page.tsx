'use client'

import { Suspense, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchInput } from '@/components/ui/search-input'
import { DataPagination } from '@/components/ui/data-pagination'
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
import { useCosting } from '@/lib/hooks/use-costing'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { usePageParams } from '@/lib/hooks/use-page-params'

const fmt = (n: number) =>
  n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })

type FinalizedFilter = 'ALL' | 'FINALIZED' | 'DRAFT'

const FINALIZED_LABELS: Record<FinalizedFilter, string> = {
  ALL: 'Tất cả',
  FINALIZED: 'Đã chốt',
  DRAFT: 'Nháp',
}

function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 7 }).map((_, j) => (
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

function CostingContent() {
  const { page, search, limit, setPage, setSearch } = usePageParams(10)

  const [inputValue, setInputValue] = useState(search)
  const debouncedSearch = useDebounce(inputValue, 400)

  const [prevDebounced, setPrevDebounced] = useState(debouncedSearch)
  if (prevDebounced !== debouncedSearch) {
    setPrevDebounced(debouncedSearch)
    setSearch(debouncedSearch)
  }

  const [finalizedFilter, setFinalizedFilter] = useState<FinalizedFilter>('ALL')

  const { data, isLoading, isFetching, isError } = useCosting({
    page,
    limit,
    search: debouncedSearch || undefined,
    finalized:
      finalizedFilter === 'ALL' ? undefined : finalizedFilter === 'FINALIZED',
  })

  const isPending = isFetching && inputValue !== debouncedSearch

  const records = data?.items ?? []
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
          placeholder="Tìm theo WO ID, SKU ID…"
          containerClassName="w-full sm:max-w-sm"
        />

        <Select
          value={finalizedFilter}
          onValueChange={(v) => {
            setFinalizedFilter(v as FinalizedFilter)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Lọc trạng thái" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(FINALIZED_LABELS) as FinalizedFilter[]).map((k) => (
              <SelectItem key={k} value={k}>
                {FINALIZED_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">Không thể tải dữ liệu giá thành.</p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isLoading ? 'Đang tải…' : `Tất cả bản ghi (${totalItems})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Lệnh sản xuất</TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-right">CP vật liệu</TableHead>
                  <TableHead className="text-right">CP phụ trợ</TableHead>
                  <TableHead className="text-right">Tổng chi phí</TableHead>
                  <TableHead>Hoàn tất</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton rows={limit} />
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      {debouncedSearch
                        ? `Không tìm thấy kết quả cho "${debouncedSearch}"`
                        : 'Chưa có bản ghi giá thành nào.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => (
                    <TableRow
                      key={r.id}
                      className={isFetching ? 'opacity-60 transition-opacity' : ''}
                    >
                      <TableCell className="font-mono text-xs">
                        {r.work_order_id.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {r.sku_id.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(r.material_cost.amount)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {fmt(r.auxiliary_cost.amount)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {fmt(r.total_cost.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.finalized ? 'default' : 'outline'}>
                          {r.finalized ? 'Đã chốt' : 'Nháp'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString('vi-VN')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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

export default function CostingPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Tính giá thành</h1>
      <Suspense
        fallback={
          <div className="space-y-3">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        }
      >
        <CostingContent />
      </Suspense>
    </div>
  )
}
