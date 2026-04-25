---
name: typescript-patterns
description: Use when writing TypeScript in this project — API DTOs, component prop types, hook generics, strict null handling, and avoiding common TS mistakes with the existing codebase patterns.
---

# TypeScript Patterns

## Golden rule — import types, never re-declare

All API DTOs are in **`src/types/api.ts`**. Import them everywhere:

```typescript
// ✅ Correct
import type { PagedResult, Remnant, WorkOrder } from '@/types/api'

// ❌ Wrong — re-declaring inline creates divergence with the backend
interface Remnant { id: string; ... }
```

If the type doesn't exist yet in `src/types/api.ts`, add it there — not locally.

---

## Component prop types — extend HTML elements

Follow the `ComponentProps<>` pattern used in all shadcn components:

```tsx
import * as React from 'react'

// ✅ Extend native HTML element props — gets all HTML attributes for free
interface ButtonProps extends React.ComponentProps<'button'> {
  variant?: 'primary' | 'danger'
  isLoading?: boolean
}

// ✅ For custom wrapper components, extend the base component's props
import type { buttonVariants } from '@/components/ui/button'
import type { VariantProps } from 'class-variance-authority'

interface MyButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

// ❌ Avoid manual prop declarations that duplicate HTML attrs
interface BadButtonProps {
  onClick: () => void    // too narrow — blocks onMouseDown, etc.
  disabled: boolean
  className: string
}
```

---

## TanStack Query generics

Always specify the generic types for full type inference and better error handling:

```typescript
import { useQuery, useMutation } from '@tanstack/react-query'
import type { ApiClientError } from '@/lib/api/client'
import { remnantsApi } from '@/lib/api/remnants'
import type { PagedResult, Remnant } from '@/types/api'

// useQuery<TData, TError>
const { data } = useQuery<PagedResult<Remnant>, ApiClientError>({
  queryKey: ['remnants'],
  queryFn: () => remnantsApi.list(),
})
// data is typed as PagedResult<Remnant> | undefined

// useMutation<TData, TError, TVariables>
const mutation = useMutation<Remnant, ApiClientError, { id: string; locationId: string }>({
  mutationFn: ({ id, locationId }) => remnantsApi.assignLocation(id, locationId),
})
```

---

## Strict null / undefined handling

The project uses `"strict": true`. Always handle nullable values:

```typescript
// useQuery returns data as T | undefined until it resolves
const { data } = useRemnants()

// ✅ Optional chaining
const count = data?.total_items ?? 0
const items = data?.items ?? []

// ✅ Early return in JSX
if (!data) return <Skeleton />

// ✅ Non-null assertion only when you KNOW a value is defined
// (after a guard check above)
const id = remnant!.id   // only after if (!remnant) return ...

// ❌ Unsafe assertion without guard
const id = data!.total   // will crash if data is undefined
```

---

## `ApiClientError` — typed error handling

```typescript
import { ApiClientError } from '@/lib/api/client'

// Pattern 1 — in mutation callbacks
useMutation({
  mutationFn: myApi.create,
  onError: (err: ApiClientError) => {
    if (err.status === 422) {
      // err.details is Record<string, string> — field-level validation errors
      const fieldErrors = err.details ?? {}
      setErrors(fieldErrors)
    } else {
      toast.error(err.message)
    }
  },
})

// Pattern 2 — in try/catch
try {
  await myApi.create(input)
} catch (err) {
  if (err instanceof ApiClientError) {
    // typed — err.status, err.code, err.message, err.details
    if (err.status === 404) return toast.error('Không tìm thấy')
    if (err.status === 409) return toast.error('Đã tồn tại')
  }
  // unknown errors — rethrow or show generic message
  toast.error('Lỗi không xác định')
}
```

---

## Avoiding `any`

```typescript
// ❌ Never use any
const data: any = await fetch(...)

// ✅ Use unknown + type narrowing
const raw: unknown = JSON.parse(qrCode)
if (raw && typeof raw === 'object' && 'id' in raw) {
  const id = (raw as { id: string }).id
}

// ✅ Or use a type assertion with a guard function
function isQrPayload(v: unknown): v is QrPayload {
  return typeof v === 'object' && v !== null && 'type' in v && 'id' in v
}

const parsed: unknown = JSON.parse(code)
if (isQrPayload(parsed)) {
  handleScan(parsed) // typed as QrPayload
}
```

---

## Zustand store typing

Follow the pattern in `src/lib/hooks/use-scan.ts`:

```typescript
import { create } from 'zustand'

interface MyStore {
  // state
  count: number
  items: string[]
  // actions
  increment: () => void
  addItem: (item: string) => void
  reset: () => void
}

export const useMyStore = create<MyStore>((set) => ({
  count: 0,
  items: [],
  increment: () => set((s) => ({ count: s.count + 1 })),
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  reset: () => set({ count: 0, items: [] }),
}))
```

---

## `cn()` utility for conditional classes

```typescript
import { cn } from '@/lib/utils'   // combines clsx + tailwind-merge

// Basic usage
className={cn('base-class', conditionalClass && 'applied-if-truthy')}

// With variants
className={cn(
  'flex items-center',
  isActive && 'bg-primary text-primary-foreground',
  isDisabled && 'opacity-50 pointer-events-none',
  className,   // always allow override via props
)}

// tailwind-merge resolves conflicts automatically:
cn('px-4 px-6')  // → 'px-6' (last wins)
cn('text-sm', 'text-lg')  // → 'text-lg'
```

---

## Common import paths

```typescript
// Types
import type { Remnant, WorkOrder, BarcodeRecord } from '@/types/api'

// API client
import { apiClient, ApiClientError } from '@/lib/api/client'

// Domain API functions
import { remnantsApi } from '@/lib/api/remnants'
import { cuttingOrdersApi } from '@/lib/api/cutting-orders'

// Hooks
import { useRemnants, useAllocateRemnant } from '@/lib/hooks/use-remnants'
import { useRecordCut } from '@/lib/hooks/use-cutting-orders'

// UI components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Kiosk components
import { BigButton } from '@/components/kiosk/big-button'
import { ScannerView } from '@/components/kiosk/scanner-view'
import { LabelPreview } from '@/components/kiosk/label-preview'

// Dashboard components
import { StatCard } from '@/components/dashboard/stat-card'
import { AlertBanner } from '@/components/dashboard/alert-banner'

// Utilities
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
```
