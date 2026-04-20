import { useState, useEffect, useCallback, useMemo } from 'react'
import { readMonth, writeMonth } from '../lib/db'
import { incomeSchema, parseOrThrow } from '../lib/schemas'
import { userMessage } from '../lib/errorMessages'
import { useSession } from './useSession'
import { CURRENCIES } from '../types'
import type { Currency, Income, MonthData } from '../types'

export type IncomeTotals = Record<Currency, number>

export type UseIncomesResult = {
  incomes: Income[]
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
  return result
}

const ZERO_TOTALS: IncomeTotals = zeroCurrencyMap()

export function useIncomes(monthKey: string): UseIncomesResult {
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
          setFetchState({ resolvedKey: monthKey, monthData: null, error: userMessage(err, 'Failed to load incomes') })
        }
      })

    return () => { cancelled = true }
  }, [monthKey, db, cryptoKey])

  const loading = !db || !cryptoKey || fetchState.resolvedKey !== monthKey

  const add = useCallback(async (input: Omit<Income, 'id'>) => {
    if (!db || !cryptoKey) throw new Error('Session not active')
    const income = parseOrThrow(incomeSchema,{ ...input, id: crypto.randomUUID() })
    const current = fetchState.monthData
      ?? { key: monthKey, expenses: [], incomes: [], saving: 0, adjustment: 0, budget: 0 }
    const updated: MonthData = { ...current, incomes: [...current.incomes, income] }
    await writeMonth(db, monthKey, updated, cryptoKey)
    setFetchState({ resolvedKey: monthKey, monthData: updated, error: null })
  }, [fetchState.monthData, monthKey, db, cryptoKey])

  const update = useCallback(async (id: string, changes: Partial<Omit<Income, 'id'>>) => {
    if (!db || !cryptoKey) throw new Error('Session not active')
    if (!fetchState.monthData) throw new Error('Month not loaded')
    const existing = fetchState.monthData.incomes.find(i => i.id === id)
    if (!existing) throw new Error(`Income "${id}" not found`)
    const updated = parseOrThrow(incomeSchema,{ ...existing, ...changes })
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
    loading,
    error: fetchState.error,
    totals,
    add,
    update,
    remove,
  }
}
