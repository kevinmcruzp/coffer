import type { Expense, MonthData } from '../types'

/**
 * Returns expenses from `prev` that should propagate into `current` but aren't there yet.
 * An expense propagates when either:
 *   - it's marked `fixed: true` and has no installments (recurring), or
 *   - it has `installments > 1` (mid-installment, parcels left to pay).
 *
 * Comparison is by name + category (case-insensitive name).
 * Returned expenses have `fixed: false` — propagation is driven by the rules above,
 * not by the flag itself. For installment items, `installments` is decremented by 1.
 */
export function syncFixed(prev: MonthData, current: MonthData): Omit<Expense, 'id'>[] {
  const existingKeys = new Set(
    current.expenses.map(e => `${e.name.toLowerCase()}::${e.category}`),
  )

  return prev.expenses
    .filter(e => {
      if (e.installments !== undefined) return e.installments > 1
      return e.fixed
    })
    .filter(e => !existingKeys.has(`${e.name.toLowerCase()}::${e.category}`))
    .map(({ id: _, installments, ...rest }) => {
      const next: Omit<Expense, 'id'> = { ...rest, fixed: false }
      if (installments !== undefined && installments > 1) {
        next.installments = installments - 1
      }
      return next
    })
}
