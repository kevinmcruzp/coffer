import { useState } from 'react'
import type { UseCurrentMonthResult } from '../hooks/useCurrentMonth'
import { useLocale } from '../hooks/useLocale'
import { MIN_YEAR, monthIndex, monthKeyOf, yearOf } from '../lib/months'
import { ChevronLeftIcon, ChevronRightIcon } from './Icons'
import { Popover } from './Popover'
import { PickerPanel } from './PickerPanel'

const ARROW = 'w-8 h-8 grid place-items-center rounded-lg border border-line text-dim hover:text-fg hover:border-brass disabled:opacity-30 disabled:cursor-not-allowed transition-colors'

// Mounted fresh on every open (see Popover), so the browsed year always starts
// on the active month's year.
function MonthGrid({ year, month, onSelect }: { year: number; month: number; onSelect: (key: string) => void }) {
  const [viewYear, setViewYear] = useState(year)
  const { t, monthName, monthAbbr } = useLocale()
  const now = new Date()

  return (
    <PickerPanel
      title={String(viewYear)}
      prevLabel={t('picker.previousYear')}
      nextLabel={t('picker.nextYear')}
      onPrev={() => setViewYear(y => Math.max(MIN_YEAR, y - 1))}
      onNext={() => setViewYear(y => y + 1)}
      prevDisabled={viewYear <= MIN_YEAR}
      cells={Array.from({ length: 12 }, (_, i) => ({
        key: String(i),
        label: monthAbbr(i),
        ariaLabel: monthName(i),
        selected: viewYear === year && i === month,
        current: viewYear === now.getFullYear() && i === now.getMonth(),
        onSelect: () => onSelect(monthKeyOf(viewYear, i)),
      }))}
    />
  )
}

type Props = Pick<UseCurrentMonthResult, 'monthKey' | 'canGoBack' | 'goBack' | 'goForward' | 'goTo'>

export function MonthNavigator({ monthKey, canGoBack, goBack, goForward, goTo }: Props) {
  const year = yearOf(monthKey)
  const month = monthIndex(monthKey)
  const { t, monthLabel } = useLocale()

  return (
    <div className="flex items-center gap-2">
      <button onClick={goBack} disabled={!canGoBack} aria-label={t('picker.previousMonth')} className={ARROW}>
        <ChevronLeftIcon className="w-4 h-4" />
      </button>

      <Popover
        label={t('picker.selectMonth')}
        trigger={monthLabel(monthKey)}
        triggerClassName="font-serif text-lg font-semibold min-w-36 text-center px-2 py-1 rounded-lg text-fg hover:bg-panel-2 hover:text-brass transition-colors"
        panelClassName="w-64"
      >
        {close => (
          <MonthGrid
            year={year}
            month={month}
            onSelect={key => { goTo(key); close() }}
          />
        )}
      </Popover>

      <button onClick={goForward} aria-label={t('picker.nextMonth')} className={ARROW}>
        <ChevronRightIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
