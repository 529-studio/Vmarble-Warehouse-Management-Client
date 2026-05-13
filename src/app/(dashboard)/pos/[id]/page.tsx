'use client'

import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePOLineItems } from '@/lib/hooks/use-pos'
import { useSKUs } from '@/lib/hooks/use-skus'
import { usePOs } from '@/lib/hooks/use-pos'
import { formatMoney } from '@/lib/format'
import type { LineItem } from '@/types/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ── Line items table ──────────────────────────────────────────────────────────

function LineItemsSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 4 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

interface LineItemsTableProps {
  poId: string
  skuMap: Map<string, string>
}

function LineItemsTable({ poId, skuMap }: LineItemsTableProps) {
  const { data: lineItems, isLoading, isError } = usePOLineItems(poId)

  if (isError) {
    return (
      <p className="p-4 text-sm text-destructive">Không thể tải danh sách sản phẩm.</p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead className="text-right">Số lượng</TableHead>
          <TableHead className="text-right">Đơn giá</TableHead>
          <TableHead className="text-right">Thành tiền</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <LineItemsSkeleton />
        ) : !lineItems || lineItems.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
              Không có sản phẩm nào.
            </TableCell>
          </TableRow>
        ) : (
          lineItems.map((item: LineItem) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {skuMap.get(item.sku_id) ?? (
                  <span className="font-mono text-xs text-muted-foreground">{item.sku_id}</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant="secondary">{item.quantity}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatMoney(item.selling_price.amount, item.selling_price.currency)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatMoney(
                  item.selling_price.amount * item.quantity,
                  item.selling_price.currency,
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PODetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  // Fetch PO metadata via list (cheap, usually cached)
  const { data: posData } = usePOs({ limit: 200 })
  const po = posData?.items.find((p) => p.id === id)

  // Build sku_id → display map for the line items table
  const { data: skusData } = useSKUs({ limit: 200 })
  const skuMap = new Map<string, string>(
    (skusData?.items ?? []).map((s) => [s.id, `${s.code} — ${s.name}`]),
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/pos" aria-label="Quay lại danh sách PO">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <ShoppingCart className="size-6 text-muted-foreground" />
        {po ? (
          <div>
            <h1 className="text-2xl font-bold font-mono">{po.code}</h1>
            <p className="text-sm text-muted-foreground">
              Ngày giao dự kiến: {formatDate(po.expected_delivery)} · Tạo lúc:{' '}
              {formatDate(po.created_at)}
            </p>
          </div>
        ) : (
          <Skeleton className="h-8 w-48 rounded" />
        )}
      </div>

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Danh sách sản phẩm</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LineItemsTable poId={id} skuMap={skuMap} />
        </CardContent>
      </Card>
    </div>
  )
}
