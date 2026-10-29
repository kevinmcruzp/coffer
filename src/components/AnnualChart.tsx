import { MONTH_ABBR } from '../lib/months'

export type ChartColumn = {
  /** Zero-based month index. */
  index: number
  /** Balance for the month, or null when the month has no data at all. */
  value: number | null
}

type Props = {
  columns: ChartColumn[]
  /** Compact formatter used for the two direct labels and the hover tooltips. */
  format: (value: number) => string
  onSelect: (index: number) => void
}

const PLOT_H = 144
const LABEL_H = 16
const MIN_BAR_H = 2

// Diverging column chart: sign is carried by position (above/below the zero
// baseline) as well as hue, so it stays readable for red-green colour blindness.
export function AnnualChart({ columns, format, onSelect }: Props) {
  const values = columns.filter(c => c.value !== null).map(c => c.value!)
  if (values.length === 0) return null

  const maxPos = Math.max(0, ...values)
  const maxNeg = Math.max(0, ...values.map(v => -v))
  // One scale for both halves; each half gets only the height its data needs,
  // so an all-positive year spends no space below the baseline.
  const span = maxPos + maxNeg
  const scale = PLOT_H / (span || 1)
  // A year that breaks even every month has no span to divide — centre the line
  // rather than pinning it to the top with dead space underneath.
  const posArea = span === 0 ? PLOT_H / 2 : Math.round(maxPos * scale)
  const negArea = PLOT_H - posArea

  const best = values.reduce((a, b) => Math.max(a, b))
  const worst = values.reduce((a, b) => Math.min(a, b))
  // Label the extremes only — a value on every column goes unread.
  const labelled = new Set<number>()
  for (const col of columns) {
    if (col.value === best || col.value === worst) labelled.add(col.index)
  }

  return (
    <figure className="space-y-2">
      <figcaption className="text-[11px] text-faint uppercase tracking-[0.1em]">Balance by month</figcaption>

      <div className="relative">
        <div className="flex gap-1">
          {columns.map(col => {
            const value = col.value
            const has = value !== null
            const positive = has && value >= 0
            const height = has && value !== 0
              ? Math.max(Math.round(Math.abs(value) * scale), MIN_BAR_H)
              : 0
            const showLabel = has && labelled.has(col.index)
            const name = MONTH_ABBR[col.index]
            const text = has ? `${name}: ${format(value)}` : `${name}: no data`

            return (
              <button
                key={col.index}
                type="button"
                onClick={() => onSelect(col.index)}
                disabled={!has}
                title={text}
                aria-label={text}
                className="flex-1 flex flex-col items-center rounded-md enabled:hover:bg-panel-2 disabled:cursor-default transition-colors"
              >
                <span
                  className="text-[10px] text-dim tabular-nums leading-4 truncate max-w-full"
                  style={{ height: LABEL_H }}
                >
                  {showLabel && positive ? format(value) : ''}
                </span>

                <span className="w-full flex items-end justify-center" style={{ height: posArea }}>
                  {has && positive && height > 0 && (
                    <span className="w-full max-w-6 bg-pos rounded-t" style={{ height }} />
                  )}
                </span>

                <span className="w-full flex items-start justify-center" style={{ height: negArea }}>
                  {has && !positive && (
                    <span className="w-full max-w-6 bg-neg rounded-b" style={{ height }} />
                  )}
                </span>

                <span
                  className="text-[10px] text-dim tabular-nums leading-4 truncate max-w-full"
                  style={{ height: LABEL_H }}
                >
                  {showLabel && !positive ? format(value) : ''}
                </span>

                <span className={`text-[10px] leading-4 ${has ? 'text-dim' : 'text-faint'}`}>{name}</span>
              </button>
            )
          })}
        </div>

        {/* One unbroken zero line across the plot — drawing it per column leaves
            a gap wherever the columns are spaced. */}
        <span
          className="absolute inset-x-0 h-px bg-line pointer-events-none"
          style={{ top: LABEL_H + posArea }}
        />
      </div>
    </figure>
  )
}
