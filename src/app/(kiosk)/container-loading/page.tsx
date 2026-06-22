'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Container as ContainerIcon, RefreshCw, ScanLine, XCircle } from 'lucide-react'
import { BigButton } from '@/components/kiosk/big-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ApiClientError } from '@/lib/api/client'
import { useScanFG } from '@/lib/hooks/use-packing'
import { useAddContainerLine } from '@/lib/hooks/use-containers'
import type { PackingScanResult } from '@/types/api'

const RESET_AFTER_MS = 3000
const CONTAINER_STORAGE_KEY = 'container_loading_container_v1'
const COUNTER_KEY = 'container_loading_counters_v1'

interface DailyCounter {
  date: string
  loaded: number
}

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function loadCounter(): DailyCounter {
  if (typeof window === 'undefined') return { date: todayKey(), loaded: 0 }
  try {
    const raw = localStorage.getItem(COUNTER_KEY)
    if (!raw) return { date: todayKey(), loaded: 0 }
    const parsed = JSON.parse(raw) as DailyCounter
    return parsed.date === todayKey() ? parsed : { date: todayKey(), loaded: 0 }
  } catch {
    return { date: todayKey(), loaded: 0 }
  }
}

function saveCounter(c: DailyCounter) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(COUNTER_KEY, JSON.stringify(c)) } catch { /* quota */ }
}

function loadSavedContainer(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(CONTAINER_STORAGE_KEY) ?? ''
}

function saveContainer(id: string) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(CONTAINER_STORAGE_KEY, id) } catch { /* quota */ }
}

function parseNumber(v: string): number {
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : -1
}

function addLineErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (err.status === 409) return 'Mã hàng đã được xếp vào container, hoặc container không ở trạng thái cho phép.'
    if (err.status === 422) return 'Vượt quá sức chứa container.'
    if (err.status === 400) return err.message ?? 'Dữ liệu không hợp lệ.'
  }
  return err instanceof Error ? err.message : 'Xếp hàng thất bại.'
}

