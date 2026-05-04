'use client'

import { useState, useId, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller, useWatch } from 'react-hook-form'
import QRCode from 'react-qr-code'
import { toast } from 'sonner'
import { AlertTriangle, CheckCircle2, ChevronLeft, Copy, Check, Printer } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BigButton } from '@/components/kiosk/big-button'
import { useCuttingOrder, useRecordCut } from '@/lib/hooks/use-cutting-orders'
import { useAvailableSheets, useRemnant, useOpenRemnantLabelPdf } from '@/lib/hooks/use-remnants'
import { ApiClientError } from '@/lib/api/client'
import { cn } from '@/lib/utils'

// ── Error message map ─────────────────────────────────────────────────────────
// Maps API error codes (from the Go backend BizError) to Vietnamese strings
// shown on-screen so the worker never sees raw JSON.

const API_ERROR_VI: Record<string, string> = {
  // domain.ErrAreaConservation
  ERR_AREA_CONSERVATION:
    'Diện tích vượt quá tấm nguồn. Kiểm tra lại kích thước.',
  // domain.ErrPreconditionFailed
  ERR_PRECONDITION_FAILED:
    'Tấm này đã được cắt hoặc không khả dụng.',
  // domain.ErrInvalidInput
  ERR_INVALID_INPUT:
    'Dữ liệu nhập không hợp lệ. Kiểm tra lại các trường.',
  // domain.ErrNotFound
  ERR_NOT_FOUND:
    'Không tìm thấy lệnh cắt hoặc tấm nguyên.',
}

function mapApiError(err: unknown): string {
  if (err instanceof ApiClientError) {
    // Backend sends code like "ERR_AREA_CONSERVATION" or HTTP-mapped codes.
    const mapped = API_ERROR_VI[err.code]
    if (mapped) return mapped
    // Fallback: show the human message from the server if it exists.
    if (err.message) return err.message
  }
  return 'Có lỗi xảy ra. Vui lòng thử lại.'
}

// ── NumericField ──────────────────────────────────────────────────────────────
// Wrapper around Input that:
//  - sets type="number" inputMode="numeric" for kiosk numeric keyboard
//  - shows an error message below the field when error is set

interface NumericFieldProps {
  id: string
  label: string
  value: string
  onChange: (val: string) => void
  onBlur?: () => void
  error?: string
  placeholder?: string
  disabled?: boolean
}

function NumericField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  disabled,
}: NumericFieldProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-base">{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn('h-12 text-base', error && 'border-destructive focus-visible:ring-destructive')}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// ── WasteToggle ───────────────────────────────────────────────────────────────
// Two-option pill toggle: "Còn tấm lẻ" / "Hao hụt toàn bộ"

interface WasteToggleProps {
  hasRemnant: boolean
  onChange: (hasRemnant: boolean) => void
  disabled?: boolean
}

