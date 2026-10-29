import { InfoTip } from './InfoTip'

type Props = {
  label: string
  value: string
  /** Optional context line under the value — an average, a count. */
  sub?: string
  /** Optional explanation shown behind a (?) next to the label. */
  info?: string
  highlight?: 'positive' | 'negative' | 'neutral'
}

const COLORS = {
  positive: 'text-pos',
  negative: 'text-neg',
  neutral: 'text-fg',
}

export function StatCard({ label, value, sub, info, highlight = 'neutral' }: Props) {
  return (
    <div className="relative bg-panel border border-line rounded-xl p-4 space-y-1">
      <span className="absolute inset-x-0 top-0 h-px rounded-t-xl bg-gradient-to-r from-brass/70 to-transparent" />
      <div className="flex items-center gap-1.5">
        <p className="text-[11px] text-faint uppercase tracking-[0.1em]">{label}</p>
        {info && <InfoTip label={label}>{info}</InfoTip>}
      </div>
      <p className={`text-xl font-semibold font-mono tabular-nums ${COLORS[highlight]}`}>{value}</p>
      {sub && <p className="text-[11px] text-faint">{sub}</p>}
    </div>
  )
}
