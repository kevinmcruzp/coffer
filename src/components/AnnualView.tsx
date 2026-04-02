import { useState } from 'react'
import { useYearSummary } from '../hooks/useYearSummary'
import type { MonthRow, YearTotals } from '../hooks/useYearSummary'

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
  onSelect: (key: string) => void
}

function DataRow({ row, showUSD, onSelect }: RowProps) {
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
    </tr>
  )
}

function TotalsRow({ totals, showUSD }: { totals: YearTotals; showUSD: boolean }) {
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
  const currentYear = new Date().getFullYear()

  const showUSD = rows.some(r => r.income.USD > 0 || r.debit.USD > 0 || r.credit.USD > 0)

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
          disabled={year >= currentYear + 1}
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
              <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800">
                <th className="px-3 py-2 text-left font-normal">Month</th>
                <th className="px-3 py-2 text-right font-normal">Income</th>
                <th className="px-3 py-2 text-right font-normal">Debit</th>
                <th className="px-3 py-2 text-right font-normal">Credit</th>
                <th className="px-3 py-2 text-right font-normal">Saving</th>
                <th className="px-3 py-2 text-right font-normal">Adj.</th>
                <th className="px-3 py-2 text-right font-normal">Balance BRL</th>
                {showUSD && <th className="px-3 py-2 text-right font-normal">Balance USD</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <DataRow key={row.monthKey} row={row} showUSD={showUSD} onSelect={onSelectMonth} />
              ))}
            </tbody>
            <tfoot>
              <TotalsRow totals={totals} showUSD={showUSD} />
            </tfoot>
          </table>
          <p className="text-xs text-gray-600 mt-2 text-right">click a row to open that month</p>
        </div>
      )}
    </div>
  )
}
