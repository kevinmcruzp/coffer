// Month closing: freezes a month and carries its BRL balance into the next month as a
// linked income entry (`carryFrom`). Pure functions — persistence lives in useMonthClosing.

import { round2 } from './math'
import { nextMonthKey, shortMonthLabel } from './months'
import type { Income, MonthData } from '../types'

export const CLOSED_MONTH_MESSAGE = 'This month is closed. Reopen it to make changes.'

export function emptyMonth(key: string): MonthData {
  return { key, expenses: [], incomes: [], saving: 0, adjustment: 0, budget: 0 }
}

// BRL balance: income − debit − credit − saving + adjustment (same formula as the Summary).
export function monthBalance(month: MonthData): number {
  const income = month.incomes
    .filter(i => i.currency === 'BRL')
    .reduce((sum, i) => sum + i.amount, 0)
  const spent = month.expenses
    .filter(e => e.currency === 'BRL')
    .reduce((sum, e) => sum + e.debit + e.credit, 0)
  return round2(income - spent - month.saving + month.adjustment)
}

export function assertMonthOpen(month: MonthData): void {
  if (month.closing) throw new Error(CLOSED_MONTH_MESSAGE)
}

export function closeMonth(
  current: MonthData,
  next: MonthData,
  closedAt: string,
): { current: MonthData; next: MonthData } {
  if (current.closing) throw new Error(`${shortMonthLabel(current.key)} is already closed`)
  if (next.key !== nextMonthKey(current.key)) {
    throw new Error(`${next.key} does not follow ${current.key}`)
  }
  if (next.closing) {
    throw new Error(`${shortMonthLabel(next.key)} is closed. Reopen ${shortMonthLabel(next.key)} first.`)
  }

  const balance = monthBalance(current)
  const existing = next.incomes.find(i => i.carryFrom === current.key)
  const others = next.incomes.filter(i => i.carryFrom !== current.key)
  const carry: Income | null = balance === 0 ? null : {
    id: existing?.id ?? crypto.randomUUID(),
    source: `Balance from ${shortMonthLabel(current.key)}`,
    currency: 'BRL',
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
  if (!current.closing) throw new Error(`${shortMonthLabel(current.key)} is not closed`)
  const open: MonthData = { ...current }
  delete open.closing
  return open
}
