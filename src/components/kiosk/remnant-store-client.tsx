'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Package, MapPin, RotateCcw } from 'lucide-react'
import { mapApiErrorVi } from '@/lib/api/client'
import { BigButton } from '@/components/kiosk/big-button'
import { ScannerView } from '@/components/kiosk/scanner-view'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

// ── Location QR payload normalizer ───────────────────────────────────────────
// Shelf QR codes may be plain barcodes or JSON objects with various key names.
// Tries JSON.parse first; extracts barcode/code/id/barcode_id fields, then
// falls back to treating the raw input as the barcode string.

function normalizeLocationBarcode(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>
      const candidate =
        parsed.barcode ?? parsed.code ?? parsed.id ?? parsed.barcode_id ?? parsed.barcodeId
      return typeof candidate === 'string' ? candidate.trim() : trimmed
    } catch {
      return trimmed
    }
  }
  return trimmed
}

// ── Main component ────────────────────────────────────────────────────────────

export function RemnantStoreClient() {
  // scannedRemnantId drives the fetch query; step is derived from query outcome.
  const [scannedRemnantId, setScannedRemnantId] = useState('')
  const [locationBarcode, setLocationBarcode] = useState('')
  const [locationLabel, setLocationLabel] = useState('')
  const [isDone, setIsDone] = useState(false)

  // Fetch remnant info after scanning — enabled only when id is set
  const { data: remnant, isError: remnantNotFound, isFetching: fetchingRemnant, isSuccess: remnantFound } = useRemnant(scannedRemnantId)

  const { mutate: stockRemnant, isPending: isStocking } = useStockRemnant()

  // Preload location data so we can resolve barcode → human-readable label
  const { data: locationsMap } = useStorageLocations()

  // Derive step from state — no setStep calls needed, no effects for state transitions.
  const step: Step = isDone
    ? 'done'
    : remnantFound && remnant
    ? 'scan_shelf'
    : 'scan_remnant'

  // Show error toast when a scan fails — pure side effect, no setState here.
  useEffect(() => {
    if (!scannedRemnantId || fetchingRemnant) return
    if (remnantNotFound) {
      toast.error('Không tìm thấy tấm lẻ — kiểm tra lại mã QR')
    }
  }, [scannedRemnantId, remnantNotFound, fetchingRemnant])

  function handleRemnantScan(code: string) {
    if (step !== 'scan_remnant' || fetchingRemnant) return
    const trimmed = code.trim()
    if (!trimmed) return
    setScannedRemnantId(trimmed)
  }

  function handleShelfScan(code: string) {
    if (step !== 'scan_shelf') return
    const barcode = normalizeLocationBarcode(code)
    if (!barcode) return

    // When locations catalogue is loaded, validate before accepting.
    // If the map is still loading (undefined), allow through — server will guard.
    if (locationsMap && locationsMap.size > 0) {
      const match = Array.from(locationsMap.values()).find((loc) => loc.barcode === barcode)
      if (!match) {
        toast.error(`Mã vị trí "${barcode}" không hợp lệ — thử quét lại`)
        return
      }
      setLocationBarcode(barcode)
      setLocationLabel(match.label)
      return
    }

    // Locations not yet loaded — allow through; server validates on stockRemnant
    setLocationBarcode(barcode)
    setLocationLabel(barcode)
  }

  function handleConfirm() {
    if (!scannedRemnantId || !locationBarcode || isStocking) return
    stockRemnant(
      { remnantId: scannedRemnantId, locationBarcode },
      {
        onSuccess: () => {
          setIsDone(true)
        },
        onError: (err: unknown) => {
          toast.error(mapApiErrorVi(err, 'Nhập kho thất bại'))
          // Reset shelf scan so worker can retry with a different shelf
          setLocationBarcode('')
          setLocationLabel('')
        },
      },
    )
  }

  function handleShelfRescan() {
    setLocationBarcode('')
    setLocationLabel('')
  }

  function handleReset() {
    setScannedRemnantId('')
    setLocationBarcode('')
    setLocationLabel('')
    setIsDone(false)
  }

  if (step === 'done') {
    const shortId = scannedRemnantId.slice(0, 8).toUpperCase()
    return <SuccessOverlay remnantShort={shortId} locationLabel={locationLabel} onReset={handleReset} />
  }

  const remnantShort = remnant
    ? remnant.id.slice(0, 8).toUpperCase()
    : scannedRemnantId.slice(0, 8).toUpperCase()

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

      {/* Step 2 — scan shelf QR */}
      <Card className={step !== 'scan_shelf' ? 'opacity-60' : undefined}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="size-4" />
            Bước 2 — Quét mã QR vị trí kho
            {locationBarcode && (
              <Badge variant="secondary" className="ml-auto text-xs">
                {locationLabel}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Scanner — mounted only when on this step and no barcode captured yet */}
          {step === 'scan_shelf' && !locationBarcode && (
            <ScannerView onScan={handleShelfScan} disabled={false} />
          )}

          {/* Confirmed location info + rescan */}
          {locationBarcode && step === 'scan_shelf' && (
            <div className="space-y-3">
              <div className="rounded-lg bg-green-50 p-3 text-sm">
                <p className="font-medium text-green-800">
                  <MapPin className="mr-1 inline size-3.5" />
                  {locationLabel}
                </p>
                {locationLabel !== locationBarcode && (
                  <p className="mt-0.5 font-mono text-xs text-green-600">{locationBarcode}</p>
                )}
              </div>
              <Button
                variant="outline"
                className="h-12 w-full text-base"
                onClick={handleShelfRescan}
              >
                Quét lại vị trí khác
              </Button>
            </div>
          )}

          {step !== 'scan_shelf' && !locationBarcode && (
            <p className="text-sm text-muted-foreground">Hoàn thành bước 1 trước</p>
          )}
        </CardContent>
      </Card>

      {/* Confirm button */}
      <BigButton
        onClick={handleConfirm}
        disabled={!scannedRemnantId || !locationBarcode || isStocking || step !== 'scan_shelf'}
      >
        {isStocking ? 'Đang lưu…' : 'Xác nhận nhập kho'}
      </BigButton>
    </div>
  )
}
