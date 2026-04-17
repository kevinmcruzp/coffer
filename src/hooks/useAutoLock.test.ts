import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutoLock } from './useAutoLock'

describe('useAutoLock', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('locks after the timeout when there is no activity', () => {
    const onLock = vi.fn()
    renderHook(() => useAutoLock({ enabled: true, timeoutMs: 1000, onLock }))

    expect(onLock).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(onLock).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onLock).toHaveBeenCalledTimes(1)
  })

  it('resets the timer on activity', () => {
    const onLock = vi.fn()
    renderHook(() => useAutoLock({ enabled: true, timeoutMs: 1000, onLock }))

    act(() => {
      vi.advanceTimersByTime(800)
      window.dispatchEvent(new KeyboardEvent('keydown'))
      vi.advanceTimersByTime(800)
    })
    expect(onLock).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(onLock).toHaveBeenCalledTimes(1)
  })

  it('does nothing when disabled', () => {
    const onLock = vi.fn()
    renderHook(() => useAutoLock({ enabled: false, timeoutMs: 1000, onLock }))
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(onLock).not.toHaveBeenCalled()
  })

  it('does nothing when timeoutMs is zero', () => {
    const onLock = vi.fn()
    renderHook(() => useAutoLock({ enabled: true, timeoutMs: 0, onLock }))
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(onLock).not.toHaveBeenCalled()
  })

  it('locks immediately when tab becomes visible after elapsed timeout', () => {
    const onLock = vi.fn()
    renderHook(() => useAutoLock({ enabled: true, timeoutMs: 5000, onLock }))

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
      vi.advanceTimersByTime(6000)
    })
    onLock.mockClear()

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(onLock).toHaveBeenCalledTimes(1)
  })

  it('cleans up listeners and timer on unmount', () => {
    const onLock = vi.fn()
    const { unmount } = renderHook(() =>
      useAutoLock({ enabled: true, timeoutMs: 1000, onLock }),
    )
    unmount()
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(onLock).not.toHaveBeenCalled()
  })
})
