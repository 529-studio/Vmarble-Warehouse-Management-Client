'use client'

import { useId, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { uploadApi } from '@/lib/api/upload'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface PhotoUploadProps {
  photos: string[]
  onChange: (urls: string[]) => void
  maxPhotos?: number
  maxMb?: number
  disabled?: boolean
  className?: string
}

const ACCEPTED = 'image/jpeg,image/png,image/webp'

/**
 * Self-contained photo upload widget that:
 * 1. Calls POST /uploads/presign to get a signed R2 URL
 * 2. PUTs the raw file bytes directly to that URL (no auth header — external)
 * 3. Appends the returned public_url to the list and calls onChange
 *
 * Does NOT use useMutation — uses plain async + local isUploading state.
 */
export function PhotoUpload({
  photos,
  onChange,
  maxPhotos = 3,
  maxMb = 5,
  disabled = false,
  className,
}: PhotoUploadProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]

    // Validate count
    if (photos.length >= maxPhotos) {
      toast.error(`Tối đa ${maxPhotos} ảnh.`)
      // Reset input so the same file can be re-selected after removal
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    // Validate size
    const maxBytes = maxMb * 1024 * 1024
    if (file.size > maxBytes) {
      toast.error(`Ảnh vượt quá ${maxMb} MB.`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setIsUploading(true)
    try {
      // 1. Get presigned URL from BE
      const { upload_url, public_url } = await uploadApi.presign({
        content_type: file.type,
      })

      // 2. PUT file bytes directly to R2 (external URL — no Authorization header)
      const putRes = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!putRes.ok) {
        throw new Error(`R2 PUT failed: ${putRes.status}`)
      }

      // 3. Append and notify parent
      onChange([...photos, public_url])
    } catch {
      toast.error('Tải ảnh thất bại.')
    } finally {
      setIsUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const removePhoto = (index: number) => {
    const next = photos.filter((_, i) => i !== index)
    onChange(next)
  }

  const canAddMore = photos.length < maxPhotos && !disabled

  return (
    <div className={cn('space-y-2', className)}>
      {/* Thumbnail list */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((url, i) => (
            <div
              key={url}
              className="relative size-20 overflow-hidden rounded-md border bg-muted/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Ảnh ${i + 1}`}
                className="size-full object-cover"
                loading="lazy"
              />
              <button
                type="button"
                aria-label={`Xóa ảnh ${i + 1}`}
                onClick={() => removePhoto(i)}
                disabled={disabled || isUploading}
                className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 disabled:pointer-events-none"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}

          {/* Inline spinner while uploading */}
          {isUploading && (
            <Skeleton className="size-20 rounded-md" aria-busy="true" aria-label="Đang tải ảnh…" />
          )}
        </div>
      )}

      {/* Spinner when no photos yet but uploading */}
      {photos.length === 0 && isUploading && (
        <Skeleton className="size-20 rounded-md" aria-busy="true" aria-label="Đang tải ảnh…" />
      )}

      {/* File picker */}
      {canAddMore && (
        <>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPTED}
            className="sr-only"
            aria-label="Chọn ảnh để tải lên"
            disabled={disabled || isUploading}
            onChange={(e) => handleFiles(e.target.files)}
          />
          <label
            htmlFor={inputId}
            className={cn(
              'inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
              'border-input bg-background hover:bg-accent hover:text-accent-foreground',
              (disabled || isUploading) && 'pointer-events-none opacity-50',
            )}
          >
            {isUploading ? 'Đang tải…' : 'Thêm ảnh'}
          </label>
        </>
      )}
    </div>
  )
}
