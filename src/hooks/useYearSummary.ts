import { useState, useEffect } from 'react'
import { readMonth } from '../lib/db'
import { userMessage } from '../lib/errorMessages'
import { round2 } from '../lib/math'
import { monthBalance } from '../lib/closing'
import { useSession } from './useSession'
import type { MonthData } from '../types'

// Every amount is in the currency of the session's active environment.
export type MonthRow = {
  monthKey: string
  income: number
  debit: number
  credit: number
  saving: number
  adjustment: number
  balance: number
  items: number
  // Balance of the same calendar month in the prior year (year-over-year comparison).
  prevBalance: number | null
}

export type YearTotals = Omit<MonthRow, 'monthKey' | 'prevBalance'>

export type UseYearSummaryResult = {
  rows: MonthRow[]
  totals: YearTotals
  loading: boolean
  error: string | null
  warning: string | null
}

function summarize(data: MonthData): YearTotals {
  const income = round2(data.incomes.reduce((sum, i) => sum + i.amount, 0))
  const debit = round2(data.expenses.reduce((sum, e) => sum + e.debit, 0))
  const credit = round2(data.expenses.reduce((sum, e) => sum + e.credit, 0))
  return {
    income,
    debit,
    credit,
    saving: data.saving,
    adjustment: data.adjustment,
    balance: monthBalance(data),
    items: data.expenses.length + data.incomes.length,
  }
}

export function useYearSummary(year: number): UseYearSummaryResult {
  const { state, db } = useSession()
  const cryptoKey = state.status === 'unlocked' ? state.key : null

  const [rows, setRows] = useState<MonthRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  useEffect(() => {
    if (!db || !cryptoKey) return

    let cancelled = false

    async function load() {
      const allKeys = await db!.listMonths()
      const yearKeys = allKeys.filter(k => k.startsWith(`${year}-`)).sort()
      const prevYearKeys = allKeys.filter(k => k.startsWith(`${year - 1}-`))

      // Prior-year balances keyed by month suffix (e.g. "03").
      const prevBalances: Record<string, number> = {}
      for (const k of prevYearKeys) {
        try {
          prevBalances[k.split('-')[1]] = monthBalance(await readMonth(db!, k, cryptoKey!))
        } catch { /* skip */ }
      }

      const result: MonthRow[] = []
      const failed: string[] = []

      for (const monthKey of yearKeys) {
        try {
          const data = await readMonth(db!, monthKey, cryptoKey!)
          result.push({
            monthKey,
            ...summarize(data),
            prevBalance: prevBalances[monthKey.split('-')[1]] ?? null,
          })
        } catch {
          failed.push(monthKey)
        }
      }

      return { result, failed }
    }

    load()
      .then(({ result, failed }) => {
        if (cancelled) return
        setRows(result)
        setError(null)
        setWarning(failed.length > 0 ? `Could not load ${failed.length} month(s): ${failed.join(', ')}` : null)
        setLoading(false)
      })
      .catch(err => {
        if (cancelled) return
        setError(userMessage(err, 'Failed to load annual data'))
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [year, db, cryptoKey])

  const sum = (pick: (row: MonthRow) => number): number => round2(rows.reduce((acc, row) => acc + pick(row), 0))
  const totals: YearTotals = {
    income: sum(r => r.income),
    debit: sum(r => r.debit),
    credit: sum(r => r.credit),
    saving: sum(r => r.saving),
    adjustment: sum(r => r.adjustment),
    balance: sum(r => r.balance),
    items: rows.reduce((acc, row) => acc + row.items, 0),
  }

  return { rows, totals, loading, error, warning }
}
