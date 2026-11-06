import { useState, useEffect, useCallback, useMemo } from 'react'
import { readMonth, writeMonth } from '../lib/db'
import { incomeSchema, parseOrThrow } from '../lib/schemas'
import { userMessage } from '../lib/errorMessages'
import { round2 } from '../lib/math'
import { useSession } from './useSession'
import { useMonthRevision } from './useMonthRevision'
import { assertMonthOpen } from '../lib/closing'
import { CURRENCIES } from '../types'
import type { Currency, Income, MonthData } from '../types'

export type IncomeTotals = Record<Currency, number>

export type UseIncomesResult = {
  incomes: Income[]
  closed: boolean
  loading: boolean
  error: string | null
  totals: IncomeTotals
  add: (input: Omit<Income, 'id'>) => Promise<void>
  update: (id: string, changes: Partial<Omit<Income, 'id'>>) => Promise<void>
  remove: (id: string) => Promise<void>
}

type FetchState = {
  resolvedKey: string | null
  monthData: MonthData | null
  error: string | null
}

function zeroCurrencyMap(): IncomeTotals {
  const result = {} as IncomeTotals
  for (const c of CURRENCIES) result[c] = 0
  return result
}

function computeTotals(incomes: Income[]): IncomeTotals {
  const result = zeroCurrencyMap()
  for (const i of incomes) {
    result[i.currency] += i.amount
  }
  for (const c of CURRENCIES) {
    result[c] = round2(result[c])
  }
  return result
}

const ZERO_TOTALS: IncomeTotals = zeroCurrencyMap()

function assertNotCarried(income: Income): void {
  if (income.carryFrom) {
    throw new Error('This balance comes from closing the previous month. Reopen and close that month to change it.')
  }
}

export function useIncomes(monthKey: string): UseIncomesResult {
  const { state, db } = useSession()
  const cryptoKey = state.status === 'unlocked' ? state.key : null
  const revision = useMonthRevision(monthKey)

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
          setFetchState({ resolvedKey: monthKey, monthData: null, error: userMessage(err, 'Failed to load incomes') })
        }
      })

    return () => { cancelled = true }
  }, [monthKey, db, cryptoKey, revision])

  const loading = !db || !cryptoKey || fetchState.resolvedKey !== monthKey

  const add = useCallback(async (input: Omit<Income, 'id'>) => {
    if (!db || !cryptoKey) throw new Error('Session not active')
    const current = fetchState.monthData
      ?? { key: monthKey, expenses: [], incomes: [], saving: 0, adjustment: 0, budget: 0 }
    assertMonthOpen(current)
    // carryFrom is only ever set by closing the previous month.
    const income = parseOrThrow(incomeSchema, {
      id: crypto.randomUUID(),
      source: input.source,
      currency: input.currency,
      amount: input.amount,
    })
    const updated: MonthData = { ...current, incomes: [...current.incomes, income] }
    await writeMonth(db, monthKey, updated, cryptoKey)
    setFetchState({ resolvedKey: monthKey, monthData: updated, error: null })
  }, [fetchState.monthData, monthKey, db, cryptoKey])

  const update = useCallback(async (id: string, changes: Partial<Omit<Income, 'id'>>) => {
    if (!db || !cryptoKey) throw new Error('Session not active')
    if (!fetchState.monthData) throw new Error('Month not loaded')
    assertMonthOpen(fetchState.monthData)
    const existing = fetchState.monthData.incomes.find(i => i.id === id)
    if (!existing) throw new Error(`Income "${id}" not found`)
    assertNotCarried(existing)
    // carryFrom can't be set by an edit — only closing the previous month creates one.
    const updated = parseOrThrow(incomeSchema, { ...existing, ...changes, carryFrom: undefined })
    const monthData: MonthData = {
      ...fetchState.monthData,
      incomes: fetchState.monthData.incomes.map(i => i.id === id ? updated : i),
    }
    await writeMonth(db, monthKey, monthData, cryptoKey)
    setFetchState({ resolvedKey: monthKey, monthData, error: null })
  }, [fetchState.monthData, monthKey, db, cryptoKey])

  const remove = useCallback(async (id: string) => {
    if (!db || !cryptoKey) throw new Error('Session not active')
    if (!fetchState.monthData) throw new Error('Month not loaded')
    assertMonthOpen(fetchState.monthData)
    const existing = fetchState.monthData.incomes.find(i => i.id === id)
    if (existing) assertNotCarried(existing)
    const monthData: MonthData = {
      ...fetchState.monthData,
      incomes: fetchState.monthData.incomes.filter(i => i.id !== id),
    }
    await writeMonth(db, monthKey, monthData, cryptoKey)
    setFetchState({ resolvedKey: monthKey, monthData, error: null })
  }, [fetchState.monthData, monthKey, db, cryptoKey])

  const totals = useMemo(
    () => fetchState.monthData ? computeTotals(fetchState.monthData.incomes) : ZERO_TOTALS,
    [fetchState.monthData],
  )

  return {
    incomes: fetchState.monthData?.incomes ?? [],
    closed: fetchState.monthData?.closing !== undefined,
    loading,
    error: fetchState.error,
    totals,
    add,
    update,
    remove,
  }
}
