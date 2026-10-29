import { ChevronLeftIcon, ChevronRightIcon } from './Icons'

export type PickerCell = {
  key: string
  label: string
  /** Full name for screen readers — cells render abbreviations. */
  ariaLabel: string
  selected?: boolean
  /** Marks "today" — rendered as an outline so it never competes with `selected`. */
  current?: boolean
  disabled?: boolean
  onSelect: () => void
}

type Props = {
  /** Page heading — the browsed year, or the browsed year range. */
  title: string
  prevLabel: string
  nextLabel: string
  onPrev: () => void
  onNext: () => void
  prevDisabled?: boolean
  nextDisabled?: boolean
  cells: PickerCell[]
}

const STEPPER = 'w-7 h-7 grid place-items-center rounded-md text-dim hover:text-fg hover:bg-panel-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'

// Shared 4x3 grid used by both the month and the year picker so the two read
// as the same control.
export function PickerPanel({
  title, prevLabel, nextLabel, onPrev, onNext, prevDisabled, nextDisabled, cells,
}: Props) {
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={onPrev} disabled={prevDisabled} aria-label={prevLabel} className={STEPPER}>
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <span className="font-serif text-base font-semibold text-fg tabular-nums">{title}</span>
        <button type="button" onClick={onNext} disabled={nextDisabled} aria-label={nextLabel} className={STEPPER}>
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {cells.map(cell => {
          const style = cell.selected
            ? 'bg-brass text-ink'
            : cell.current
              ? 'text-brass border border-brass/40 hover:bg-panel-2'
              : 'text-dim hover:bg-panel-2 hover:text-fg'
          return (
            <button
              key={cell.key}
              type="button"
              onClick={cell.onSelect}
              disabled={cell.disabled}
              aria-label={cell.ariaLabel}
              aria-current={cell.selected ? 'date' : undefined}
              className={`py-1.5 rounded-md text-sm font-medium tabular-nums transition-colors disabled:opacity-25 disabled:cursor-not-allowed ${style}`}
            >
              {cell.label}
            </button>
          )
        })}
      </div>
    </>
  )
}
