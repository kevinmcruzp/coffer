import { useState } from 'react'
import { useLocale } from '../hooks/useLocale'
import { MIN_YEAR, maxYear } from '../lib/months'
import { ChevronLeftIcon, ChevronRightIcon } from './Icons'
import { Popover } from './Popover'
import { PickerPanel } from './PickerPanel'

const ARROW = 'w-8 h-8 grid place-items-center rounded-lg border border-line text-dim hover:text-fg hover:border-brass disabled:opacity-30 disabled:cursor-not-allowed transition-colors'

const PAGE_SIZE = 12

// First year of the 12-year page containing `year`, aligned on MIN_YEAR.
function pageStart(year: number): number {
  return MIN_YEAR + Math.floor((year - MIN_YEAR) / PAGE_SIZE) * PAGE_SIZE
}

// Mounted fresh on every open (see Popover), so the browsed page always starts
// on the active year's page.
function YearGrid({ year, max, onSelect }: { year: number; max: number; onSelect: (year: number) => void }) {
  const [start, setStart] = useState(() => pageStart(year))
  const { t } = useLocale()
  const currentYear = new Date().getFullYear()

  return (
    <PickerPanel
      title={`${start}–${start + PAGE_SIZE - 1}`}
      prevLabel={t('picker.previousYears')}
      nextLabel={t('picker.nextYears')}
      onPrev={() => setStart(s => Math.max(MIN_YEAR, s - PAGE_SIZE))}
      onNext={() => setStart(s => s + PAGE_SIZE)}
      prevDisabled={start <= MIN_YEAR}
      nextDisabled={start + PAGE_SIZE > max}
      cells={Array.from({ length: PAGE_SIZE }, (_, i) => {
        const y = start + i
        return {
          key: String(y),
          label: String(y),
          ariaLabel: String(y),
          selected: y === year,
          current: y === currentYear,
          disabled: y > max,
          onSelect: () => onSelect(y),
        }
      })}
    />
  )
}

type Props = {
  year: number
  onChange: (year: number) => void
}

export function YearNavigator({ year, onChange }: Props) {
  const max = maxYear()
  const { t } = useLocale()

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(year - 1)}
        disabled={year <= MIN_YEAR}
        aria-label={t('picker.previousYear')}
        className={ARROW}
      >
        <ChevronLeftIcon className="w-4 h-4" />
      </button>

      <Popover
        label={t('picker.selectYear')}
        trigger={String(year)}
        triggerClassName="font-serif text-lg font-semibold min-w-36 text-center px-2 py-1 rounded-lg text-fg tabular-nums hover:bg-panel-2 hover:text-brass transition-colors"
        panelClassName="w-64"
      >
        {close => (
          <YearGrid
            year={year}
            max={max}
            onSelect={y => { onChange(y); close() }}
          />
        )}
      </Popover>

      <button
        onClick={() => onChange(year + 1)}
        disabled={year >= max}
        aria-label={t('picker.nextYear')}
        className={ARROW}
      >
        <ChevronRightIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
