'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { fetchEventSource, type EventSourceMessage } from '@microsoft/fetch-event-source'
import { toast } from 'sonner'
import { normalizeAuthToken } from '@/lib/auth/token'
import { isRealtimeEvent, type RealtimeEvent } from './events'
import { eventToQueryKeys } from './mapping'

const SSE_PATH = '/notifications/stream'
// Backoff schedule (ms) for reconnect attempts. After the last entry we cap
// at the same value rather than escalate further — staying aggressive enough
// that a sleeping laptop reconnects within a minute of waking.
const BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 15_000, 30_000]

class RetriableError extends Error {}
class FatalError extends Error {}

function buildSseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080/api/v1'
  const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  return new URL(`${baseUrl}${SSE_PATH}`, base).toString()
}

/**
 * RealtimeProvider opens a single SSE stream while the user is authenticated
 * and dispatches each event to the TanStack Query cache via the pure
 * `eventToQueryKeys` mapping.
 *
 * Why fetch-event-source instead of native EventSource:
 *   - native EventSource cannot send Authorization headers, so it would force
 *     us to put the JWT in the URL (visible in proxy logs and browser
 *     history). fetch-event-source forwards arbitrary headers.
 *   - we control reconnect on auth failure so a logout breaks the loop.
 *
 * Why a provider rather than a one-off hook:
 *   - exactly one stream per browser tab, regardless of how many components
 *     subscribe.
 *   - co-located with `Providers` so it sits inside the QueryClientProvider
 *     tree and uses the same client.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  // Persist the abort controller so logout / unmount tears down the stream.
  const ctrlRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const token = normalizeAuthToken(localStorage.getItem('auth_token'))
    if (!token) return

    let attempt = 0
    let cancelled = false
    const ctrl = new AbortController()
    ctrlRef.current = ctrl

    const handleEvent = (msg: EventSourceMessage) => {
      // The BE emits unnamed `message` events; ignore the keep-alive ping.
      if (!msg.data) return
      let parsed: unknown
      try {
        parsed = JSON.parse(msg.data)
      } catch {
        return
      }
      if (!isRealtimeEvent(parsed)) return

      const event = parsed as RealtimeEvent
      for (const key of eventToQueryKeys(event)) {
        queryClient.invalidateQueries({ queryKey: key })
      }

      // Personal toast for the assignee. Other event types are quiet.
      if (event.type === 'NEW_ASSIGNMENT') {
        const sku = event.sku ? ` · ${event.sku}` : ''
        toast.success(`Bạn có lệnh sản xuất mới${sku}`)
      } else if (event.type === 'LOADING_PLAN_RELOAD') {
        // Another planner approved a v2 packing-list; everyone watching this
        // container needs to know their stale view will get refreshed.
        toast.info('Plan vừa được re-load, vui lòng refresh nếu cần xem v2.')
      }
    }

    const connect = async () => {
      while (!cancelled) {
        try {
          await fetchEventSource(buildSseUrl(), {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
            signal: ctrl.signal,
            // Disable the library's own retry so we own the backoff.
            openWhenHidden: true,
            async onopen(response) {
              if (response.ok && response.headers.get('content-type')?.includes('text/event-stream')) {
                attempt = 0
                return
              }
              if (response.status === 401 || response.status === 403) {
                throw new FatalError(`auth failed: ${response.status}`)
              }
              throw new RetriableError(`bad status: ${response.status}`)
            },
            onmessage: handleEvent,
            onerror(err) {
              // Throw → exits fetchEventSource so we can apply our own backoff.
              if (err instanceof FatalError) throw err
              throw new RetriableError(err instanceof Error ? err.message : 'stream error')
            },
            onclose() {
              throw new RetriableError('stream closed by server')
            },
          })
          // Reached only when fetchEventSource resolves cleanly (e.g. abort) —
          // exit the loop.
          return
        } catch (err) {
          if (cancelled || err instanceof FatalError) return

          const delay = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)]
          attempt += 1
          await sleep(delay, ctrl.signal)
        }
      }
    }

    connect()

    return () => {
      cancelled = true
      ctrl.abort()
      ctrlRef.current = null
    }
  }, [queryClient])

  return <>{children}</>
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve()
    const id = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(id)
      resolve()
    }, { once: true })
  })
}
