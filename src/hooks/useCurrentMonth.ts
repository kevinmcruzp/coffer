import { useState, useCallback } from 'react'
import { readMonth, writeMonth } from '../lib/db'
import { syncFixed } from '../lib/syncFixed'
import { useSession } from './useSession'
import type { MonthData } from '../types'

function addMonths(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const date = new Date(y, m - 1 + delta, 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const EMPTY_MONTH = (key: string): MonthData => ({
  key, expenses: [], incomes: [], saving: 0, adjustment: 0, budget: 0,
})

export type UseCurrentMonthResult = {
  monthKey: string
  canGoBack: boolean
  goBack: () => void
  goForward: () => Promise<void>
  goTo: (key: string) => void
}

export function useCurrentMonth(initial: string): UseCurrentMonthResult {
  const { state, db } = useSession()
  const cryptoKey = state.status === 'unlocked' ? state.key : null

  const [monthKey, setMonthKey] = useState(initial)

  const goBack = useCallback(() => {
    const prev = addMonths(monthKey, -1)
    setMonthKey(prev)
  }, [monthKey])

  // goForward is async because it propagates data before navigating:
  //   1. Reads the current month to find fixed expenses and recurring incomes.
  //   2. Reads (or creates) the next month.
  //   3. Merges missing fixed expenses (via syncFixed) and recurring incomes.
  //   4. Writes the merged month, then updates monthKey.
  // The write is skipped if the next month already exists and needs no additions.
  const goForward = useCallback(async () => {
    if (!db || !cryptoKey) return
    const next = addMonths(monthKey, 1)

    // Read current month (source of fixed expenses)
    let current: MonthData
    try {
      current = await readMonth(db, monthKey, cryptoKey)
    } catch {
      current = EMPTY_MONTH(monthKey)
    }

    // Read next month (may or may not exist)
    let nextMonth: MonthData
    let nextExists = true
    try {
      nextMonth = await readMonth(db, next, cryptoKey)
    } catch {
      nextMonth = EMPTY_MONTH(next)
      nextExists = false
    }

    // Merge missing fixed expenses
    const toAddExpenses = syncFixed(current, nextMonth)

    // Clone recurring incomes not yet present in next month (match by source + currency)
    const existingSources = new Set(
      nextMonth.incomes.map(i => `${i.source}|${i.currency}`)
    )
    const toAddIncomes = current.incomes
      .filter(i => i.recurring && !existingSources.has(`${i.source}|${i.currency}`))
      .map(i => ({ ...i, id: crypto.randomUUID() }))

    if (toAddExpenses.length > 0 || toAddIncomes.length > 0 || !nextExists) {
      const merged: MonthData = {
        ...nextMonth,
        expenses: [
          ...nextMonth.expenses,
          ...toAddExpenses.map(e => ({ ...e, id: crypto.randomUUID() })),
        ],
        incomes: [...nextMonth.incomes, ...toAddIncomes],
      }
      await writeMonth(db, next, merged, cryptoKey)
    }

    setMonthKey(next)
  }, [monthKey, db, cryptoKey])

  const goTo = useCallback((key: string) => {
    setMonthKey(key)
  }, [])

  const year = parseInt(monthKey.split('-')[0], 10)
  const canGoBack = year > 2000

  return { monthKey, canGoBack, goBack, goForward, goTo }
}
