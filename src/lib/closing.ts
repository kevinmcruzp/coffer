// Month closing: freezes a month and carries its balance into the next month as a
// linked income entry (`carryFrom`). Pure functions — persistence lives in useMonthClosing.

import { round2 } from './math'
import { AppError } from './appError'
import { nextMonthKey, shortMonthLabel } from './months'
import type { Income, MonthData } from '../types'

export function emptyMonth(key: string): MonthData {
  return { key, expenses: [], incomes: [], saving: 0, adjustment: 0, budget: 0 }
}

// Balance: income − debit − credit − saving + adjustment (same formula as the Summary).
export function monthBalance(month: MonthData): number {
  const income = month.incomes.reduce((sum, i) => sum + i.amount, 0)
  const spent = month.expenses.reduce((sum, e) => sum + e.debit + e.credit, 0)
  return round2(income - spent - month.saving + month.adjustment)
}

export function assertMonthOpen(month: MonthData): void {
  if (month.closing) throw new AppError('error.monthClosed')
}

export function closeMonth(
  current: MonthData,
  next: MonthData,
  closedAt: string,
): { current: MonthData; next: MonthData } {
  if (current.closing) throw new AppError('error.alreadyClosed', { month: { month: current.key } })
  if (next.key !== nextMonthKey(current.key)) {
    throw new Error(`${next.key} does not follow ${current.key}`)
  }
  if (next.closing) {
    throw new AppError('error.nextMonthClosed', { month: { month: next.key } })
  }

  const balance = monthBalance(current)
  const existing = next.incomes.find(i => i.carryFrom === current.key)
  const others = next.incomes.filter(i => i.carryFrom !== current.key)
  const carry: Income | null = balance === 0 ? null : {
    id: existing?.id ?? crypto.randomUUID(),
    // Stored text for the record; the ledger shows it translated from `carryFrom`.
    source: `Balance from ${shortMonthLabel(current.key, 'en-US')}`,
    amount: balance,
    carryFrom: current.key,
  }

  return {
    current: { ...current, closing: { balance, closedAt } },
    next: { ...next, incomes: carry ? [carry, ...others] : others },
  }
}

// Unfreezes the month. The carry entry stays in the next month; closing again updates it.
export function reopenMonth(current: MonthData): MonthData {
  if (!current.closing) throw new AppError('error.notClosed', { month: { month: current.key } })
  const open: MonthData = { ...current }
  delete open.closing
  return open
}
