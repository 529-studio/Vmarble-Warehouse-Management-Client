'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { Html5Qrcode } from 'html5-qrcode'
import { ArrowRight, Camera, CameraOff, Keyboard, Lock, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ScannerViewProps {
  onScan: (code: string) => void
  className?: string
  disabled?: boolean
  showControls?: boolean
}

type CameraErrorKind = 'not-allowed' | 'not-found' | 'insecure-context' | 'unknown'

interface CameraErrorInfo {
  kind: CameraErrorKind
  title: string
  description: string
}

interface CameraControlState {
  torchSupported: boolean
  focusSupported: boolean
  torchOn: boolean
}

interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  torch?: boolean
  focusMode?: string[]
}

interface ExtendedMediaTrackSettings extends MediaTrackSettings {
  torch?: boolean
}

interface ExtendedMediaTrackConstraintSet extends MediaTrackConstraintSet {
  torch?: boolean
  focusMode?: string
}

function normalizeDecodedText(decodedText: string): string {
  const trimmed = decodedText.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>
      const candidate = parsed.id ?? parsed.barcode_id ?? parsed.barcodeId
      return typeof candidate === 'string' ? candidate.trim() : trimmed
    } catch {
      return trimmed
    }
  }
  return trimmed
}

function detectCameraControls(scanner: Html5Qrcode): CameraControlState {
  try {
    const capabilities = scanner.getRunningTrackCapabilities() as ExtendedMediaTrackCapabilities
    const settings = scanner.getRunningTrackSettings() as ExtendedMediaTrackSettings
    const torchSupported = typeof capabilities.torch === 'boolean' ? capabilities.torch : false
    const focusSupported = Array.isArray(capabilities.focusMode) && capabilities.focusMode.length > 0
    const torchOn = typeof settings.torch === 'boolean' ? settings.torch : false
    return { torchSupported, focusSupported, torchOn }
  } catch {
    return { torchSupported: false, focusSupported: false, torchOn: false }
  }
}

function classifyCameraError(err: unknown): CameraErrorInfo {
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return {
      kind: 'insecure-context',
      title: 'Yêu cầu kết nối HTTPS',
      description:
        'Camera chỉ hoạt động trên kết nối bảo mật (HTTPS). Liên hệ quản trị viên để bật HTTPS cho staging.',
    }
  }

  const name = err instanceof Error ? err.name : String(err)
  const message = err instanceof Error ? err.message.toLowerCase() : ''

  if (
    name === 'NotAllowedError' ||
    name === 'PermissionDeniedError' ||
    message.includes('permission denied') ||
    message.includes('not allowed')
  ) {
    return {
      kind: 'not-allowed',
      title: 'Chưa cấp quyền camera',
      description:
        'Trình duyệt đã từ chối quyền truy cập camera. Nhấn vào biểu tượng khóa trên thanh địa chỉ và chọn "Cho phép" rồi tải lại trang.',
    }
  }

  if (
    name === 'NotFoundError' ||
    name === 'DevicesNotFoundError' ||
    message.includes('not found') ||
    message.includes('no camera')
  ) {
    return {
      kind: 'not-found',
      title: 'Không tìm thấy camera',
      description:
        'Thiết bị không có camera hoặc camera đang được sử dụng bởi ứng dụng khác. Kiểm tra lại phần cứng.',
    }
  }

  return {
    kind: 'unknown',
    title: 'Camera không khả dụng',
    description: `Lỗi không xác định: ${err instanceof Error ? err.name : String(err)}`,
  }
}

const errorIcon: Record<CameraErrorKind, React.ReactNode> = {
  'not-allowed': <ShieldAlert className="size-5 text-destructive" />,
  'not-found': <CameraOff className="size-5 text-destructive" />,
  'insecure-context': <Lock className="size-5 text-destructive" />,
  unknown: <CameraOff className="size-5 text-destructive" />,
}

async function setTorchState(scanner: Html5Qrcode, enabled: boolean): Promise<void> {
  const torchConstraint: ExtendedMediaTrackConstraintSet = { torch: enabled }
  await scanner.applyVideoConstraints({
    advanced: [torchConstraint as MediaTrackConstraintSet],
  })
}

async function applyAutofocus(scanner: Html5Qrcode): Promise<void> {
  const focusConstraint: ExtendedMediaTrackConstraintSet = { focusMode: 'continuous' }
  await scanner.applyVideoConstraints({
    advanced: [focusConstraint as MediaTrackConstraintSet],
  })
}

