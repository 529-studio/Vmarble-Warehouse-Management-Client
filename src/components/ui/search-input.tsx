import * as React from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface SearchInputProps extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> {
  /** Controlled input value (the raw, un-debounced value) */
  value: string
  onChange: (value: string) => void
  /** Show a spinner while debounce is pending (value !== debouncedValue) */
  isPending?: boolean
  containerClassName?: string
}

/**
 * Search input with a magnifier icon, optional loading spinner, and a clear
 * button. Debouncing is handled by the parent via useDebounce — this component
 * is purely presentational.
 */
export function SearchInput({
  value,
  onChange,
  isPending = false,
  placeholder = 'Tìm kiếm…',
  className,
  containerClassName,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn('relative flex items-center', containerClassName)}>
      {/* Left icon: spinner when pending, magnifier otherwise */}
      <span className="pointer-events-none absolute left-2.5 flex text-muted-foreground">
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Search className="size-4" />
        )}
      </span>

      <Input
        {...props}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('pl-8', value ? 'pr-8' : '', className)}
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Xóa tìm kiếm"
          className="absolute right-2.5 flex text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
