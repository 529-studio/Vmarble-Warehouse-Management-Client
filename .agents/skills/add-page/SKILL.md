---
name: add-page
description: Use when adding a new page or route — choosing the correct route group (kiosk/dashboard/auth), structuring the page file, adding loading.tsx and error.tsx siblings, and following responsive layout rules.
---

# Add a New Page

## Route group decision tree

```
Is this for shop-floor workers on mobile?  →  (kiosk)
Is this for managers on desktop/tablet?    →  (dashboard)
Is this an auth screen (login/PIN)?        →  (auth)
```

Route groups don't appear in the URL:
- `src/app/(kiosk)/my-page/page.tsx` → URL: `/my-page`
- `src/app/(dashboard)/my-page/page.tsx` → URL: `/my-page`
- `src/app/(auth)/my-page/page.tsx` → URL: `/my-page`

---

## Minimum file set for every new page

```
src/app/(group)/my-page/
├── page.tsx        ← required — the page itself
├── loading.tsx     ← required — Suspense skeleton shown while page loads
└── error.tsx       ← recommended — recoverable per-route error boundary
```

---

## Page template — server component (default)

```tsx
// src/app/(kiosk)/my-page/page.tsx
import type { Metadata } from 'next'
// Import shadcn components from @/components/ui/
// Import kiosk components from @/components/kiosk/
// Import dashboard components from @/components/dashboard/

export const metadata: Metadata = { title: 'Tên màn hình' }

export default function MyPage() {
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-bold">Tên màn hình</h1>
      {/* page content */}
    </div>
  )
}
```

**Rules for server components (default):**
- Export `metadata` — always include `title`
- No `'use client'` at the top unless you need state/effects
- Data fetching happens in async sub-components or client components via TanStack Query

---

## Page template — client component (when state/hooks needed)

```tsx
'use client'

import type { Metadata } from 'next'
import { useMyEntities } from '@/lib/hooks/use-my-domain'

// metadata can't be exported from 'use client' pages
// Instead, export it from a parent layout or a separate server wrapper

export default function MyClientPage() {
  const { data, isLoading } = useMyEntities()
  // ...
}
```

If you need both metadata AND client hooks, split into a server wrapper + client component:
```tsx
// page.tsx (server) — exports metadata, renders the client component
import type { Metadata } from 'next'
import { MyPageContent } from './_components/my-page-content'   // client component

export const metadata: Metadata = { title: 'My Page' }

export default function MyPage() {
  return <MyPageContent />
}
```

---

## loading.tsx template

```tsx
// src/app/(kiosk)/my-page/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function MyPageLoading() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-7 w-40" />          {/* page title */}
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="mb-2 h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

Mirror the visual structure of the actual page — same number of "cards", similar heights.

---

## error.tsx template

```tsx
// src/app/(kiosk)/my-page/error.tsx
'use client'    // error boundaries must be client components

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function MyPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Optional: log to error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="font-medium">Có lỗi xảy ra</p>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>Thử lại</Button>
    </div>
  )
}
```

---

## Layout rules by route group

### (kiosk) pages — mobile-first

```tsx
// Outer wrapper: vertical stack with p-4 padding
<div className="space-y-4 p-4">
  <h1 className="text-xl font-bold">Tiêu đề</h1>

  {/* Kiosk cards: touch-optimized */}
  <Card>
    <CardContent className="flex items-center justify-between p-4">
      {/* content */}
    </CardContent>
  </Card>

  {/* Primary action: always BigButton at bottom */}
  <BigButton>Hành động chính</BigButton>
</div>
```

Kiosk checklist:
- [ ] Font size ≥ 16px for all interactive text
- [ ] Touch targets ≥ 48px height for tappable items
- [ ] Primary action uses `BigButton` (min-h: 56px, full-width)
- [ ] Text labels in **Vietnamese** (worker-facing)
- [ ] Pull-to-refresh via TanStack Query `refetchOnWindowFocus` or manual button
- [ ] Skeleton loading in `loading.tsx` mirrors page structure

### (dashboard) pages — desktop/tablet

```tsx
// Outer wrapper: responsive grid layout
<div className="space-y-6">
  <h1 className="text-2xl font-bold">Tiêu đề</h1>

  {/* KPI row */}
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <StatCard title="Metric" value="123" icon={SomeIcon} />
  </div>

  {/* Alert banner if relevant */}
  <AlertBanner status="GREEN" utilizationPct={8} message="..." />

  {/* Data table */}
  <div className="rounded-xl border bg-card shadow-sm">
    <Table>...</Table>
  </div>
</div>
```

Dashboard checklist:
- [ ] Title uses `text-2xl font-bold`
- [ ] Stats use `StatCard` from `@/components/dashboard/stat-card`
- [ ] Overflow alerts use `AlertBanner` from `@/components/dashboard/alert-banner`
- [ ] Tables use shadcn `Table` components
- [ ] Responsive: `sm:` and `lg:` breakpoints for grid columns

---

## Responsive breakpoints

| Breakpoint | Width | Context |
|------------|-------|---------|
| base | 375 px | Mobile kiosk (shop floor) |
| `sm:` | 640 px | — |
| `md:` | 768 px | Tablet |
| `lg:` | 1024 px | — |
| `xl:` | 1280 px | Desktop dashboard |

Always design base (mobile) first, then add `md:` / `lg:` overrides.

---

## Internal links

Always use `next/link` for navigation — never `<a href>` for internal routes:

```tsx
import Link from 'next/link'

<Link href="/cutting-orders" className="...">Lệnh cắt</Link>
```

For programmatic navigation in client components:

```tsx
'use client'
import { useRouter } from 'next/navigation'

const router = useRouter()
router.push('/cutting-orders')
```
