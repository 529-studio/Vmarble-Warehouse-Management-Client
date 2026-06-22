'use client'

import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCreateContainer } from '@/lib/hooks/use-containers'
import type { CreateContainerInput } from '@/types/api'

const CONTAINER_TYPES = [
  { value: '20GP', label: '20GP (20ft)', defaultCbm: 33, defaultKg: 21_770 },
  { value: '40GP', label: '40GP (40ft)', defaultCbm: 67.5, defaultKg: 26_480 },
  { value: '40HC', label: '40HC (40ft High Cube)', defaultCbm: 76, defaultKg: 26_230 },
] as const

interface CreateContainerDialogProps {
  open: boolean
  onClose: () => void
}

export function CreateContainerDialog({ open, onClose }: CreateContainerDialogProps) {
  const [containerType, setContainerType] = useState('')
  const [maxCbm, setMaxCbm] = useState('')
  const [maxPayloadKg, setMaxPayloadKg] = useState('')
  const [note, setNote] = useState('')

  const createContainer = useCreateContainer()
  const isPending = createContainer.isPending

  const typeId = useId()
  const cbmId = useId()
  const kgId = useId()
  const noteId = useId()

  const selectedType = CONTAINER_TYPES.find((t) => t.value === containerType)

  const isValid = containerType.trim().length > 0

  function handleTypeChange(value: string) {
    setContainerType(value)
    // Auto-fill defaults when user picks a type
    const t = CONTAINER_TYPES.find((ct) => ct.value === value)
    if (t) {
      setMaxCbm(String(t.defaultCbm))
      setMaxPayloadKg(String(t.defaultKg))
    }
  }

  function handleSubmit() {
    if (!isValid || isPending) return
    const body: CreateContainerInput = {
      container_type: containerType,
      max_cbm: maxCbm ? Number(maxCbm) : undefined,
      max_payload_kg: maxPayloadKg ? Number(maxPayloadKg) : undefined,
      note: note.trim() || undefined,
    }
    createContainer.mutate(body, {
      onSuccess: () => {
        resetForm()
        onClose()
      },
    })
  }

  function resetForm() {
    setContainerType('')
    setMaxCbm('')
    setMaxPayloadKg('')
    setNote('')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !isPending) {
          resetForm()
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo container mới</DialogTitle>
          <DialogDescription>
            Container mới sẽ ở trạng thái MỞ. Mã container được tạo tự động.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor={typeId}>
              Loại container <span className="text-destructive">*</span>
            </Label>
            <Select value={containerType} onValueChange={handleTypeChange} disabled={isPending}>
              <SelectTrigger id={typeId}>
                <SelectValue placeholder="Chọn loại container" />
              </SelectTrigger>
              <SelectContent>
                {CONTAINER_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={cbmId}>Sức chứa (CBM)</Label>
              <Input
                id={cbmId}
                type="number"
                step="0.1"
                min="0"
                value={maxCbm}
                onChange={(e) => setMaxCbm(e.target.value)}
                placeholder={selectedType ? String(selectedType.defaultCbm) : '—'}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={kgId}>Tải trọng (kg)</Label>
              <Input
                id={kgId}
                type="number"
                step="1"
                min="0"
                value={maxPayloadKg}
                onChange={(e) => setMaxPayloadKg(e.target.value)}
                placeholder={selectedType ? String(selectedType.defaultKg) : '—'}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor={noteId}>Ghi chú</Label>
            <Textarea
              id={noteId}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Thông tin thêm về container…"
              rows={2}
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Huỷ
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={!isValid || isPending}>
            {isPending ? 'Đang tạo…' : 'Tạo container'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
