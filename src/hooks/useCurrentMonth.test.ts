import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCurrentMonth } from './useCurrentMonth'

describe('useCurrentMonth — navigation', () => {
  it('starts with the provided initial month key', () => {
    const { result } = renderHook(() => useCurrentMonth('2025-06'))
    expect(result.current.monthKey).toBe('2025-06')
  })

  it('goBack moves to the previous month', () => {
    const { result } = renderHook(() => useCurrentMonth('2025-06'))
    act(() => { result.current.goBack() })
    expect(result.current.monthKey).toBe('2025-05')
  })

  it('goBack wraps correctly across year boundary', () => {
    const { result } = renderHook(() => useCurrentMonth('2025-01'))
    act(() => { result.current.goBack() })
    expect(result.current.monthKey).toBe('2024-12')
  })

  it('goForward moves to the next month', () => {
    const { result } = renderHook(() => useCurrentMonth('2025-06'))
    act(() => { result.current.goForward() })
    expect(result.current.monthKey).toBe('2025-07')
  })

  it('goForward wraps correctly across year boundary', () => {
    const { result } = renderHook(() => useCurrentMonth('2025-12'))
    act(() => { result.current.goForward() })
    expect(result.current.monthKey).toBe('2026-01')
  })

  it('goTo jumps to an arbitrary month', () => {
    const { result } = renderHook(() => useCurrentMonth('2025-06'))
    act(() => { result.current.goTo('2023-02') })
    expect(result.current.monthKey).toBe('2023-02')
  })

  it('canGoBack is false at the year-2000 floor', () => {
    const { result } = renderHook(() => useCurrentMonth('2000-05'))
    expect(result.current.canGoBack).toBe(false)
  })
})
