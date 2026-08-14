import { useEffect, useRef, useState } from 'react'
import type { UseCurrentMonthResult } from '../hooks/useCurrentMonth'
import { ChevronLeftIcon, ChevronRightIcon } from './Icons'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// Lowest year navigation can reach (mirrors canGoBack: year > 2000 in useCurrentMonth).
const MIN_YEAR = 2000

type Props = Pick<UseCurrentMonthResult, 'monthKey' | 'canGoBack' | 'goBack' | 'goForward' | 'goTo'>

export function MonthNavigator({ monthKey, canGoBack, goBack, goForward, goTo }: Props) {
  const [year, month] = monthKey.split('-').map(Number)
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(year)
  const ref = useRef<HTMLDivElement>(null)

  function toggle() {
    // Reset the browsed year to the active month each time the picker opens.
    if (!open) setViewYear(year)
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function selectMonth(index: number) {
    goTo(`${viewYear}-${String(index + 1).padStart(2, '0')}`)
    setOpen(false)
  }

  const now = new Date()

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

      <div ref={ref} className="relative">
        <button
          onClick={toggle}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="font-serif text-lg font-semibold min-w-[9rem] text-center px-2 py-1 rounded-lg text-fg hover:bg-panel-2 hover:text-brass transition-colors"
        >
          {MONTH_NAMES[month - 1]} {year}
        </button>

        {open && (
          <div
            role="dialog"
            aria-label="Select month"
            className="absolute z-30 top-full left-1/2 -translate-x-1/2 mt-2 w-64 rounded-xl border border-line bg-panel p-3 shadow-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setViewYear(y => Math.max(MIN_YEAR, y - 1))}
                disabled={viewYear <= MIN_YEAR}
                aria-label="Previous year"
                className="w-7 h-7 grid place-items-center rounded-md text-dim hover:text-fg hover:bg-panel-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="font-serif text-base font-semibold text-fg tabular-nums">{viewYear}</span>
              <button
                onClick={() => setViewYear(y => y + 1)}
                aria-label="Next year"
                className="w-7 h-7 grid place-items-center rounded-md text-dim hover:text-fg hover:bg-panel-2 transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {MONTH_ABBR.map((abbr, i) => {
                const isSelected = viewYear === year && i === month - 1
                const isCurrent = viewYear === now.getFullYear() && i === now.getMonth()
                const base = 'py-1.5 rounded-md text-sm font-medium transition-colors'
                const style = isSelected
                  ? 'bg-brass text-ink'
                  : isCurrent
                    ? 'text-brass border border-brass/40 hover:bg-panel-2'
                    : 'text-dim hover:bg-panel-2 hover:text-fg'
                return (
                  <button
                    key={abbr}
                    onClick={() => selectMonth(i)}
                    aria-label={MONTH_NAMES[i]}
                    aria-current={isSelected ? 'date' : undefined}
                    className={`${base} ${style}`}
                  >
                    {abbr}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

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