export function ScannerView({ onScan, className, disabled = false, showControls = true }: ScannerViewProps) {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera')
  const [manualInput, setManualInput] = useState('')
  const [cameraErrorInfo, setCameraErrorInfo] = useState<CameraErrorInfo | null>(null)
  const [cameraControlState, setCameraControlState] = useState<CameraControlState>({
    torchSupported: false,
    focusSupported: false,
    torchOn: false,
  })
  const scannerContainerId = useId().replace(/:/g, '-')
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null)
  const isRunningRef = useRef(false)
  const onScanRef = useRef(onScan)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  const disabledRef = useRef(disabled)
  useEffect(() => {
    disabledRef.current = disabled
  }, [disabled])

  const lastScanRef = useRef<{ code: string; time: number } | null>(null)

  async function handleToggleTorch() {
    const scanner = html5QrCodeRef.current
    if (!scanner || !cameraControlState.torchSupported) return
    const nextTorch = !cameraControlState.torchOn
    try {
      await setTorchState(scanner, nextTorch)
      setCameraControlState((prev) => ({ ...prev, torchOn: nextTorch }))
      toast.success(nextTorch ? 'Đã bật đèn flash camera' : 'Đã tắt đèn flash camera')
    } catch {
      toast.error('Thiết bị không hỗ trợ bật đèn flash')
    }
  }

  async function handleAutofocus() {
    const scanner = html5QrCodeRef.current
    if (!scanner || !cameraControlState.focusSupported) return
    try {
      await applyAutofocus(scanner)
      toast.success('Đã kích hoạt lấy nét tự động')
    } catch {
      toast.error('Không thể kích hoạt lấy nét tự động')
    }
  }

  useEffect(() => {
    if (mode !== 'camera') return

    let cancelled = false

    async function startScanner() {
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        if (!cancelled) {
          setCameraErrorInfo({
            kind: 'insecure-context',
            title: 'Yêu cầu kết nối HTTPS',
            description:
              'Camera chỉ hoạt động trên kết nối bảo mật (HTTPS). Liên hệ quản trị viên để bật HTTPS cho staging.',
          })
          setMode('manual')
        }
        return
      }

      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (cancelled || !scannerRef.current) return

        const scanner = new Html5Qrcode(scannerContainerId)
        html5QrCodeRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              const side = Math.max(50, Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7))
              return { width: side, height: side }
            },
            aspectRatio: 4 / 3,
          },
          (decodedText: string) => {
            if (disabledRef.current) return
            const normalized = normalizeDecodedText(decodedText)
            if (!normalized) return
            const now = Date.now()
            const last = lastScanRef.current
            if (last && last.code === normalized && now - last.time < 1200) return
            lastScanRef.current = { code: normalized, time: now }
            onScanRef.current(normalized)
          },
          undefined,
        )

        if (cancelled) {
          scanner.stop().catch(() => {})
          isRunningRef.current = false
        } else {
          isRunningRef.current = true
          setCameraControlState(detectCameraControls(scanner))
        }
      } catch (err) {
        if (!cancelled) {
          setCameraControlState({ torchSupported: false, focusSupported: false, torchOn: false })
          setCameraErrorInfo(classifyCameraError(err))
          setMode('manual')
        }
      }
    }

    startScanner()

    return () => {
      cancelled = true
      if (isRunningRef.current && html5QrCodeRef.current) {
        isRunningRef.current = false
        html5QrCodeRef.current.stop().catch(() => {})
      }
    }
  }, [mode, scannerContainerId])

  const showManual = mode === 'manual' || cameraErrorInfo !== null

  return (
    <div className={cn('space-y-3', className)}>
      <div className={showManual ? 'hidden' : undefined}>
        <div
          id={scannerContainerId}
          ref={scannerRef}
          className="min-h-65 w-full overflow-hidden rounded-lg bg-black"
        />
        {showControls && (cameraControlState.torchSupported || cameraControlState.focusSupported) && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              size="default"
              variant="secondary"
              className="min-h-[48px] text-base"
              onClick={handleToggleTorch}
              disabled={!cameraControlState.torchSupported || disabled}
            >
              {cameraControlState.torchOn ? 'Tắt đèn flash' : 'Bật đèn flash'}
            </Button>
            <Button
              size="default"
              variant="secondary"
              className="min-h-[48px] text-base"
              onClick={handleAutofocus}
              disabled={!cameraControlState.focusSupported || disabled}
            >
              Lấy nét tự động
            </Button>
          </div>
        )}

        <Button
          size="default"
          variant="ghost"
          className="min-h-[48px] text-base"
          onClick={() => setMode('manual')}
        >
          <Keyboard className="size-4" />
          Nhập thủ công
        </Button>
      </div>

      {showManual && (
        <>
          {cameraErrorInfo && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              {errorIcon[cameraErrorInfo.kind]}
              <div className="space-y-1">
                <p className="text-base font-medium leading-none">{cameraErrorInfo.title}</p>
                <p className="text-sm text-muted-foreground">{cameraErrorInfo.description}</p>
              </div>
            </div>
          )}
          {!cameraErrorInfo && (
            <p className="text-base text-muted-foreground">
              Nhập mã thủ công (camera không khả dụng)
            </p>
          )}
          <div className="flex gap-2">
            <Input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualInput.trim() && !disabled) {
                  const normalized = normalizeDecodedText(manualInput)
                  if (!normalized) return
                  onScan(normalized)
                  setManualInput('')
                }
              }}
              placeholder="Nhập mã..."
              className="h-12 text-base"
              disabled={disabled}
              autoFocus
            />
            <Button
              type="button"
              size="default"
              className="h-12 shrink-0 px-4"
              disabled={disabled || !manualInput.trim()}
              onClick={() => {
                const normalized = normalizeDecodedText(manualInput)
                if (!normalized) return
                onScan(normalized)
                setManualInput('')
              }}
              aria-label="Xác nhận mã"
            >
              <ArrowRight className="size-5" />
            </Button>
          </div>
          <Button
            size="default"
            variant="ghost"
            className="min-h-[48px] text-base"
            onClick={() => {
              setCameraErrorInfo(null)
              setCameraControlState({ torchSupported: false, focusSupported: false, torchOn: false })
              setMode('camera')
            }}
          >
            <Camera className="size-4" />
            Thử lại camera
          </Button>
        </>
      )}
    </div>
  )
}
