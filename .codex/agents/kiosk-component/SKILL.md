---
name: kiosk-component
description: Use when building any component for the (kiosk) route group — shop-floor mobile UI for workers. Covers touch targets, BigButton, ScannerView, QR print, Vietnamese labels, and sonner toasts.
---

# Kiosk Component Guidelines

The kiosk is a mobile-first PWA used by factory workers (Vietnamese speakers) on Android phones and tablets at the shop floor. Every component must be operable with one hand, gloves on, in a dusty/noisy environment.

## Non-negotiable rules

| Rule | Value |
|------|-------|
| Min touch target height | **48 px** (`min-h-[48px]`) |
| Min touch target width | **48 px** |
| Primary action button height | **56 px** (`BigButton` — `min-h-[56px]`) |
| Base font size | **≥ 16 px** (avoids iOS auto-zoom on focus) |
| Max steps to complete a task | **3 taps** |
| UI language | **Vietnamese** |
| Loading feedback | **Instant skeleton** (`loading.tsx`) |
| Action feedback | **sonner toast** within 300 ms |

---

## `BigButton` — primary actions

Import from `@/components/kiosk/big-button`. Use for every primary action (submit, confirm, scan, print).

```tsx
import { BigButton } from '@/components/kiosk/big-button'

// Primary action
<BigButton onClick={handleSubmit} disabled={isPending}>
  {isPending ? 'Đang xử lý...' : 'Báo cáo kết quả'}
</BigButton>

// Danger action (e.g. discard)
<BigButton variant="danger" onClick={handleCancel}>
  Huỷ lệnh
</BigButton>

// Secondary action
<BigButton variant="secondary">Bỏ qua</BigButton>
```

**Props**: `variant: 'primary' | 'secondary' | 'danger'` + all standard `<button>` props.

Do **not** use `Button` from `@/components/ui/button` for primary kiosk actions — it's too small.

---

## `ScannerView` — QR / barcode scanning

Import from `@/components/kiosk/scanner-view`. Always wrap in a `Card`.

```tsx
import { ScannerView } from '@/components/kiosk/scanner-view'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle className="text-base">Quét mã QR tấm lẻ</CardTitle>
  </CardHeader>
  <CardContent>
    <ScannerView
      onScan={(code) => {
        // code is the decoded QR string — parse JSON or use as ID
        try {
          const data = JSON.parse(code)
          // e.g. { type: 'REMNANT', id: 'R-001', ... }
          handleScan(data)
        } catch {
          // plain barcode string
          handleScan({ id: code })
        }
      }}
    />
  </CardContent>
</Card>
```

**Behaviour:**
- Uses `html5-qrcode` (dynamically imported, no SSR issues)
- Camera facing: `environment` (back camera)
- Falls back to manual text input automatically if camera permission denied
- `onScan` fires once per detected code

**QR content format** (from Go backend):
```json
{ "type": "REMNANT" | "WIP", "id": "...", "sku": "...", "dimensions": {...}, "lot": "...", "location": "..." }
```

---

## `LabelPreview` — print label preview

Import from `@/components/kiosk/label-preview`.

```tsx
import { LabelPreview } from '@/components/kiosk/label-preview'
import type { BarcodeRecord } from '@/types/api'

// After RecordCut succeeds and returns barcodeIds, fetch the record:
<LabelPreview barcode={barcodeRecord} size="small" />   // 50×30mm remnant label
<LabelPreview barcode={barcodeRecord} size="large" />   // 100×70mm WIP label
```

Clicking the preview opens `window.print()` — browser print dialog.

---

## `BottomNav` — navigation (already in layout)

The kiosk layout (`src/app/(kiosk)/layout.tsx`) already renders `BottomNav`. **Do not add another nav** inside page components.

The bottom nav has 4 tabs:
- `/cutting-orders` — Lệnh cắt
- `/report-cut` — Báo cáo
- `/remnant-list` — Kho tấm lẻ
- `/scan` — Quét mã

---

## Toast notifications (sonner)

Always give feedback immediately after user action:

```tsx
import { toast } from 'sonner'

// After successful API call
toast.success('Đã nhập kho tấm lẻ thành công')

// After API error
toast.error('Lỗi kết nối — vui lòng thử lại')

// Loading state during mutation
const toastId = toast.loading('Đang xử lý...')
// then:
toast.dismiss(toastId)
toast.success('Hoàn thành')
```

---

## Standard kiosk page structure

```tsx
import type { Metadata } from 'next'
import { BigButton } from '@/components/kiosk/big-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Tên màn hình' }

export default function KioskPage() {
  return (
    <div className="space-y-4 p-4">
      {/* Page title */}
      <h1 className="text-xl font-bold">Tên màn hình</h1>

      {/* Content cards — each step in a separate card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bước 1 — ...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* step content */}
        </CardContent>
      </Card>

      {/* Optional: remnant suggestion list */}
      {/* <RemnantSuggestionList /> */}

      {/* Primary action — always at the bottom */}
      <BigButton disabled={!isReady}>
        Xác nhận
      </BigButton>
    </div>
  )
}
```

---

## Form inputs on mobile

Use `inputMode` to trigger the right mobile keyboard:

```tsx
<Input
  type="number"
  inputMode="numeric"    // numeric keypad (no minus sign)
  placeholder="1200"
  className="h-12 text-base"   // larger height + font for kiosk
/>

<Input
  inputMode="decimal"    // numeric with decimal point
  className="h-12 text-base"
/>
```

---

## Workflow patterns

### Two-scan flow (scan remnant → scan location)

```tsx
const [remnantId, setRemnantId] = useState<string | null>(null)
const [locationId, setLocationId] = useState<string | null>(null)
const assignMutation = useAssignLocation()

// Step 1: scan remnant
<ScannerView onScan={(code) => setRemnantId(JSON.parse(code).id)} />

// Step 2: scan location (visible only after step 1)
{remnantId && (
  <ScannerView onScan={(code) => setLocationId(JSON.parse(code).id)} />
)}

// Confirm button (enabled only when both scanned)
<BigButton
  disabled={!remnantId || !locationId || assignMutation.isPending}
  onClick={() => assignMutation.mutate({ id: remnantId!, locationId: locationId! })}
>
  Xác nhận nhập kho
</BigButton>
```