function WasteToggle({ hasRemnant, onChange, disabled }: WasteToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Kết quả tấm lẻ"
      className="grid grid-cols-2 gap-2"
    >
      <button
        type="button"
        role="radio"
        aria-checked={hasRemnant}
        disabled={disabled}
        onClick={() => onChange(true)}
        className={cn(
          'flex min-h-[48px] items-center justify-center rounded-xl border-2 px-3 text-base font-semibold transition-all',
          hasRemnant
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border bg-white text-muted-foreground',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        Còn tấm lẻ
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={!hasRemnant}
        disabled={disabled}
        onClick={() => onChange(false)}
        className={cn(
          'flex min-h-[48px] items-center justify-center rounded-xl border-2 px-3 text-base font-semibold transition-all',
          !hasRemnant
            ? 'border-destructive bg-destructive/10 text-destructive'
            : 'border-border bg-white text-muted-foreground',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        Hao hụt toàn bộ
      </button>
    </div>
  )
}

// ── SuccessModal ──────────────────────────────────────────────────────────────
// Fullscreen overlay shown after a successful record-cut.

interface SuccessModalProps {
  remnantId: string | null | undefined
  onGoHome: () => void
}

function SuccessModal({
  remnantId,
  onGoHome,
}: SuccessModalProps) {
  const [copied, setCopied] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  const { mutateAsync: openRemnantLabel, isPending: isOpeningLabel } = useOpenRemnantLabelPdf()

  function handleCopy() {
    if (!remnantId) return
    navigator.clipboard.writeText(remnantId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handlePrintLabel() {
    if (!remnantId) return

    if (pdfUrl) {
      window.open(pdfUrl, '_blank', 'noopener,noreferrer')
      return
    }

    try {
      const url = await openRemnantLabel(remnantId)
      setPdfUrl(url)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast.info('Không mở được file PDF, đang in trực tiếp từ màn hình.')
      window.print()
    }
  }

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ghi nhận thành công"
      className="fixed inset-0 z-50 overflow-y-auto bg-white p-4"
    >
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4 py-4">
        <CheckCircle2 className="size-16 text-green-500" aria-hidden="true" />

        <div className="space-y-1 text-center">
          <h2 className="text-2xl font-bold text-foreground">Ghi nhận thành công</h2>
          <p className="text-base text-muted-foreground">Kết quả cắt đã được lưu.</p>
        </div>

        {remnantId ? (
          <div className="w-full space-y-3">
            <div className="rounded-xl border bg-muted/40 p-4 text-center">
              <div className="mx-auto mb-3 rounded-lg bg-white p-2">
                <QRCode value={remnantId} size={160} />
              </div>
              <p className="text-base text-muted-foreground">Xem trước tem (mm)</p>
              <p className="mt-0.5 break-all font-mono text-sm font-medium">{remnantId}</p>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border text-base font-semibold transition-colors hover:bg-muted/50"
            >
              {copied ? (
                <><Check className="size-4 text-green-600" aria-hidden="true" /> Đã sao chép mã</>
              ) : (
                <><Copy className="size-4" aria-hidden="true" /> Sao chép mã tem</>
              )}
            </button>

            <BigButton type="button" onClick={handlePrintLabel} disabled={isOpeningLabel}>
              <Printer className="mr-2 size-5" aria-hidden="true" />
              {isOpeningLabel ? 'Đang chuẩn bị file in…' : 'In tem tấm lẻ'}
            </BigButton>

            <p className="text-center text-xs text-muted-foreground">
              Tem in chuẩn 50×30mm. Khi API in lỗi hệ thống sẽ dùng in trực tiếp từ màn hình QR.
            </p>

          </div>
        ) : (
          <div className="w-full rounded-xl border bg-muted/40 px-6 py-4 text-center">
            <p className="text-sm text-muted-foreground">Không có tấm lẻ (hao hụt toàn bộ)</p>
          </div>
        )}

        <div className="w-full">
          <BigButton type="button" variant="secondary" onClick={onGoHome}>Về trang chính</BigButton>
        </div>
      </div>
    </div>
  )
}

// ── Form field shape ──────────────────────────────────────────────────────────
//
// remnantLength and remnantWidth can be undefined when shouldUnregister unmounts
// the fields (i.e. when the user chooses "Hao hụt toàn bộ").
//
// boardSheetId is used only when neither sheet_id nor remnant_id comes from
// the URL — i.e. the worker chose "Dùng tấm nguyên" without a pre-selected
// sheet. It maps to the sheet_id field in RecordCutInput.

interface CutFormValues {
  lotId?: string
  boardSheetId?: string
  usedLength: string
  usedWidth: string
  remnantLength?: string
  remnantWidth?: string
}

// ── ReportCutForm (main client component) ────────────────────────────────────

export function ReportCutForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const woId = searchParams.get('wo_id') ?? ''
  // Use `|| undefined` (not `?? undefined`) so that an empty query-string value
  // is treated as absent rather than forwarded as '' to the API.
  const sheetId = searchParams.get('sheet_id') || undefined
  const remnantSourceId = searchParams.get('remnant_id') || undefined
  const materialIdFromUrl = searchParams.get('material_id') || undefined

  // ── Work order context (for display + area-conservation hint) ────────────
  const { data: workOrder, isLoading: isLoadingWO } = useCuttingOrder(woId)

  // True when the worker came from "Dùng tấm nguyên" (skip remnant modal)
  // and hasn't pre-selected any source material.
  const needsBoardSheetInput = !sheetId && !remnantSourceId

  // Fetch available sheets only when the worker needs to select one.
  // Enabled flag prevents an unnecessary request when remnant_id is already set.
  const selectedMaterialId = materialIdFromUrl

  const {
    data: lotSheetsData,
    isLoading: isLoadingLotOptions,
  } = useAvailableSheets(
    { material_id: selectedMaterialId, limit: 200 },
    needsBoardSheetInput && !!selectedMaterialId,
  )

  const lotSheets = useMemo(() => lotSheetsData?.items ?? [], [lotSheetsData?.items])
  const lotOptions = useMemo(() => {
    const byLot = new Map<string, { id: string; label: string }>()
    for (const sheet of lotSheets) {
      if (byLot.has(sheet.lot_id)) continue
      byLot.set(sheet.lot_id, {
        id: sheet.lot_id,
        label:
          sheet.lot_batch
            ?? sheet.supplier_code
            ?? sheet.lot_id.slice(0, 8).toUpperCase(),
      })
    }
    return Array.from(byLot.values())
  }, [lotSheets])

  // ── react-hook-form ───────────────────────────────────────────────────────
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CutFormValues>({
    defaultValues: {
      lotId: '',
      boardSheetId: '',
      usedLength: '',
      usedWidth: '',
      remnantLength: '',
      remnantWidth: '',
    },
    // Unregister remnantLength / remnantWidth when the fields unmount
    // (i.e. when user switches to "Hao hụt") so their values are excluded
    // from the submitted data and their validation errors are cleared.
    shouldUnregister: true,
  })

  const selectedLotId = useWatch({ control, name: 'lotId' })

  const {
    data: filteredSheetsData,
    isLoading: isLoadingFilteredSheets,
  } = useAvailableSheets(
    {
      material_id: selectedMaterialId,
      lot_id: selectedLotId || undefined,
      limit: 200,
    },
    needsBoardSheetInput && !!selectedMaterialId && !!selectedLotId,
  )

  const filteredSheets = useMemo(() => filteredSheetsData?.items ?? [], [filteredSheetsData?.items])

  useEffect(() => {
    setValue('boardSheetId', '')
  }, [selectedLotId, setValue])

  useEffect(() => {
    setValue('lotId', '')
    setValue('boardSheetId', '')
  }, [selectedMaterialId, setValue])

  // ── Supplementary state (not form fields) ────────────────────────────────
  // hasRemnant is a UI toggle, not a text input, so we keep it in useState.
  const [hasRemnant, setHasRemnant] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const [successResult, setSuccessResult] = useState<{
    cuttingRecordId: string
    remnantId: string | null | undefined
  } | null>(null)

  // ── Mutation ─────────────────────────────────────────────────────────────
  const { mutate: recordCut, isPending } = useRecordCut()

  // ── Unique IDs for a11y (avoids SSR hydration mismatch) ─────────────────
  const uid = useId()
  const fid = (name: string) => `${uid}-${name}`

  // ── Client-side area-conservation pre-check (BR-K03 blocking) ───────────
  // Computes used+remnant area against the actual source (sheet/remnant).
  // Intentionally skips validation when source dimensions are unknown
  // (e.g. URL-provided sheet_id with no local data) — backend guards that case.
  const watchedUsedLength = useWatch({ control, name: 'usedLength' })
  const watchedUsedWidth = useWatch({ control, name: 'usedWidth' })
  const watchedRemnantLength = useWatch({ control, name: 'remnantLength' })
  const watchedRemnantWidth = useWatch({ control, name: 'remnantWidth' })
  const watchedBoardSheetId = useWatch({ control, name: 'boardSheetId' })

  const { data: sourceRemnant } = useRemnant(remnantSourceId ?? '')

  const sourceDimensions = useMemo(() => {
    if (remnantSourceId && sourceRemnant) return sourceRemnant.dimensions
    if (needsBoardSheetInput && watchedBoardSheetId) {
      return filteredSheets.find((s) => s.id === watchedBoardSheetId)?.dimensions
    }
    return undefined
  }, [remnantSourceId, sourceRemnant, needsBoardSheetInput, watchedBoardSheetId, filteredSheets])

  const areaConservationError = useMemo(() => {
    if (!sourceDimensions) return null
    const uL = parseFloat(watchedUsedLength)
    const uW = parseFloat(watchedUsedWidth)
    if (isNaN(uL) || isNaN(uW) || uL <= 0 || uW <= 0) return null

    const rL = parseFloat(watchedRemnantLength ?? '')
    const rW = parseFloat(watchedRemnantWidth ?? '')
    const remnantArea = hasRemnant && !isNaN(rL) && !isNaN(rW) && rL > 0 && rW > 0 ? rL * rW : 0

    const sourceArea = sourceDimensions.length_mm * sourceDimensions.width_mm
    if (uL * uW + remnantArea <= sourceArea) return null

    return `Diện tích vượt quá tấm nguồn (${sourceDimensions.length_mm}×${sourceDimensions.width_mm}mm). Giảm kích thước đã dùng hoặc tấm lẻ.`
  }, [sourceDimensions, watchedUsedLength, watchedUsedWidth, hasRemnant, watchedRemnantLength, watchedRemnantWidth])

  // ── Submit handler ───────────────────────────────────────────────────────
  function onValidSubmit(data: CutFormValues) {
    if (needsBoardSheetInput && !selectedMaterialId) {
      setApiError('Lệnh cắt chưa có loại vật liệu. Vui lòng quay lại để chọn vật liệu trước.')
      return
    }

    setApiError(null)

    recordCut(
      {
        // Exactly one of sheet_id / remnant_id is required by the backend.
        // Priority: URL param → form input (when worker typed/scanned the ID).
        sheet_id: sheetId ?? (data.boardSheetId?.trim() || undefined),
        remnant_id: remnantSourceId,
        work_order_id: woId,
        // workOrder is guaranteed non-null here because isDisabled blocks submit
        // while isLoadingWO is true, so the button can't be pressed before load.
        sku_id: workOrder?.sku_id ?? '',
        used_dimension: {
          length_mm: parseFloat(data.usedLength),
          width_mm: parseFloat(data.usedWidth),
        },
        remnant_dimension: hasRemnant && data.remnantLength && data.remnantWidth
          ? {
              length_mm: parseFloat(data.remnantLength),
              width_mm: parseFloat(data.remnantWidth),
            }
          : undefined,
      },
      {
        onSuccess: (res) => {
          setSuccessResult({
            cuttingRecordId: res.cutting_record_id,
            remnantId: res.remnant_id,
          })
        },
        onError: (err) => {
          setApiError(mapApiError(err))
        },
      },
    )
  }

  // ── Success state: show fullscreen modal ─────────────────────────────────
  if (successResult) {
    return (
      <SuccessModal
        remnantId={successResult.remnantId}
        onGoHome={() => router.push('/cutting-orders')}
      />
    )
  }

  // ── Missing wo_id guard ───────────────────────────────────────────────────
  if (!woId) {
    return (
      <div className="p-4">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Thiếu mã lệnh cắt (wo_id). Quay lại danh sách lệnh cắt.
        </div>
      </div>
    )
  }

  const missingMaterialSelection = needsBoardSheetInput && !selectedMaterialId

  // Block submission while loading WO (prevents sending sku_id as empty string),
  // while a mutation is in flight, or when material was not selected upstream.
  const isDisabled = isPending || isLoadingWO || missingMaterialSelection || !!areaConservationError
  const sourceDim = workOrder?.sku_dimensions

  return (
    <form
      onSubmit={handleSubmit(onValidSubmit)}
      noValidate
      className="space-y-4 p-4 pb-6"
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-xl border bg-white text-muted-foreground shadow-sm active:bg-muted"
          aria-label="Quay lại"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight">Báo cáo kết quả cắt</h1>
          {workOrder && (
            <p className="truncate text-base text-muted-foreground">
              {workOrder.sku_code ?? workOrder.sku_id.slice(0, 12) + '…'}
              {sourceDim
                ? ` · ${sourceDim.length_mm}×${sourceDim.width_mm} mm`
                : ''}
            </p>
          )}
        </div>
      </div>

      {/* ── Board sheet source (only when no sheet/remnant from URL) ── */}
      {needsBoardSheetInput && (
        <Card>
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-base">Chọn vật liệu cắt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            {!selectedMaterialId ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                Lệnh cắt chưa có loại vật liệu. Vui lòng quay lại để quản đốc chọn trước khi bắt đầu cắt.
              </div>
            ) : (
              <>
                <Controller
                  name="lotId"
                  control={control}
                  rules={{ required: 'Chọn lô vật liệu' }}
                  render={({ field }) => (
                    <div className="space-y-1">
                      <Label htmlFor={fid('lot-id')} className="text-base">
                        Lô vật liệu
                      </Label>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                        disabled={isDisabled || isLoadingLotOptions}
                      >
                        <SelectTrigger
                          id={fid('lot-id')}
                          className={cn(
                            'h-12 text-base',
                            errors.lotId && 'border-destructive focus:ring-destructive',
                          )}
                          aria-invalid={!!errors.lotId}
                        >
                          <SelectValue
                            placeholder={
                              isLoadingLotOptions ? 'Đang tải danh sách lô…' : 'Chọn lô vật liệu…'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {lotOptions.length === 0 && !isLoadingLotOptions ? (
                            <div className="px-3 py-4 text-center text-base text-muted-foreground">
                              Không có lô vật liệu khả dụng
                            </div>
                          ) : (
                            lotOptions.map((lot) => (
                              <SelectItem key={lot.id} value={lot.id} className="min-h-[48px] text-base">
                                {lot.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {errors.lotId && (
                        <p
                          id={`${fid('lot-id')}-error`}
                          className="text-sm text-destructive"
                          role="alert"
                        >
                          {errors.lotId.message}
                        </p>
                      )}
                    </div>
                  )}
                />

                <Controller
                  name="boardSheetId"
                  control={control}
                  rules={{ required: 'Chọn tấm nguyên trước khi báo cáo' }}
                  render={({ field }) => (
                    <div className="space-y-1">
                      <Label htmlFor={fid('board-sheet-id')} className="text-base">
                        Tấm nguyên trong lô
                      </Label>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                        disabled={isDisabled || isLoadingFilteredSheets || !selectedLotId}
                      >
                        <SelectTrigger
                          id={fid('board-sheet-id')}
                          className={cn(
                            'h-12 text-base',
                            errors.boardSheetId && 'border-destructive focus:ring-destructive',
                          )}
                          aria-invalid={!!errors.boardSheetId}
                        >
                          <SelectValue
                            placeholder={
                              !selectedLotId
                                ? 'Chọn lô trước'
                                : isLoadingFilteredSheets
                                  ? 'Đang tải danh sách tấm nguyên…'
                                  : 'Chọn tấm nguyên…'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredSheets.length === 0 && !isLoadingFilteredSheets ? (
                            <div className="px-3 py-4 text-center text-base text-muted-foreground">
                              Không có tấm nguyên trong lô đã chọn
                            </div>
                          ) : (
                            filteredSheets.map((sheet) => (
                              <SelectItem key={sheet.id} value={sheet.id} className="min-h-[48px] text-base">
                                {sheet.dimensions.length_mm} × {sheet.dimensions.width_mm} mm
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {errors.boardSheetId && (
                        <p
                          id={`${fid('board-sheet-id')}-error`}
                          className="text-sm text-destructive"
                          role="alert"
                        >
                          {errors.boardSheetId.message}
                        </p>
                      )}
                    </div>
                  )}
                />
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Used dimension ── */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-base">Kích thước đã dùng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <Controller
              name="usedLength"
              control={control}
              rules={{
                required: 'Phải lớn hơn 0',
                validate: (v) =>
                  (parseFloat(v) > 0) || 'Phải lớn hơn 0',
              }}
              render={({ field }) => (
                <NumericField
                  id={fid('used-length')}
                  label="Chiều dài (mm)"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.usedLength?.message}
                  placeholder="1200"
                  disabled={isDisabled}
                />
              )}
            />
            <Controller
              name="usedWidth"
              control={control}
              rules={{
                required: 'Phải lớn hơn 0',
                validate: (v) =>
                  (parseFloat(v) > 0) || 'Phải lớn hơn 0',
              }}
              render={({ field }) => (
                <NumericField
                  id={fid('used-width')}
                  label="Chiều rộng (mm)"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.usedWidth?.message}
                  placeholder="600"
                  disabled={isDisabled}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Remnant toggle + fields ── */}
      <Card>
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-base">Tấm lẻ còn lại</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-4">
          {/*
           * WasteToggle is not a text input so it's managed via local state;
           * we use Controller for the remnant dimension fields below.
           */}
          <WasteToggle
            hasRemnant={hasRemnant}
            onChange={setHasRemnant}
            disabled={isDisabled}
          />

          {/* Remnant dimension fields — only shown when "Còn tấm lẻ" */}
          {hasRemnant && (
            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="remnantLength"
                control={control}
                rules={{
                  required: 'Phải lớn hơn 0',
                  validate: (v) =>
                    parseFloat(v ?? '') > 0 || 'Phải lớn hơn 0',
                }}
                render={({ field }) => (
                  <NumericField
                    id={fid('remnant-length')}
                    label="Chiều dài (mm)"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.remnantLength?.message}
                    placeholder="400"
                    disabled={isDisabled}
                  />
                )}
              />
              <Controller
                name="remnantWidth"
                control={control}
                rules={{
                  required: 'Phải lớn hơn 0',
                  validate: (v) =>
                    parseFloat(v ?? '') > 0 || 'Phải lớn hơn 0',
                }}
                render={({ field }) => (
                  <NumericField
                    id={fid('remnant-width')}
                    label="Chiều rộng (mm)"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    error={errors.remnantWidth?.message}
                    placeholder="600"
                    disabled={isDisabled}
                  />
                )}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── API error ── */}
      {apiError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {apiError}
        </div>
      )}

      {/* ── Area-conservation error — blocks submit (BR-K03) ── */}
      {areaConservationError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
          <span className="text-sm text-destructive">{areaConservationError}</span>
        </div>
      )}

      {/* ── Submit ── */}
      <BigButton type="submit" disabled={isDisabled}>
        {isPending ? 'Đang gửi…' : 'Báo cáo kết quả'}
      </BigButton>
    </form>
  )
}
