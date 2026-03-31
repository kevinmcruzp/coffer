import { useState, useCallback } from 'react'
import { readMonth, writeMonth, listMonths } from '../lib/db'
import { useSession } from './useSession'
import type { MonthData } from '../types'

function addMonths(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const date = new Date(y, m - 1 + delta, 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function cloneFixed(prev: MonthData, newKey: string): MonthData {
  return {
    key: newKey,
    expenses: prev.expenses
      .filter((e) => e.fixed)
      .map((e) => ({ ...e, id: crypto.randomUUID() })),
    incomes: [],
    saving: 0,
    adjustment: 0,
  }
}

export type UseCurrentMonthResult = {
  monthKey: string
  canGoBack: boolean
  goBack: () => Promise<void>
  goForward: () => Promise<void>
  goTo: (key: string) => void
}

export function useCurrentMonth(initial: string): UseCurrentMonthResult {
  const { state, db } = useSession()
  const cryptoKey = state.status === 'unlocked' ? state.key : null

  const [monthKey, setMonthKey] = useState(initial)

  const goBack = useCallback(async () => {
    const prev = addMonths(monthKey, -1)
    setMonthKey(prev)
  }, [monthKey])

  const goForward = useCallback(async () => {
    if (!db || !cryptoKey) return
    const next = addMonths(monthKey, 1)
    const existing = await listMonths(db)
    if (!existing.includes(next)) {
      let newMonth: MonthData
      try {
        const current = await readMonth(db, monthKey, cryptoKey)
        newMonth = cloneFixed(current, next)
      } catch {
        newMonth = { key: next, expenses: [], incomes: [], saving: 0, adjustment: 0 }
      }
      await writeMonth(db, next, newMonth, cryptoKey)
    }
    setMonthKey(next)
  }, [monthKey, db, cryptoKey])

  const goTo = useCallback((key: string) => {
    setMonthKey(key)
  }, [])

  return { monthKey, canGoBack: true, goBack, goForward, goTo }
}
