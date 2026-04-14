'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Package, MapPin, RotateCcw } from 'lucide-react'
import { BigButton } from '@/components/kiosk/big-button'
import { ScannerView } from '@/components/kiosk/scanner-view'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRemnant, useStockRemnant, useStorageLocations } from '@/lib/hooks/use-remnants'

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'scan_remnant' | 'scan_shelf' | 'done'

// ── Step indicator ────────────────────────────────────────────────────────────

function StepBadge({ step, current }: { step: 1 | 2 | 3; current: Step }) {
  const active =
    (step === 1 && current === 'scan_remnant') ||
    (step === 2 && current === 'scan_shelf') ||
    (step === 3 && current === 'done')
  const done =
    (step === 1 && current !== 'scan_remnant') ||
    (step === 2 && current === 'done')
  return (
    <div
      className={`flex size-8 items-center justify-center rounded-full text-sm font-bold
        ${done ? 'bg-green-500 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
    >
      {done ? '✓' : step}
    </div>
  )
}

// ── Success overlay ───────────────────────────────────────────────────────────

interface SuccessOverlayProps {
  remnantShort: string
  locationLabel: string
  onReset: () => void
}

function SuccessOverlay({ remnantShort, locationLabel, onReset }: SuccessOverlayProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 className="size-10 text-green-600" />
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-green-700">Nhập kho thành công!</p>
        <p className="text-base text-muted-foreground">
          Tấm lẻ <span className="font-mono font-semibold">{remnantShort}</span>
        </p>
        <p className="text-base text-muted-foreground">
          đã được lưu tại <span className="font-semibold">{locationLabel}</span>
        </p>
      </div>
      <BigButton onClick={onReset} className="w-full max-w-xs gap-2">
        <RotateCcw className="size-5" />
        Nhập kho tấm lẻ khác
      </BigButton>
    </div>
  )
}

// ── Shelf code manual input ───────────────────────────────────────────────────
// QR generation for shelf locations is deferred — workers enter the code by hand.

function ShelfCodeInput({ onConfirm }: { onConfirm: (code: string) => void }) {
  const [value, setValue] = useState('')

  function handleConfirm() {
    const trimmed = value.trim()
    if (!trimmed) return
    onConfirm(trimmed)
  }

  return (
    <div className="space-y-3">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleConfirm()
        }}
        placeholder="Nhập mã kệ rồi nhấn Xác nhận..."
        className="h-12 text-base"
        autoFocus
      />
      <Button
        className="h-12 w-full text-base"
        onClick={handleConfirm}
        disabled={!value.trim()}
      >
        Xác nhận mã kệ
      </Button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function RemnantStoreClient() {
  const [step, setStep] = useState<Step>('scan_remnant')
  const [remnantId, setRemnantId] = useState('')
  const [locationBarcode, setLocationBarcode] = useState('')
  const [locationLabel, setLocationLabel] = useState('')

  // Fetch remnant info after scanning — enabled only when id is set
  const { data: remnant, isError: remnantNotFound, isFetching: fetchingRemnant } = useRemnant(remnantId)

  const { mutate: stockRemnant, isPending: isStocking } = useStockRemnant()

  // Preload location data so we can resolve barcode → human-readable label
  const { data: locationsMap } = useStorageLocations()

  // Stable ref — avoids re-triggering effect when handler identity changes
  const prevRemnantIdRef = useRef('')

  // When remnant fetch resolves after scanning, advance step or show error
  useEffect(() => {
    if (!remnantId || remnantId === prevRemnantIdRef.current) return
    if (fetchingRemnant) return
    if (remnantNotFound || !remnant) {
      toast.error('Không tìm thấy tấm lẻ — kiểm tra lại mã QR')
      setRemnantId('')
      return
    }
    prevRemnantIdRef.current = remnantId
    setStep('scan_shelf')
  }, [remnantId, remnant, remnantNotFound, fetchingRemnant])

  function handleRemnantScan(code: string) {
    if (step !== 'scan_remnant' || fetchingRemnant) return
    // Accept both full UUID and short 8-char codes for manual fallback
    const trimmed = code.trim()
    if (!trimmed) return
    setRemnantId(trimmed)
  }

  function handleShelfScan(code: string) {
    if (step !== 'scan_shelf') return
    const trimmed = code.trim()
    if (!trimmed) return
    setLocationBarcode(trimmed)
    // Resolve human-readable label from the location catalogue.
    // Falls back to the raw code if locations haven't loaded or the barcode
    // doesn't match any known location (server will validate on confirm).
    const match = locationsMap
      ? Array.from(locationsMap.values()).find((loc) => loc.barcode === trimmed)
      : undefined
    setLocationLabel(match?.label ?? trimmed)
  }

  function handleConfirm() {
    if (!remnantId || !locationBarcode || isStocking) return
    stockRemnant(
      { remnantId, locationBarcode },
      {
        onSuccess: () => {
          setStep('done')
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Lỗi không xác định'
          toast.error(`Nhập kho thất bại: ${msg}`)
          // Reset shelf scan so worker can try again with a different shelf
          setLocationBarcode('')
          setLocationLabel('')
        },
      },
    )
  }

  function handleReset() {
    setStep('scan_remnant')
    setRemnantId('')
    setLocationBarcode('')
    setLocationLabel('')
    prevRemnantIdRef.current = ''
  }

  if (step === 'done') {
    const shortId = remnantId.slice(0, 8).toUpperCase()
    return <SuccessOverlay remnantShort={shortId} locationLabel={locationLabel} onReset={handleReset} />
  }

  const remnantShort = remnant
    ? remnant.id.slice(0, 8).toUpperCase()
    : remnantId.slice(0, 8).toUpperCase()

  return (
    <div className="space-y-4">
      {/* Header + step tracker */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Nhập kho tấm lẻ</h1>
        <div className="flex items-center gap-2">
          <StepBadge step={1} current={step} />
          <div className="h-px w-4 bg-border" />
          <StepBadge step={2} current={step} />
          <div className="h-px w-4 bg-border" />
          <StepBadge step={3} current={step} />
        </div>
      </div>

      {/* Step 1 — scan remnant */}
      <Card className={step !== 'scan_remnant' ? 'opacity-60' : undefined}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="size-4" />
            Bước 1 — Quét mã QR tấm lẻ
            {remnant && (
              <Badge variant="secondary" className="ml-auto font-mono text-xs">
                {remnantShort}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Always mounted — hidden via CSS so ScannerView can stop cleanly */}
          <div className={step !== 'scan_remnant' ? 'hidden' : undefined}>
            <ScannerView
              onScan={handleRemnantScan}
              disabled={step !== 'scan_remnant' || fetchingRemnant}
            />
          </div>

          {/* Confirmed remnant info */}
          {remnant && step !== 'scan_remnant' && (
            <div className="space-y-1 rounded-lg bg-green-50 p-3 text-sm">
              <p className="font-medium text-green-800">
                {remnant.dimensions.length_mm} × {remnant.dimensions.width_mm} mm
              </p>
              {remnant.lot_batch && (
                <p className="text-green-700">Lô: {remnant.lot_batch}</p>
              )}
              {remnant.supplier_code && !remnant.lot_batch && (
                <p className="text-green-700">NCC: {remnant.supplier_code}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — enter shelf code manually */}
      <Card className={step !== 'scan_shelf' ? 'opacity-60' : undefined}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="size-4" />
            Bước 2 — Nhập mã kệ
            {locationBarcode && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {locationLabel}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === 'scan_shelf' && !locationBarcode && (
            <ShelfCodeInput onConfirm={handleShelfScan} />
          )}

          {locationBarcode && step === 'scan_shelf' && (
            <p className="text-sm text-muted-foreground">
              Đã nhập kệ <span className="font-semibold">{locationLabel}</span>. Nhấn xác nhận để lưu.
            </p>
          )}

          {step !== 'scan_shelf' && !locationBarcode && (
            <p className="text-sm text-muted-foreground">Hoàn thành bước 1 trước</p>
          )}
        </CardContent>
      </Card>

      {/* Confirm button */}
      <BigButton
        onClick={handleConfirm}
        disabled={!remnantId || !locationBarcode || isStocking || step !== 'scan_shelf'}
      >
        {isStocking ? 'Đang lưu…' : 'Xác nhận nhập kho'}
      </BigButton>
    </div>
  )
}
