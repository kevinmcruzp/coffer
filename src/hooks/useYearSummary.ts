import { useState, useEffect } from 'react'
import { listMonths, readMonth } from '../lib/db'
import { useSession } from './useSession'
import type { Currency } from '../types'

export type MonthRow = {
  monthKey: string
  income: Record<Currency, number>
  debit: Record<Currency, number>
  credit: Record<Currency, number>
  saving: number
  adjustment: number
  balance: Record<Currency, number>
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
}

const CURRENCIES: Currency[] = ['BRL', 'USD']

function zeroCurrencyMap(): Record<Currency, number> {
  return { BRL: 0, USD: 0 }
}

function computeBalance(
  income: Record<Currency, number>,
  debit: Record<Currency, number>,
  credit: Record<Currency, number>,
  saving: number,
  adjustment: number,
): Record<Currency, number> {
  return {
    BRL: income.BRL - debit.BRL - credit.BRL - saving + adjustment,
    USD: income.USD - debit.USD - credit.USD,
  }
}

export function useYearSummary(year: number): UseYearSummaryResult {
  const { state, db } = useSession()
  const cryptoKey = state.status === 'unlocked' ? state.key : null

  const [rows, setRows] = useState<MonthRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!db || !cryptoKey) return

    setLoading(true)
    setError(null)

    async function load() {
      const allKeys = await listMonths(db!)
      const yearKeys = allKeys
        .filter(k => k.startsWith(`${year}-`))
        .sort()

      const result: MonthRow[] = []

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

          result.push({
            monthKey,
            income,
            debit,
            credit,
            saving: data.saving,
            adjustment: data.adjustment,
            balance: computeBalance(income, debit, credit, data.saving, data.adjustment),
          })
        } catch {
          // skip months that fail to decrypt
        }
      }

      setRows(result)
      setLoading(false)
    }

    load().catch(err => {
      setError(err instanceof Error ? err.message : String(err))
      setLoading(false)
    })
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

  return { rows, totals, loading, error }
}
