import { useState, useEffect, useCallback } from 'react'
import { readMonth, writeMonth } from '../lib/db'
import { monthDataSchema } from '../lib/schemas'
import { useSession } from './useSession'
import type { MonthData } from '../types'

export type UseMonthMetaResult = {
  saving: number
  adjustment: number
  budget: number
  loading: boolean
  error: string | null
  setSaving: (value: number) => Promise<void>
  setAdjustment: (value: number) => Promise<void>
  setBudget: (value: number) => Promise<void>
}

type FetchState = {
  resolvedKey: string | null
  monthData: MonthData | null
  error: string | null
}

function emptyMonth(key: string): MonthData {
  return { key, expenses: [], incomes: [], saving: 0, adjustment: 0, budget: 0 }
}

export function useMonthMeta(monthKey: string): UseMonthMetaResult {
  const { state, db } = useSession()
  const cryptoKey = state.status === 'unlocked' ? state.key : null

  const [fetchState, setFetchState] = useState<FetchState>({
    resolvedKey: null,
    monthData: null,
    error: null,
  })

  useEffect(() => {
    if (!db || !cryptoKey) return

    readMonth(db, monthKey, cryptoKey)
      .then((data) => {
        setFetchState({ resolvedKey: monthKey, monthData: data, error: null })
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('not found')) {
          setFetchState({ resolvedKey: monthKey, monthData: emptyMonth(monthKey), error: null })
        } else {
          setFetchState({ resolvedKey: monthKey, monthData: null, error: msg })
        }
      })
  }, [monthKey, db, cryptoKey])

  const loading = !db || !cryptoKey || fetchState.resolvedKey !== monthKey

  const setSaving = useCallback(async (value: number) => {
    if (!db || !cryptoKey) throw new Error('Session not active')
    const current = fetchState.monthData ?? emptyMonth(monthKey)
    const updated = monthDataSchema.parse({ ...current, saving: value })
    await writeMonth(db, monthKey, updated, cryptoKey)
    setFetchState({ resolvedKey: monthKey, monthData: updated, error: null })
  }, [fetchState.monthData, monthKey, db, cryptoKey])

  const setAdjustment = useCallback(async (value: number) => {
    if (!db || !cryptoKey) throw new Error('Session not active')
    const current = fetchState.monthData ?? emptyMonth(monthKey)
    const updated = monthDataSchema.parse({ ...current, adjustment: value })
    await writeMonth(db, monthKey, updated, cryptoKey)
    setFetchState({ resolvedKey: monthKey, monthData: updated, error: null })
  }, [fetchState.monthData, monthKey, db, cryptoKey])

  const setBudget = useCallback(async (value: number) => {
    if (!db || !cryptoKey) throw new Error('Session not active')
    const current = fetchState.monthData ?? emptyMonth(monthKey)
    const updated = monthDataSchema.parse({ ...current, budget: value })
    await writeMonth(db, monthKey, updated, cryptoKey)
    setFetchState({ resolvedKey: monthKey, monthData: updated, error: null })
  }, [fetchState.monthData, monthKey, db, cryptoKey])

  return {
    saving: fetchState.monthData?.saving ?? 0,
    adjustment: fetchState.monthData?.adjustment ?? 0,
    budget: fetchState.monthData?.budget ?? 0,
    loading,
    error: fetchState.error,
    setSaving,
    setAdjustment,
    setBudget,
  }
}
