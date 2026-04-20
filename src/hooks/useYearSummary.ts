import { useState, useEffect } from 'react'
import { listMonths, readMonth } from '../lib/db'
import { userMessage } from '../lib/errorMessages'
import { useSession } from './useSession'
import { CURRENCIES } from '../types'
import type { Currency } from '../types'

export type MonthRow = {
  monthKey: string
  income: Record<Currency, number>
  debit: Record<Currency, number>
  credit: Record<Currency, number>
  saving: number
  adjustment: number
  balance: Record<Currency, number>
  prevBalance: Record<Currency, number> | null
}

export type YearTotals = {
  income: Record<Currency, number>
  debit: Record<Currency, number>
  credit: Record<Currency, number>
  saving: number
  adjustment: number
  balance: Record<Currency, number>
}

export type UseYearSummaryResult = {
  rows: MonthRow[]
  totals: YearTotals
  loading: boolean
  error: string | null
  warning: string | null
}

function zeroCurrencyMap(): Record<Currency, number> {
  const result = {} as Record<Currency, number>
  for (const c of CURRENCIES) result[c] = 0
  return result
}

function computeBalance(
  income: Record<Currency, number>,
  debit: Record<Currency, number>,
  credit: Record<Currency, number>,
  saving: number,
  adjustment: number,
): Record<Currency, number> {
  const result = zeroCurrencyMap()
  for (const c of CURRENCIES) {
    result[c] = income[c] - debit[c] - credit[c]
  }
  // saving and adjustment apply only to BRL
  result.BRL -= saving
  result.BRL += adjustment
  return result
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
      const allKeys = await listMonths(db!)
      const yearKeys = allKeys.filter(k => k.startsWith(`${year}-`)).sort()
      const prevYearKeys = allKeys.filter(k => k.startsWith(`${year - 1}-`))

      // build prev-year balance map keyed by month suffix (e.g. "03")
      const prevBalances: Record<string, Record<Currency, number>> = {}
      for (const k of prevYearKeys) {
        try {
          const data = await readMonth(db!, k, cryptoKey!)
          const inc = zeroCurrencyMap()
          for (const i of data.incomes) inc[i.currency] += i.amount
          const deb = zeroCurrencyMap()
          const crd = zeroCurrencyMap()
          for (const e of data.expenses) { deb[e.currency] += e.debit; crd[e.currency] += e.credit }
          const suffix = k.split('-')[1]
          prevBalances[suffix] = computeBalance(inc, deb, crd, data.saving, data.adjustment)
        } catch { /* skip */ }
      }

      const result: MonthRow[] = []
      const failed: string[] = []

      for (const monthKey of yearKeys) {
        try {
          const data = await readMonth(db!, monthKey, cryptoKey!)

          const income = zeroCurrencyMap()
          for (const i of data.incomes) income[i.currency] += i.amount

          const debit = zeroCurrencyMap()
          const credit = zeroCurrencyMap()
          for (const e of data.expenses) {
            debit[e.currency] += e.debit
            credit[e.currency] += e.credit
          }

          const suffix = monthKey.split('-')[1]
          result.push({
            monthKey,
            income,
            debit,
            credit,
            saving: data.saving,
            adjustment: data.adjustment,
            balance: computeBalance(income, debit, credit, data.saving, data.adjustment),
            prevBalance: prevBalances[suffix] ?? null,
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

  const totals: YearTotals = rows.reduce<YearTotals>(
    (acc, row) => {
      for (const c of CURRENCIES) {
        acc.income[c] += row.income[c]
        acc.debit[c] += row.debit[c]
        acc.credit[c] += row.credit[c]
      }
      acc.saving += row.saving
      acc.adjustment += row.adjustment
      return acc
    },
    {
      income: zeroCurrencyMap(),
      debit: zeroCurrencyMap(),
      credit: zeroCurrencyMap(),
      saving: 0,
      adjustment: 0,
      balance: zeroCurrencyMap(),
    },
  )

  totals.balance = computeBalance(totals.income, totals.debit, totals.credit, totals.saving, totals.adjustment)

  return { rows, totals, loading, error, warning }
}
