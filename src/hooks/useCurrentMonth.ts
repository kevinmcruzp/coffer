import { useState, useCallback } from 'react'

function addMonths(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const date = new Date(y, m - 1 + delta, 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export type UseCurrentMonthResult = {
  monthKey: string
  canGoBack: boolean
  goBack: () => void
  goForward: () => void
  goTo: (key: string) => void
}

// Navigation only — moving between months never reads or writes data.
// Bringing recurring items forward is an explicit user action (see the copy-from-previous flow).
export function useCurrentMonth(initial: string): UseCurrentMonthResult {
  const [monthKey, setMonthKey] = useState(initial)

  const goBack = useCallback(() => setMonthKey(k => addMonths(k, -1)), [])
  const goForward = useCallback(() => setMonthKey(k => addMonths(k, 1)), [])
  const goTo = useCallback((key: string) => setMonthKey(key), [])

  const year = parseInt(monthKey.split('-')[0], 10)
  const canGoBack = year > 2000

  return { monthKey, canGoBack, goBack, goForward, goTo }
}
