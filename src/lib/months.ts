// Calendar labels and navigation bounds shared by the month/year navigators
// and the annual ledger. Labels take an Intl locale tag (see lib/i18n.ts).

// Lowest year any navigator can reach.
export const MIN_YEAR = 2000

// Highest year the pickers offer — one ahead of today, so next year can be planned.
export function maxYear(): number {
  return new Date().getFullYear() + 1
}

// "2026-03" → 2 (zero-based month index).
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

// "2026-12" → "2027-01"
export function nextMonthKey(monthKey: string): string {
  const index = monthIndex(monthKey)
  return index === 11 ? monthKeyOf(yearOf(monthKey) + 1, 0) : monthKeyOf(yearOf(monthKey), index + 1)
}

// Month names stand alone as labels here, so they start upper-case in every language.
function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1)
}

function formatMonth(index: number, locale: string, month: 'long' | 'short'): string {
  return new Intl.DateTimeFormat(locale, { month, timeZone: 'UTC' }).format(Date.UTC(2000, index, 1))
}

// (2, 'en-US') → "March", (2, 'pt-BR') → "Março"
export function monthName(index: number, locale: string): string {
  return capitalize(formatMonth(index, locale, 'long'))
}

// (2, 'en-US') → "Mar", (10, 'pt-BR') → "Nov" — without the abbreviation dot some locales add.
export function monthAbbr(index: number, locale: string): string {
  return capitalize(formatMonth(index, locale, 'short').replace(/\.$/, ''))
}

// ("2026-10", 'en-US') → "Oct 2026"
export function shortMonthLabel(monthKey: string, locale: string): string {
  return `${monthAbbr(monthIndex(monthKey), locale)} ${yearOf(monthKey)}`
}

// ("2026-10", 'en-US') → "October 2026"
export function monthLabel(monthKey: string, locale: string): string {
  return `${monthName(monthIndex(monthKey), locale)} ${yearOf(monthKey)}`
}
