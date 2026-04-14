'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Camera, Keyboard, ShieldAlert, CameraOff, Lock } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface ScannerViewProps {
  onScan: (code: string) => void
  className?: string
  /** When true, input is disabled and camera scans are ignored (e.g. while API call is in-flight) */
  disabled?: boolean
}

type CameraErrorKind = 'not-allowed' | 'not-found' | 'insecure-context' | 'unknown'

interface CameraErrorInfo {
  kind: CameraErrorKind
  title: string
  description: string
}

function classifyCameraError(err: unknown): CameraErrorInfo {
  // Insecure context check (highest priority — happens before getUserMedia is called)
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

/**
 * QR / barcode scanner view using html5-qrcode.
 * Falls back to manual text input when the camera is unavailable, and
 * shows a specific error message (NotAllowedError, NotFoundError, insecure
 * context) so workers know exactly how to resolve the issue.
 *
 * Usage:
 *   <ScannerView onScan={(code) => handleCode(code)} />
 */
export function ScannerView({ onScan, className, disabled = false }: ScannerViewProps) {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera')
  const [manualInput, setManualInput] = useState('')
  const [cameraErrorInfo, setCameraErrorInfo] = useState<CameraErrorInfo | null>(null)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<InstanceType<
    // Dynamically-typed import to avoid SSR issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  > | null>(null)
  // Tracks whether scanner.start() has resolved so cleanup knows it's safe to stop
  const isRunningRef = useRef(false)
  // Stable refs — prevent effect re-runs when parent re-renders
  const onScanRef = useRef(onScan)
  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])
  const disabledRef = useRef(disabled)
  useEffect(() => {
    disabledRef.current = disabled
  }, [disabled])
  // Cooldown: ignore duplicate scans of the same code within 2 seconds
  const lastScanRef = useRef<{ code: string; time: number } | null>(null)

  useEffect(() => {
    if (mode !== 'camera') return

    let cancelled = false

    async function startScanner() {
      // Check secure context before attempting getUserMedia.
      // Return the info object directly — classifyCameraError re-checks
      // isSecureContext internally but we skip it here to avoid ambiguity.
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
        // If the effect was cleaned up while we were awaiting the import, bail out
        if (cancelled || !scannerRef.current) return

        const scanner = new Html5Qrcode('qr-scanner-container')
        html5QrCodeRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            // Adaptive qrbox — sized relative to the actual rendered viewfinder so
            // the scan region is always fully visible on any screen width, including
            // narrow mobile viewports where a fixed 250px box would overflow.
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
              // Clamp to 50px minimum — html5-qrcode throws if qrbox < 50px.
              // This guards against reading a hidden container (display:none →
              // clientWidth=0) when two ScannerView instances share the page.
              const side = Math.max(50, Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.7))
              return { width: side, height: side }
            },
            // Request 4:3 aspect ratio — stable on most phone cameras and prevents
            // portrait-orientation stream issues on iOS rear cameras.
            aspectRatio: 4 / 3,
          },
          (decodedText: string) => {
            if (disabledRef.current) return
            const now = Date.now()
            const last = lastScanRef.current
            if (last && last.code === decodedText && now - last.time < 2000) return
            lastScanRef.current = { code: decodedText, time: now }
            onScanRef.current(decodedText)
          },
          undefined,
        )

        // scanner.start() resolved — it is now safe to call stop() in cleanup
        if (cancelled) {
          // Effect was cleaned up while start() was in flight; stop immediately
          scanner.stop().catch(() => {})
          isRunningRef.current = false
        } else {
          isRunningRef.current = true
        }
      } catch (err) {
        if (!cancelled) {
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
        html5QrCodeRef.current.stop().catch(() => {
          // ignore cleanup errors
        })
      }
    }
  }, [mode])

  const showManual = mode === 'manual' || cameraErrorInfo !== null

  return (
    <div className={cn('space-y-3', className)}>
      {/* Camera container — always mounted so the scanner can stop cleanly before
          the video element is removed from the DOM. Hiding via CSS avoids the
          AbortError that fires when play() is interrupted by a DOM removal. */}
      <div className={showManual ? 'hidden' : undefined}>
        <div
          id="qr-scanner-container"
          ref={scannerRef}
          className="w-full overflow-hidden rounded-lg bg-black"
          style={{ minHeight: 260 }}
        />
        <Button
          size="sm"
          variant="ghost"
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
                <p className="text-sm font-medium leading-none">{cameraErrorInfo.title}</p>
                <p className="text-xs text-muted-foreground">{cameraErrorInfo.description}</p>
              </div>
            </div>
          )}
          {!cameraErrorInfo && (
            <p className="text-sm text-muted-foreground">
              Nhập mã thủ công (camera không khả dụng)
            </p>
          )}
          <div className="flex gap-2">
            <Input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && manualInput.trim() && !disabled) {
                  onScan(manualInput.trim())
                  setManualInput('')
                }
              }}
              placeholder="Nhập mã rồi nhấn Enter..."
              className="h-12 text-base"
              disabled={disabled}
              autoFocus
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setCameraErrorInfo(null)
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
