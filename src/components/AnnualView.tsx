import { useMemo, useState } from 'react'
import { useYearSummary } from '../hooks/useYearSummary'
import type { MonthRow, YearTotals } from '../hooks/useYearSummary'

// ── Sort ──────────────────────────────────────────────────────────────────────

type AnnualSortCol = 'monthKey' | 'income' | 'debit' | 'credit' | 'saving' | 'balance'
type SortDir = 'asc' | 'desc'

function sortRows(arr: MonthRow[], col: AnnualSortCol, dir: SortDir): MonthRow[] {
  return [...arr].sort((a, b) => {
    let d: number
    if (col === 'monthKey') d = a.monthKey.localeCompare(b.monthKey)
    else if (col === 'income') d = a.income.BRL - b.income.BRL
    else if (col === 'debit') d = a.debit.BRL - b.debit.BRL
    else if (col === 'credit') d = a.credit.BRL - b.credit.BRL
    else if (col === 'saving') d = a.saving - b.saving
    else d = a.balance.BRL - b.balance.BRL
    return dir === 'asc' ? d : -d
  })
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={active ? 'ml-1' : 'ml-1 text-gray-700'}>
      {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthLabel(key: string): string {
  const m = parseInt(key.split('-')[1], 10)
  return MONTH_NAMES[m - 1] ?? key
}

function fmt(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function BalanceCell({ value }: { value: number }) {
  const color = value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-gray-400'
  return <span className={color}>{fmt(value)}</span>
}

type RowProps = {
  row: MonthRow
  showUSD: boolean
  showPrev: boolean
  onSelect: (key: string) => void
}

function TrendCell({ current, prev }: { current: number; prev: number }) {
  const delta = current - prev
  if (delta === 0) return <span className="text-gray-500">—</span>
  const up = delta > 0
  return (
    <span className={up ? 'text-emerald-400' : 'text-red-400'}>
      {up ? '↑' : '↓'} {fmt(Math.abs(delta))}
    </span>
  )
}

function DataRow({ row, showUSD, showPrev, onSelect }: RowProps) {
  return (
    <tr
      className="border-b border-gray-800 hover:bg-gray-900 cursor-pointer transition-colors"
      onClick={() => onSelect(row.monthKey)}
    >
      <td className="px-3 py-2 font-medium text-gray-200">{monthLabel(row.monthKey)}</td>
      <td className="px-3 py-2 text-right text-gray-300">{fmt(row.income.BRL)}</td>
      <td className="px-3 py-2 text-right text-gray-300">{fmt(row.debit.BRL)}</td>
      <td className="px-3 py-2 text-right text-gray-300">{fmt(row.credit.BRL)}</td>
      <td className="px-3 py-2 text-right text-gray-400">{fmt(row.saving)}</td>
      <td className="px-3 py-2 text-right text-gray-400">{fmt(row.adjustment)}</td>
      <td className="px-3 py-2 text-right font-semibold">
        <BalanceCell value={row.balance.BRL} />
      </td>
      {showUSD && (
        <td className="px-3 py-2 text-right font-semibold text-gray-500">
          <BalanceCell value={row.balance.USD} />
        </td>
      )}
      {showPrev && (
        <td className="px-3 py-2 text-right text-sm">
          {row.prevBalance !== null
            ? <TrendCell current={row.balance.BRL} prev={row.prevBalance.BRL} />
            : <span className="text-gray-700">—</span>}
        </td>
      )}
    </tr>
  )
}

function TotalsRow({ totals, showUSD, showPrev }: { totals: YearTotals; showUSD: boolean; showPrev: boolean }) {
  return (
    <tr className="border-t-2 border-gray-700 bg-gray-900">
      <td className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</td>
      <td className="px-3 py-2 text-right font-semibold text-gray-200">{fmt(totals.income.BRL)}</td>
      <td className="px-3 py-2 text-right font-semibold text-gray-200">{fmt(totals.debit.BRL)}</td>
      <td className="px-3 py-2 text-right font-semibold text-gray-200">{fmt(totals.credit.BRL)}</td>
      <td className="px-3 py-2 text-right font-semibold text-gray-400">{fmt(totals.saving)}</td>
      <td className="px-3 py-2 text-right font-semibold text-gray-400">{fmt(totals.adjustment)}</td>
      <td className="px-3 py-2 text-right font-semibold">
        <BalanceCell value={totals.balance.BRL} />
      </td>
      {showUSD && (
        <td className="px-3 py-2 text-right font-semibold">
          <BalanceCell value={totals.balance.USD} />
        </td>
      )}
      {showPrev && <td />}
    </tr>
  )
}

type Props = {
  currentYear: number
  onSelectMonth: (key: string) => void
}

export function AnnualView({ currentYear, onSelectMonth }: Props) {
  const [year, setYear] = useState(currentYear)
  const { rows, totals, loading, error, warning } = useYearSummary(year)
  const currentYearValue = new Date().getFullYear()
  const [sortCol, setSortCol] = useState<AnnualSortCol>('monthKey')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(col: AnnualSortCol) {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sortedRows = useMemo(() => sortRows(rows, sortCol, sortDir), [rows, sortCol, sortDir])
  const showUSD = rows.some(r => r.income.USD > 0 || r.debit.USD > 0 || r.credit.USD > 0)
  const showPrev = rows.some(r => r.prevBalance !== null)

  return (
    <div className="space-y-4">
      {/* Year selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setYear(y => y - 1)}
          disabled={year <= 2000}
          className="text-gray-400 hover:text-white px-2 py-1 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous year"
        >
          ←
        </button>
        <span className="text-white font-semibold w-16 text-center">{year}</span>
        <button
          onClick={() => setYear(y => y + 1)}
          disabled={year >= currentYearValue + 1}
          className="text-gray-400 hover:text-white px-2 py-1 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next year"
        >
          →
        </button>
      </div>

      {loading && (
        <div className="text-gray-400 text-sm text-center py-12">Loading…</div>
      )}

      {error && (
        <div className="text-red-400 text-sm text-center py-8">{error}</div>
      )}

      {warning && (
        <div className="text-yellow-400 text-xs px-1 py-2">{warning}</div>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-12">No data for {year}.</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800 select-none">
                <th
                  className="px-3 py-2 text-left font-normal cursor-pointer hover:text-gray-300"
                  onClick={() => toggleSort('monthKey')}
                >
                  Month <SortIndicator active={sortCol === 'monthKey'} dir={sortDir} />
                </th>
                <th
                  className="px-3 py-2 text-right font-normal cursor-pointer hover:text-gray-300"
                  onClick={() => toggleSort('income')}
                >
                  Income <SortIndicator active={sortCol === 'income'} dir={sortDir} />
                </th>
                <th
                  className="px-3 py-2 text-right font-normal cursor-pointer hover:text-gray-300"
                  onClick={() => toggleSort('debit')}
                >
                  Debit <SortIndicator active={sortCol === 'debit'} dir={sortDir} />
                </th>
                <th
                  className="px-3 py-2 text-right font-normal cursor-pointer hover:text-gray-300"
                  onClick={() => toggleSort('credit')}
                >
                  Credit <SortIndicator active={sortCol === 'credit'} dir={sortDir} />
                </th>
                <th
                  className="px-3 py-2 text-right font-normal cursor-pointer hover:text-gray-300"
                  onClick={() => toggleSort('saving')}
                >
                  Saving <SortIndicator active={sortCol === 'saving'} dir={sortDir} />
                </th>
                <th className="px-3 py-2 text-right font-normal">Adj.</th>
                <th
                  className="px-3 py-2 text-right font-normal cursor-pointer hover:text-gray-300"
                  onClick={() => toggleSort('balance')}
                >
                  Balance BRL <SortIndicator active={sortCol === 'balance'} dir={sortDir} />
                </th>
                {showUSD && <th className="px-3 py-2 text-right font-normal">Balance USD</th>}
                {showPrev && <th className="px-3 py-2 text-right font-normal text-gray-600">vs prev yr</th>}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(row => (
                <DataRow key={row.monthKey} row={row} showUSD={showUSD} showPrev={showPrev} onSelect={onSelectMonth} />
              ))}
            </tbody>
            <tfoot>
              <TotalsRow totals={totals} showUSD={showUSD} showPrev={showPrev} />
            </tfoot>
          </table>
          <p className="text-xs text-gray-600 mt-2 text-right">click a row to open that month</p>
        </div>
      )}
    </div>
  )
}
