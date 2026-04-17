type Slice = { label: string; value: number; color: string }

type Props = {
  slices: Slice[]
  title?: string
}

const CX = 50
const CY = 50
const R = 40

function arcPath(startDeg: number, endDeg: number): string {
  const toRad = (d: number) => (d * Math.PI) / 180
  const x1 = CX + R * Math.cos(toRad(startDeg))
  const y1 = CY + R * Math.sin(toRad(startDeg))
  const x2 = CX + R * Math.cos(toRad(endDeg))
  const y2 = CY + R * Math.sin(toRad(endDeg))
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${CX} ${CY} L ${x1.toFixed(3)} ${y1.toFixed(3)} A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} Z`
}

export function PieChart({ slices, title }: Props) {
  const total = slices.reduce((s, x) => s + x.value, 0)

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-1">
        {title && <p className="text-xs text-gray-500">{title}</p>}
        <svg viewBox="0 0 100 100" className="w-24 h-24">
          <circle cx={CX} cy={CY} r={R} fill="#1f2937" />
          <text x={CX} y={CY + 4} textAnchor="middle" fontSize={8} fill="#6b7280">No data</text>
        </svg>
      </div>
    )
  }

  const active = slices.filter(s => s.value > 0)
  const paths = active.reduce<Array<Slice & { start: number; end: number; sweep: number }>>(
    (acc, s) => {
      const sweep = (s.value / total) * 360
      const start = acc.length === 0 ? -90 : acc[acc.length - 1].end
      const end = start + sweep
      acc.push({ ...s, start, end, sweep })
      return acc
    },
    [],
  )

  return (
    <div className="flex flex-col items-center gap-1">
      {title && <p className="text-xs text-gray-500">{title}</p>}
      <svg viewBox="0 0 100 100" className="w-24 h-24">
        {paths.map(p =>
          p.sweep >= 359.9 ? (
            <circle key={p.label} cx={CX} cy={CY} r={R} fill={p.color}>
              <title>{p.label}: {p.value.toFixed(2)}</title>
            </circle>
          ) : (
            <path key={p.label} d={arcPath(p.start, p.end)} fill={p.color}>
              <title>{p.label}: {p.value.toFixed(2)}</title>
            </path>
          )
        )}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {active.map(s => (
          <span key={s.label} className="flex items-center gap-1 text-xs text-gray-400">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  )
}
