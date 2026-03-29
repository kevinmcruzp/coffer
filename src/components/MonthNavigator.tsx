import type { UseCurrentMonthResult } from '../hooks/useCurrentMonth'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

type Props = Pick<UseCurrentMonthResult, 'monthKey' | 'goBack' | 'goForward'>

export function MonthNavigator({ monthKey, goBack, goForward }: Props) {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={goBack}
        aria-label="Previous month"
        className="text-gray-400 hover:text-white px-2 py-1"
      >
        ←
      </button>
      <span className="text-white font-medium min-w-40 text-center">
        {formatMonthKey(monthKey)}
      </span>
      <button
        onClick={goForward}
        aria-label="Next month"
        className="text-gray-400 hover:text-white px-2 py-1"
      >
        →
      </button>
    </div>
  )
}
