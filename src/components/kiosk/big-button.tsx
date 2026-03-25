import * as React from 'react'
import { cn } from '@/lib/utils'

interface BigButtonProps extends React.ComponentProps<'button'> {
  variant?: 'primary' | 'secondary' | 'danger'
}

/**
 * Large touch-friendly button for kiosk use.
 * Minimum height 56px, full width, font size 18px.
 * Touch targets meet the ≥ 48px accessibility guideline.
 */
function BigButton({
  className,
  variant = 'primary',
  disabled,
  children,
  ...props
}: BigButtonProps) {
  return (
    <button
      disabled={disabled}
      className={cn(
        'flex min-h-[56px] w-full items-center justify-center rounded-xl px-6 text-lg font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' &&
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        variant === 'secondary' &&
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        variant === 'danger' &&
          'bg-destructive text-white hover:bg-destructive/90',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export { BigButton }
