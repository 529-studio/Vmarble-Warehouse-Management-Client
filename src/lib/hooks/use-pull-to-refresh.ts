import { useCallback, useEffect, useRef, useState } from 'react'

interface UsePullToRefreshOptions {
  /** Minimum pull distance in px before release triggers a refresh. Default: 72 */
  threshold?: number
  /** Called when a full pull-and-release gesture is completed. */
  onRefresh: () => Promise<unknown> | void
}

interface PullToRefreshState {
  /**
   * Ref to attach to the element that should display the pull indicator.
   * Touch events are listened at the document level so the actual scrollable
   * ancestor does not need to be this element.
   */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** True while a refresh triggered by the pull gesture is in flight. */
  isRefreshing: boolean
  /**
   * Pull progress in [0, 1]. Use this to animate a spinner or indicator
   * (e.g. `opacity: pullProgress`, `transform: translateY(pullProgress * 56px)`).
   */
  pullProgress: number
}

/**
 * usePullToRefresh — lightweight pull-to-refresh via native touch events.
 *
 * Listeners are attached at the document level so they work regardless of
 * which element is the scrollable ancestor. Pull is only initiated when the
 * page is already scrolled to the top (window.scrollY === 0), preventing
 * accidental triggers mid-list.
 *
 * No third-party dependency required.
 */
export function usePullToRefresh({
  threshold = 72,
  onRefresh,
}: UsePullToRefreshOptions): PullToRefreshState {
  const containerRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef<number | null>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only begin tracking when already scrolled to the top of the page.
    const scrollTop =
      window.scrollY ??
      document.documentElement.scrollTop ??
      document.body.scrollTop ??
      0
    if (scrollTop === 0) {
      startYRef.current = e.touches[0].clientY
    }
  }, [])

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (startYRef.current === null || isRefreshing) return

      const delta = e.touches[0].clientY - startYRef.current
      if (delta <= 0) {
        // Swiping up — cancel pull tracking
        startYRef.current = null
        setPullDistance(0)
        return
      }

      // Rubber-band damping beyond threshold
      const damped =
        delta < threshold ? delta : threshold + (delta - threshold) * 0.3
      setPullDistance(damped)

      // Suppress native browser pull-to-refresh / overscroll while we handle it
      if (delta > 8) e.preventDefault()
    },
    [isRefreshing, threshold],
  )

  const handleTouchEnd = useCallback(async () => {
    if (startYRef.current === null) return
    startYRef.current = null

    if (pullDistance >= threshold) {
      setPullDistance(0)
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    } else {
      setPullDistance(0)
    }
  }, [pullDistance, threshold, onRefresh])

  useEffect(() => {
    // passive: false on touchmove is required to call preventDefault()
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const pullProgress = Math.min(pullDistance / threshold, 1)

  return { containerRef, isRefreshing, pullProgress }
}
