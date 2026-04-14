type Bar = { label: string; value: number }

type Props = {
  bars: Bar[]
  title?: string
}

const W = 240
const H = 80
const BASELINE = 55
const MAX_BAR_H = 45
const LABEL_Y = 72

export function BarChart({ bars, title }: Props) {
  if (bars.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1">
        {title && <p className="text-xs text-gray-500">{title}</p>}
        <p className="text-xs text-gray-600 py-4">No data</p>
      </div>
    )
  }

  const maxAbs = Math.max(...bars.map(b => Math.abs(b.value)), 1)
  const barW = W / bars.length
  const pad = Math.max(barW * 0.12, 1)

  return (
    <div className="flex flex-col gap-1">
      {title && <p className="text-xs text-gray-500 text-center">{title}</p>}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={title ?? 'Bar chart'}>
        {/* baseline */}
        <line x1={0} y1={BASELINE} x2={W} y2={BASELINE} stroke="#374151" strokeWidth={0.5} />
        {bars.map((b, i) => {
          const h = Math.max((Math.abs(b.value) / maxAbs) * MAX_BAR_H, 1)
          const x = i * barW + pad
          const w = barW - 2 * pad
          const positive = b.value >= 0
          const y = positive ? BASELINE - h : BASELINE
          const color = positive ? '#10b981' : '#ef4444'
          return (
            <g key={b.label}>
              <rect x={x} y={y} width={w} height={h} fill={color} rx={1}>
                <title>{b.label}: {b.value.toFixed(2)}</title>
              </rect>
              <text
                x={x + w / 2}
                y={LABEL_Y}
                textAnchor="middle"
                fontSize={5.5}
                fill="#6b7280"
              >
                {b.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