export default function ContainerLoadingPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [barcode, setBarcode] = useState('')
  const [scanResult, setScanResult] = useState<PackingScanResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [selectedContainerId, setSelectedContainerId] = useState<string>(() => loadSavedContainer())
  const [cbm, setCbm] = useState('')
  const [weight, setWeight] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadSuccess, setLoadSuccess] = useState(false)
  const [counter, setCounter] = useState<DailyCounter>(() => loadCounter())

  const scan = useScanFG()
  const addLine = useAddContainerLine()

  // Autofocus after every state change.
  useEffect(() => {
    if (!scanResult && !loadSuccess) inputRef.current?.focus()
  }, [scanResult, loadSuccess, loadError])

  // Auto-reset after successful load.
  useEffect(() => {
    if (!loadSuccess) return
    const t = setTimeout(() => {
      setLoadSuccess(false)
      setScanResult(null)
      setBarcode('')
      setLoadError(null)
      inputRef.current?.focus()
    }, RESET_AFTER_MS)
    return () => clearTimeout(t)
  }, [loadSuccess])

  const handleScan = () => {
    const trimmed = barcode.trim()
    if (!trimmed || scan.isPending) return
    setScanError(null)
    setScanResult(null)
    setLoadError(null)
    setLoadSuccess(false)
    scan.mutate(trimmed, {
      onSuccess: (data) => {
        setScanResult(data)
        const suggested = data.suggested_containers?.[0]?.container_id
        const initial = suggested ?? loadSavedContainer()
        setSelectedContainerId(initial)
        if (initial) saveContainer(initial)
        setCbm('')
        setWeight('')
      },
      onError: (err) => {
        const status = err instanceof ApiClientError ? err.status : null
        setScanError(
          status === 404 ? 'Mã vạch không tồn tại trong hệ thống.' :
          status === 409 ? 'Mã hàng đã được xếp hoặc không hợp lệ.' :
          err instanceof Error ? err.message : 'Quét mã thất bại.',
        )
        setBarcode('')
      },
    })
  }

  const handleLoad = () => {
    if (!scanResult || addLine.isPending) return
    const fg = scanResult.fg
    if (!fg.sales_order_line_id) {
      setLoadError('Thành phẩm này chưa được gán vào dòng đơn hàng.')
      return
    }
    if (!selectedContainerId) {
      setLoadError('Vui lòng chọn container.')
      return
    }
    const cbmNum = parseNumber(cbm)
    const weightNum = parseNumber(weight)
    if (cbmNum < 0) { setLoadError('CBM không hợp lệ.'); return }
    if (weightNum < 0) { setLoadError('Khối lượng không hợp lệ.'); return }

    setLoadError(null)
    addLine.mutate(
      {
        id: selectedContainerId,
        body: {
          sales_order_line_id: fg.sales_order_line_id,
          sku_id: fg.sku_id,
          qty: 1,
          cbm_total: cbmNum,
          weight_kg_total: weightNum,
        },
      },
      {
        onSuccess: () => {
          setLoadSuccess(true)
          const updated = { date: todayKey(), loaded: counter.loaded + 1 }
          setCounter(updated)
          saveCounter(updated)
          saveContainer(selectedContainerId)
        },
        onError: (err) => setLoadError(addLineErrorMessage(err)),
      },
    )
  }

  const suggestions = scanResult?.suggested_containers ?? []

  return (
    <div className="flex min-h-[calc(100vh-9rem)] flex-col p-4 gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ContainerIcon className="size-7 text-primary" />
        <h1 className="text-3xl font-bold">Xếp container</h1>
      </div>

      {/* Scan input — always visible */}
      {!scanResult && !loadSuccess && (
        <>
          <div>
            <Label htmlFor="cl-barcode" className="text-lg">Mã vạch thành phẩm</Label>
            <Input
              id="cl-barcode"
              ref={inputRef}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleScan() } }}
              placeholder="Quét hoặc nhập mã rồi nhấn Enter"
              autoFocus
              className="h-14 text-2xl font-mono mt-1"
              disabled={scan.isPending}
            />
          </div>

          {scan.isPending && (
            <div className="flex flex-1 items-center justify-center text-xl text-muted-foreground">
              Đang tra cứu…
            </div>
          )}

          {!scan.isPending && scanError && (
            <div className="flex flex-col gap-4 rounded-2xl border-2 border-destructive bg-destructive/10 p-5">
              <div className="flex items-start gap-3">
                <XCircle className="size-8 shrink-0 text-destructive" />
                <p className="text-xl">{scanError}</p>
              </div>
              <BigButton variant="secondary" onClick={() => { setScanError(null); inputRef.current?.focus() }}>
                <RefreshCw className="size-5" /> Thử lại
              </BigButton>
            </div>
          )}

          {!scan.isPending && !scanError && (
            <div className="flex flex-1 items-center justify-center text-xl text-muted-foreground">
              Sẵn sàng nhận mã vạch
            </div>
          )}
        </>
      )}

      {/* Load success flash */}
      {loadSuccess && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-8">
          <CheckCircle2 className="size-16 text-emerald-600" />
          <p className="text-3xl font-bold text-emerald-800">Đã xếp vào container!</p>
          <p className="text-lg text-emerald-700">
            {scanResult?.fg.barcode_code ?? scanResult?.fg.barcode_id}
          </p>
          <p className="text-base text-muted-foreground mt-2">Tự động sẵn sàng sau 3 giây…</p>
        </div>
      )}

      {/* FG preview + container form */}
      {scanResult && !loadSuccess && (
        <div className="flex flex-1 flex-col gap-4">
          {/* FG card */}
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-1">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Thành phẩm</p>
            <p className="font-mono text-3xl font-bold">{scanResult.fg.sku_code}</p>
            <p className="text-xl text-foreground/80">{scanResult.fg.sku_name}</p>
            <p className="font-mono text-sm text-muted-foreground">
              {scanResult.fg.barcode_code ?? scanResult.fg.barcode_id}
            </p>
            {!scanResult.fg.sales_order_line_id && (
              <p className="text-sm text-amber-700 font-medium mt-1">
                ⚠ Chưa gán vào đơn hàng — không thể xếp container.
              </p>
            )}
          </div>

          {/* Container selector */}
          <div className="space-y-1">
            <Label className="text-lg">Container</Label>
            {suggestions.length === 0 ? (
              <p className="text-base text-amber-700 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                Không có container đề xuất. Nhập mã container bên dưới.
              </p>
            ) : (
              <Select
                value={selectedContainerId}
                onValueChange={(v) => { setSelectedContainerId(v); saveContainer(v) }}
              >
                <SelectTrigger className="h-14 text-lg">
                  <SelectValue placeholder="Chọn container…" />
                </SelectTrigger>
                <SelectContent>
                  {suggestions.map((s) => (
                    <SelectItem key={s.container_id} value={s.container_id} className="text-base">
                      <span className="font-mono font-semibold">{s.code}</span>
                      <span className="ml-2 text-muted-foreground">
                        {s.container_type} · CBM {s.fill_pct_cbm.toFixed(0)}% · KL {s.fill_pct_mass.toFixed(0)}%
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* CBM + Weight inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="cl-cbm" className="text-lg">CBM</Label>
              <Input
                id="cl-cbm"
                inputMode="decimal"
                value={cbm}
                onChange={(e) => setCbm(e.target.value)}
                placeholder="0.000"
                className="h-14 text-xl"
                disabled={addLine.isPending}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cl-weight" className="text-lg">Khối lượng (kg)</Label>
              <Input
                id="cl-weight"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0.0"
                className="h-14 text-xl"
                disabled={addLine.isPending}
              />
            </div>
          </div>

          {loadError && (
            <p className="rounded-lg border border-destructive bg-destructive/10 px-3 py-2 text-base text-destructive">
              {loadError}
            </p>
          )}

          {/* Action buttons */}
          <div className="mt-auto grid grid-cols-2 gap-3">
            <BigButton
              variant="secondary"
              onClick={() => { setScanResult(null); setBarcode(''); setLoadError(null); inputRef.current?.focus() }}
              disabled={addLine.isPending}
            >
              <RefreshCw className="size-5" /> Quét lại
            </BigButton>
            <BigButton
              onClick={handleLoad}
              disabled={addLine.isPending || !selectedContainerId || !scanResult.fg.sales_order_line_id}
            >
              <ContainerIcon className="size-5" />
              {addLine.isPending ? 'Đang xếp…' : 'Xếp vào container'}
            </BigButton>
          </div>
        </div>
      )}

      {/* Footer counter */}
      <footer className="mt-auto flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-base">
        <span>Đã xếp hôm nay:</span>
        <span className="font-bold tabular-nums text-lg">{counter.loaded}</span>
      </footer>
    </div>
  )
}
