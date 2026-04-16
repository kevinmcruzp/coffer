import type { Expense, MonthData } from '../types'

/**
 * Returns fixed expenses from `prev` that don't yet exist in `current`.
 * Comparison is by name + category (case-insensitive name).
 * Returned expenses have `fixed: false` — they don't auto-propagate further.
 */
export function syncFixed(prev: MonthData, current: MonthData): Omit<Expense, 'id'>[] {
  const existingKeys = new Set(
    current.expenses.map(e => `${e.name.toLowerCase()}::${e.category}`),
  )

  return prev.expenses
    .filter(e => e.fixed)
    .filter(e => !existingKeys.has(`${e.name.toLowerCase()}::${e.category}`))
    .map(({ id: _, ...rest }) => ({ ...rest, fixed: false }))
}
