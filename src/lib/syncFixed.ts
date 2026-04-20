import { round2 } from './math'
import type { Expense, MonthData } from '../types'

/**
 * Returns expenses from `prev` that should propagate into `current` but aren't there yet.
 * An expense propagates when either:
 *   - it's marked `fixed: true` and has no installments (recurring), or
 *   - it has `installments > 1` (mid-installment, parcels left to pay).
 *
 * Comparison is by name + category (case-insensitive name). Two expenses with the same
 * name but different currencies are treated as distinct (currency is copied, not matched).
 * Returned expenses have `fixed: false` — the output represents "expenses to add now",
 * not a template; the recipient month decides recurrence on the next forward navigation.
 * For installment items, `installments` is decremented by 1.
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
    .map(e => {
      const next: Omit<Expense, 'id'> = {
        name: e.name,
        category: e.category,
        currency: e.currency,
        debit: round2(e.debit),
        credit: round2(e.credit),
        fixed: false,
      }
      if (e.installments !== undefined && e.installments > 1) {
        next.installments = e.installments - 1
      }
      return next
    })
}
