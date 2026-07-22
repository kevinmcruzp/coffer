import type { UseCurrentMonthResult } from '../hooks/useCurrentMonth'
import { ChevronLeftIcon, ChevronRightIcon } from './Icons'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

type Props = Pick<UseCurrentMonthResult, 'monthKey' | 'canGoBack' | 'goBack' | 'goForward'>

export function MonthNavigator({ monthKey, canGoBack, goBack, goForward }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={goBack}
        disabled={!canGoBack}
        aria-label="Previous month"
        className="w-8 h-8 grid place-items-center rounded-lg border border-line text-dim hover:text-fg hover:border-brass disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeftIcon className="w-4 h-4" />
      </button>
      <span className="font-serif text-lg font-semibold min-w-[9rem] text-center">
        {formatMonthKey(monthKey)}
      </span>
      <button
        onClick={goForward}
        aria-label="Next month"
        className="w-8 h-8 grid place-items-center rounded-lg border border-line text-dim hover:text-fg hover:border-brass transition-colors"
      >
        <ChevronRightIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
