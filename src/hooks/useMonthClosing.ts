import { useState, useEffect, useCallback } from 'react'
import { readMonth, writeMonth, writeMonths } from '../lib/db'
import { closeMonth, reopenMonth, monthBalance, emptyMonth } from '../lib/closing'
import { nextMonthKey } from '../lib/months'
import { userMessage } from '../lib/errorMessages'
import { useSession } from './useSession'
import { useMonthRevision } from './useMonthRevision'
import type { MonthClosing, MonthData } from '../types'

export type UseMonthClosingResult = {
  closing: MonthClosing | null
  balance: number      // current BRL balance — what closing now would carry forward
  nextKey: string
  loading: boolean
  error: string | null
  close: () => Promise<void>
  reopen: () => Promise<void>
}

type FetchState = {
  resolvedKey: string | null
  monthData: MonthData | null
  error: string | null
}

async function readOrEmpty(db: IDBDatabase, monthKey: string, cryptoKey: CryptoKey): Promise<MonthData> {
  try {
    return await readMonth(db, monthKey, cryptoKey)
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) return emptyMonth(monthKey)
    throw err
  }
}

export function useMonthClosing(monthKey: string): UseMonthClosingResult {
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

    readOrEmpty(db, monthKey, cryptoKey)
      .then((data) => {
        if (!cancelled) setFetchState({ resolvedKey: monthKey, monthData: data, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFetchState({ resolvedKey: monthKey, monthData: null, error: userMessage(err, 'Failed to load month') })
        }
      })

    return () => { cancelled = true }
  }, [monthKey, db, cryptoKey, revision])

  const loading = !db || !cryptoKey || fetchState.resolvedKey !== monthKey

  // Both actions re-read from the DB instead of trusting cached state, so they never
  // overwrite edits made through another hook.
  const close = useCallback(async () => {
    if (!db || !cryptoKey) throw new Error('Session not active')
    const [current, next] = await Promise.all([
      readOrEmpty(db, monthKey, cryptoKey),
      readOrEmpty(db, nextMonthKey(monthKey), cryptoKey),
    ])
    const result = closeMonth(current, next, new Date().toISOString())
    await writeMonths(db, [result.current, result.next], cryptoKey)
    setFetchState({ resolvedKey: monthKey, monthData: result.current, error: null })
  }, [monthKey, db, cryptoKey])

  const reopen = useCallback(async () => {
    if (!db || !cryptoKey) throw new Error('Session not active')
    const reopened = reopenMonth(await readOrEmpty(db, monthKey, cryptoKey))
    await writeMonth(db, monthKey, reopened, cryptoKey)
    setFetchState({ resolvedKey: monthKey, monthData: reopened, error: null })
  }, [monthKey, db, cryptoKey])

  return {
    closing: fetchState.monthData?.closing ?? null,
    balance: fetchState.monthData ? monthBalance(fetchState.monthData) : 0,
    nextKey: nextMonthKey(monthKey),
    loading,
    error: fetchState.error,
    close,
    reopen,
  }
}
