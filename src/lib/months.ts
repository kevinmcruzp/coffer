// Calendar labels and navigation bounds shared by the month/year navigators
// and the annual ledger.

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// Lowest year any navigator can reach.
export const MIN_YEAR = 2000

// Highest year the pickers offer — one ahead of today, so next year can be planned.
export function maxYear(): number {
  return new Date().getFullYear() + 1
}

// "2026-03" → 2 (zero-based, for indexing MONTH_NAMES/MONTH_ABBR).
export function monthIndex(monthKey: string): number {
  return parseInt(monthKey.split('-')[1], 10) - 1
}

// "2026-03" → 2026
export function yearOf(monthKey: string): number {
  return parseInt(monthKey.split('-')[0], 10)
}

// (2026, 2) → "2026-03"
export function monthKeyOf(year: number, index: number): string {
  return `${year}-${String(index + 1).padStart(2, '0')}`
}
