import { useEffect, useRef } from 'react'

type Options = {
  enabled: boolean
  timeoutMs: number
  onLock: () => void
}

export function useAutoLock({ enabled, timeoutMs, onLock }: Options) {
  const onLockRef = useRef(onLock)
  const timerRef = useRef<number | null>(null)
  const lastActivityRef = useRef<number>(0)

  // Keep the ref in sync so activity listeners (attached once) always call the latest onLock,
  // without needing to re-attach them when the parent re-renders with a new callback.
  useEffect(() => {
    onLockRef.current = onLock
  }, [onLock])

  useEffect(() => {
    if (!enabled || timeoutMs <= 0) return
    lastActivityRef.current = Date.now()

    const schedule = () => {
      lastActivityRef.current = Date.now()
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => onLockRef.current(), timeoutMs)
    }

    const handleActivity = () => schedule()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // If the tab was hidden long enough that the timeout would have fired,
        // lock immediately instead of waiting for the next activity event.
        const elapsed = Date.now() - lastActivityRef.current
        if (elapsed >= timeoutMs) onLockRef.current()
        else schedule()
      }
    }

    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('touchstart', handleActivity)
    document.addEventListener('visibilitychange', handleVisibility)

    schedule()

    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
      document.removeEventListener('visibilitychange', handleVisibility)
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [enabled, timeoutMs])
}
