'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Camera, Keyboard } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface ScannerViewProps {
  onScan: (code: string) => void
  className?: string
}

/**
 * QR / barcode scanner view using html5-qrcode.
 * Falls back to manual text input when the camera is unavailable.
 *
 * Usage:
 *   <ScannerView onScan={(code) => handleCode(code)} />
 */
export function ScannerView({ onScan, className }: ScannerViewProps) {
  const [mode, setMode] = useState<'camera' | 'manual'>('camera')
  const [manualInput, setManualInput] = useState('')
  const [cameraError, setCameraError] = useState(false)
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<InstanceType<
    // Dynamically-typed import to avoid SSR issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any
  > | null>(null)

  useEffect(() => {
    if (mode !== 'camera') return

    let stopped = false

    async function startScanner() {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (stopped || !scannerRef.current) return

        const scanner = new Html5Qrcode('qr-scanner-container')
        html5QrCodeRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            onScan(decodedText)
          },
          undefined,
        )
      } catch {
        setCameraError(true)
        setMode('manual')
      }
    }

    startScanner()

    return () => {
      stopped = true
      html5QrCodeRef.current
        ?.stop()
        .catch(() => {
          // ignore cleanup errors
        })
    }
  }, [mode, onScan])

  if (mode === 'manual' || cameraError) {
    return (
      <div className={cn('space-y-3', className)}>
        <p className="text-sm text-muted-foreground">
          Nhập mã thủ công (camera không khả dụng)
        </p>
        <div className="flex gap-2">
          <Input
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manualInput.trim()) {
                onScan(manualInput.trim())
                setManualInput('')
              }
            }}
            placeholder="Nhập mã rồi nhấn Enter..."
            className="h-12 text-base"
            autoFocus
          />
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setCameraError(false)
            setMode('camera')
          }}
        >
          <Camera className="size-4" />
          Thử lại camera
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div
        id="qr-scanner-container"
        ref={scannerRef}
        className="overflow-hidden rounded-lg bg-black"
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
  )
}
