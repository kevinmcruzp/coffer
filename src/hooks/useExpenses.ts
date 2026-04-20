import { useState, useEffect, useCallback, useMemo } from 'react'
import { readMonth, writeMonth } from '../lib/db'
import { expenseSchema, parseOrThrow } from '../lib/schemas'
import { userMessage } from '../lib/errorMessages'
import { round2 } from '../lib/math'
import { useSession } from './useSession'
import { CURRENCIES } from '../types'
import type { Currency, Expense, MonthData } from '../types'

export type CurrencyTotals = { debit: number; credit: number; total: number }
export type Totals = Record<Currency, CurrencyTotals>

export type UseExpensesResult = {
  expenses: Expense[]
  loading: boolean
  error: string | null
  totals: Totals
  add: (input: Omit<Expense, 'id'>) => Promise<void>
  update: (id: string, changes: Partial<Omit<Expense, 'id'>>) => Promise<void>
  remove: (id: string) => Promise<void>
}

type FetchState = {
  resolvedKey: string | null
  monthData: MonthData | null
  error: string | null
}

function zeroCurrencyTotals(): Totals {
  const result = {} as Totals
  for (const c of CURRENCIES) result[c] = { debit: 0, credit: 0, total: 0 }
  return result
}

function computeTotals(expenses: Expense[]): Totals {
  const result = zeroCurrencyTotals()
  for (const e of expenses) {
    result[e.currency].debit += e.debit
    result[e.currency].credit += e.credit
    result[e.currency].total += e.debit + e.credit
  }
  for (const c of CURRENCIES) {
    result[c].debit = round2(result[c].debit)
    result[c].credit = round2(result[c].credit)
    result[c].total = round2(result[c].total)
  }
  return result
}

const ZERO_TOTALS: Totals = zeroCurrencyTotals()

export function useExpenses(monthKey: string): UseExpensesResult {
  const { state, db } = useSession()
  const cryptoKey = state.status === 'unlocked' ? state.key : null

  const [fetchState, setFetchState] = useState<FetchState>({
    resolvedKey: null,
    monthData: null,
    error: null,
  })

  useEffect(() => {
    if (!db || !cryptoKey) return
    let cancelled = false

    readMonth(db, monthKey, cryptoKey)
      .then((data) => {
        if (cancelled) return
        setFetchState({ resolvedKey: monthKey, monthData: data, error: null })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('not found')) {
          setFetchState({
            resolvedKey: monthKey,
            monthData: { key: monthKey, expenses: [], incomes: [], saving: 0, adjustment: 0, budget: 0 },
            error: null,
          })
        } else {
          setFetchState({ resolvedKey: monthKey, monthData: null, error: userMessage(err, 'Failed to load expenses') })
        }
      })

    return () => { cancelled = true }
  }, [monthKey, db, cryptoKey])

  // loading stays true while any previous fetch is in flight for a different monthKey.
  // resolvedKey tracks which fetch last settled, so switching months never shows stale data.
  const loading = !db || !cryptoKey || fetchState.resolvedKey !== monthKey

  // Mutations follow a write-then-set-state pattern: the DB is written first; only on
  // success is the local state updated. If writeMonth throws, the state is left unchanged.
  const add = useCallback(async (input: Omit<Expense, 'id'>) => {
    if (!db || !cryptoKey) throw new Error('Session not active')
    const expense = parseOrThrow(expenseSchema, { ...input, id: crypto.randomUUID() })
    const current = fetchState.monthData
      ?? { key: monthKey, expenses: [], incomes: [], saving: 0, adjustment: 0, budget: 0 }
    const updated: MonthData = { ...current, expenses: [...current.expenses, expense] }
    await writeMonth(db, monthKey, updated, cryptoKey)
    setFetchState({ resolvedKey: monthKey, monthData: updated, error: null })
  }, [fetchState.monthData, monthKey, db, cryptoKey])

  const update = useCallback(async (id: string, changes: Partial<Omit<Expense, 'id'>>) => {
    if (!db || !cryptoKey) throw new Error('Session not active')
    if (!fetchState.monthData) throw new Error('Month not loaded')
    const existing = fetchState.monthData.expenses.find(e => e.id === id)
    if (!existing) throw new Error(`Expense "${id}" not found`)
    const updated = parseOrThrow(expenseSchema, { ...existing, ...changes })
    const monthData: MonthData = {
      ...fetchState.monthData,
      expenses: fetchState.monthData.expenses.map(e => e.id === id ? updated : e),
    }
    await writeMonth(db, monthKey, monthData, cryptoKey)
    setFetchState({ resolvedKey: monthKey, monthData, error: null })
  }, [fetchState.monthData, monthKey, db, cryptoKey])

  const remove = useCallback(async (id: string) => {
    if (!db || !cryptoKey) throw new Error('Session not active')
    if (!fetchState.monthData) throw new Error('Month not loaded')
    const monthData: MonthData = {
      ...fetchState.monthData,
      expenses: fetchState.monthData.expenses.filter(e => e.id !== id),
    }
    await writeMonth(db, monthKey, monthData, cryptoKey)
    setFetchState({ resolvedKey: monthKey, monthData, error: null })
  }, [fetchState.monthData, monthKey, db, cryptoKey])

  const totals = useMemo(
    () => fetchState.monthData ? computeTotals(fetchState.monthData.expenses) : ZERO_TOTALS,
    [fetchState.monthData],
  )

  return {
    expenses: fetchState.monthData?.expenses ?? [],
    loading,
    error: fetchState.error,
    totals,
    add,
    update,
    remove,
  }
}
