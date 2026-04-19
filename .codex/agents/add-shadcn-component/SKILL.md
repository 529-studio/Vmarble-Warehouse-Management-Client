---
name: add-shadcn-component
description: Use when adding a new shadcn/ui component to the project — running the CLI, placing files, writing wrappers, or creating custom CVA-based variants following the existing button/card/badge patterns.
---

# Add shadcn/ui Component

## CLI — add an existing shadcn component

```bash
# Always use the latest CLI
npx shadcn@latest add <component-name>
```

The component is placed automatically at **`src/components/ui/<component>.tsx`** (configured via `components.json`).

Common components available:
- `accordion` `alert-dialog` `avatar` `checkbox` `collapsible` `command`
- `dropdown-menu` `form` `hover-card` `popover` `progress` `radio-group`
- `scroll-area` `sheet` `slider` `switch` `tabs` `textarea` `toggle`
- `tooltip`

After adding, import from `@/components/ui/<component>`.

## Project configuration (`components.json`)

| Setting | Value |
|---------|-------|
| Style | `new-york` |
| Base color | `neutral` |
| CSS variables | `true` (oklch color space) |
| Icon library | `lucide-react` |
| Alias | `@/components/ui` |
| Utils | `@/lib/utils` (exports `cn`) |

## Golden rule — never modify generated files

Do **not** edit files under `src/components/ui/` directly.
Instead, create a **wrapper component** in `src/components/kiosk/`, `src/components/dashboard/`, or a new domain folder.

```tsx
// ✅ Correct — wrapper in src/components/kiosk/big-button.tsx
import { Button, type buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function BigButton({ className, ...props }) {
  return <Button className={cn('min-h-[56px] w-full text-lg', className)} {...props} />
}

// ❌ Wrong — editing src/components/ui/button.tsx directly
```

## Writing a custom component from scratch (CVA pattern)

Follow the exact same pattern used in `src/components/ui/button.tsx`:

```tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'          // for asChild polymorphism
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const myVariants = cva(
  // 1. Base classes (always applied)
  'inline-flex items-center rounded-md text-sm font-medium transition-all disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 px-3',
        lg: 'h-11 px-6',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
)

interface MyComponentProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof myVariants> {
  asChild?: boolean   // allow rendering as a different element
}

function MyComponent({ className, variant, size, asChild = false, ...props }: MyComponentProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      data-slot="my-component"          // data-slot for shadcn consistency
      className={cn(myVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { MyComponent, myVariants }     // export both component AND variants
```

## CSS variables for colors

Always reference design tokens — never hardcode hex/rgb values:

```tsx
// ✅ Uses CSS variables (respects dark mode automatically)
className="bg-primary text-primary-foreground"
className="bg-destructive text-white"
className="border-border bg-card"
className="text-muted-foreground"

// ❌ Hardcoded — breaks dark mode
className="bg-black text-white"
```

Available tokens: `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--ring`, `--card`, `--chart-1..5`, `--sidebar-*`

## Sonner toast integration

After a user action, always give feedback:

```tsx
import { toast } from 'sonner'

toast.success('Tấm lẻ đã được nhập kho')
toast.error('Không thể kết nối API')
toast.loading('Đang xử lý...')
```

## Accessibility checklist

- All interactive elements: `focus-visible:ring-[3px] focus-visible:ring-ring/50`
- Disabled state: `disabled:pointer-events-none disabled:opacity-50`
- Icons inside buttons: `aria-hidden="true"` + sr-only text if icon-only
- Touch targets (kiosk): minimum `min-h-[48px] min-w-[48px]`
