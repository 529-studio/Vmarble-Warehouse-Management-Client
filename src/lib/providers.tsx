'use client'

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiClientError } from '@/lib/api/client'
import { RealtimeProvider } from '@/lib/realtime/provider'

/**
 * Surface 403 errors as a single Vietnamese toast instead of letting every
 * call site write its own copy. Network-level 403 means BE rejected the
 * action — usually a planner-only / admin-only operation reached through a
 * stale UI. Per-mutation `onError` handlers can still override.
 */
function showForbiddenToast(err: unknown) {
  if (err instanceof ApiClientError && err.status === 403) {
    toast.error('Bạn không đủ quyền cho hành động này')
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 s
            gcTime: 5 * 60 * 1000, // 5 min
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
        queryCache: new QueryCache({ onError: showForbiddenToast }),
        mutationCache: new MutationCache({ onError: showForbiddenToast }),
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>{children}</RealtimeProvider>
    </QueryClientProvider>
  )
}

