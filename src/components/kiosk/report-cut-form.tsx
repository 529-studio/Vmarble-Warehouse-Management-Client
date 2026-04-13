'use client'

import { useState, useId } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { AlertTriangle, CheckCircle2, ChevronLeft, Printer } from 'lucide-react'
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
import { useAvailableSheets } from '@/lib/hooks/use-remnants'
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
    'Không tìm thấy lệnh cắt hoặc tấm nguyên liệu.',
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
      <Label htmlFor={id}>{label}</Label>
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
        className={cn(error && 'border-destructive focus-visible:ring-destructive')}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
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
          'flex min-h-[48px] items-center justify-center rounded-xl border-2 px-3 text-sm font-semibold transition-all',
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
          'flex min-h-[48px] items-center justify-center rounded-xl border-2 px-3 text-sm font-semibold transition-all',
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

function SuccessModal({ remnantId, onGoHome }: SuccessModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ghi nhận thành công"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-white p-8"
    >
      {/* Icon */}
      <CheckCircle2 className="size-20 text-green-500" aria-hidden="true" />

      {/* Heading */}
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-bold text-foreground">Ghi nhận thành công</h2>
        <p className="text-muted-foreground">Kết quả cắt đã được lưu vào hệ thống.</p>
      </div>

      {/* Remnant info block */}
      {remnantId ? (
        <div className="w-full max-w-xs space-y-3">
          <div className="rounded-xl border bg-muted/40 p-4 text-center">
            {/* QR placeholder — Sprint 4 will replace with actual QR image */}
            <div
              className="mx-auto mb-3 flex size-36 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-white"
              aria-label="Chỗ để QR code (Sprint 4)"
            >
              <span className="text-xs text-muted-foreground">QR · Sprint 4</span>
            </div>
            <p className="text-xs text-muted-foreground">Mã tấm lẻ</p>
            <p className="mt-0.5 break-all font-mono text-sm font-medium">
              {remnantId}
            </p>
          </div>

          {/* Print label — disabled until Sprint 4 */}
          <button
            type="button"
            disabled
            title="Tính năng in tem sẽ có trong Sprint 4"
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/30 text-sm font-semibold text-muted-foreground opacity-60"
          >
            <Printer className="size-4" aria-hidden="true" />
            In tem (Sprint 4)
          </button>
        </div>
      ) : (
        <div className="rounded-xl border bg-muted/40 px-6 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            Không có tấm lẻ (hao hụt toàn bộ)
          </p>
        </div>
      )}

      {/* Go home */}
      <div className="w-full max-w-xs">
        <BigButton onClick={onGoHome}>Về trang chính</BigButton>
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
  // (e.g. ?sheet_id=) is treated as absent rather than forwarded as '' to the API.
  const sheetId = searchParams.get('sheet_id') || undefined
  const remnantSourceId = searchParams.get('remnant_id') || undefined

  // ── Work order context (for display + area-conservation hint) ────────────
  const { data: workOrder, isLoading: isLoadingWO } = useCuttingOrder(woId)

  // True when the worker came from "Dùng tấm nguyên" (skip remnant modal)
  // and hasn't pre-selected any source material.
  const needsBoardSheetInput = !sheetId && !remnantSourceId

  // Fetch available sheets only when the worker needs to select one.
  // Enabled flag prevents an unnecessary request when remnant_id is already set.
  const {
    data: sheetsData,
    isLoading: isLoadingSheets,
  } = useAvailableSheets({}, needsBoardSheetInput)

  // ── react-hook-form ───────────────────────────────────────────────────────
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CutFormValues>({
    defaultValues: {
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

  // ── Client-side area-conservation warning (non-blocking) ────────────────
  // watch() re-runs on every keystroke; we derive the warning from live values.
  const watchedUsedLength = watch('usedLength')
  const watchedUsedWidth = watch('usedWidth')
  const sourceL = workOrder?.dimensions?.length_mm
  const sourceW = workOrder?.dimensions?.width_mm
  const uLNum = parseFloat(watchedUsedLength)
  const uWNum = parseFloat(watchedUsedWidth)
  const areaWarning =
    !!sourceL &&
    !!sourceW &&
    !isNaN(uLNum) &&
    !isNaN(uWNum) &&
    uLNum * uWNum > sourceL * sourceW

  // ── Submit handler ───────────────────────────────────────────────────────
  function onValidSubmit(data: CutFormValues) {
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

  // Block submission while loading WO (prevents sending sku_id as empty string)
  // or while a mutation is in flight.
  const isDisabled = isPending || isLoadingWO
  const sourceDim = workOrder?.dimensions

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
          className="flex size-10 items-center justify-center rounded-xl border bg-white text-muted-foreground shadow-sm active:bg-muted"
          aria-label="Quay lại"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight">Báo cáo kết quả cắt</h1>
          {workOrder && (
            <p className="truncate text-sm text-muted-foreground">
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
            <CardTitle className="text-base">Chọn tấm ván</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <Controller
              name="boardSheetId"
              control={control}
              rules={{ required: 'Chọn tấm ván trước khi báo cáo' }}
              render={({ field }) => (
                <div className="space-y-1">
                  <Label htmlFor={fid('board-sheet-id')}>
                    Tấm ván nguyên liệu
                  </Label>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={field.onChange}
                    disabled={isDisabled || isLoadingSheets}
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
                          isLoadingSheets ? 'Đang tải danh sách tấm ván…' : 'Chọn tấm ván…'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {(sheetsData?.items ?? []).length === 0 && !isLoadingSheets ? (
                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                          Không có tấm ván khả dụng
                        </div>
                      ) : (
                        (sheetsData?.items ?? []).map((sheet) => (
                          <SelectItem key={sheet.id} value={sheet.id}>
                            {sheet.dimensions.length_mm} × {sheet.dimensions.width_mm} mm
                            {' — Lô '}
                            {sheet.lot_batch ?? sheet.supplier_code ?? sheet.lot_id.slice(0, 8).toUpperCase()}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.boardSheetId && (
                    <p
                      id={`${fid('board-sheet-id')}-error`}
                      className="text-xs text-destructive"
                      role="alert"
                    >
                      {errors.boardSheetId.message}
                    </p>
                  )}
                </div>
              )}
            />
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

          {/* Area-conservation warning — inline, non-blocking */}
          {areaWarning && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"
            >
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-amber-500"
                aria-hidden="true"
              />
              <span>
                Diện tích vượt quá tấm nguồn. Server sẽ kiểm tra lại — bạn vẫn
                có thể tiếp tục gửi.
              </span>
            </div>
          )}
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

      {/* ── Submit ── */}
      <BigButton type="submit" disabled={isDisabled}>
        {isPending ? 'Đang gửi…' : 'Báo cáo kết quả'}
      </BigButton>
    </form>
  )
}
