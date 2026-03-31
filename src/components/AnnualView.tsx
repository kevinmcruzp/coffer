import { useState } from 'react'
import { useYearSummary } from '../hooks/useYearSummary'
import type { MonthRow, YearTotals } from '../hooks/useYearSummary'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function monthLabel(key: string): string {
  const m = parseInt(key.split('-')[1], 10)
  return MONTH_NAMES[m - 1] ?? key
}

function fmtBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function BalanceCell({ value }: { value: number }) {
  const color = value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-gray-400'
  return <span className={color}>{fmtBRL(value)}</span>
}

type RowProps = {
  row: MonthRow
  onSelect: (key: string) => void
}

function DataRow({ row, onSelect }: RowProps) {
  return (
    <tr
      className="border-b border-gray-800 hover:bg-gray-900 cursor-pointer transition-colors"
      onClick={() => onSelect(row.monthKey)}
    >
      <td className="px-3 py-2 font-medium text-gray-200">{monthLabel(row.monthKey)}</td>
      <td className="px-3 py-2 text-right text-gray-300">{fmtBRL(row.income.BRL)}</td>
      <td className="px-3 py-2 text-right text-gray-300">{fmtBRL(row.debit.BRL)}</td>
      <td className="px-3 py-2 text-right text-gray-300">{fmtBRL(row.credit.BRL)}</td>
      <td className="px-3 py-2 text-right text-gray-400">{fmtBRL(row.saving)}</td>
      <td className="px-3 py-2 text-right text-gray-400">{fmtBRL(row.adjustment)}</td>
      <td className="px-3 py-2 text-right font-semibold">
        <BalanceCell value={row.balance.BRL} />
      </td>
    </tr>
  )
}

function TotalsRow({ totals }: { totals: YearTotals }) {
  return (
    <tr className="border-t-2 border-gray-700 bg-gray-900">
      <td className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</td>
      <td className="px-3 py-2 text-right font-semibold text-gray-200">{fmtBRL(totals.income.BRL)}</td>
      <td className="px-3 py-2 text-right font-semibold text-gray-200">{fmtBRL(totals.debit.BRL)}</td>
      <td className="px-3 py-2 text-right font-semibold text-gray-200">{fmtBRL(totals.credit.BRL)}</td>
      <td className="px-3 py-2 text-right font-semibold text-gray-400">{fmtBRL(totals.saving)}</td>
      <td className="px-3 py-2 text-right font-semibold text-gray-400">{fmtBRL(totals.adjustment)}</td>
      <td className="px-3 py-2 text-right font-semibold">
        <BalanceCell value={totals.balance.BRL} />
      </td>
    </tr>
  )
}

type Props = {
  currentYear: number
  onSelectMonth: (key: string) => void
}

export function AnnualView({ currentYear, onSelectMonth }: Props) {
  const [year, setYear] = useState(currentYear)
  const { rows, totals, loading, error } = useYearSummary(year)

  return (
    <div className="space-y-4">
      {/* Year selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setYear(y => y - 1)}
          className="text-gray-400 hover:text-white px-2 py-1"
          aria-label="Previous year"
        >
          ←
        </button>
        <span className="text-white font-semibold w-16 text-center">{year}</span>
        <button
          onClick={() => setYear(y => y + 1)}
          className="text-gray-400 hover:text-white px-2 py-1"
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
                <th className="px-3 py-2 text-right font-normal">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <DataRow key={row.monthKey} row={row} onSelect={onSelectMonth} />
              ))}
            </tbody>
            <tfoot>
              <TotalsRow totals={totals} />
            </tfoot>
          </table>
          <p className="text-xs text-gray-600 mt-2 text-right">BRL only · click a row to open that month</p>
        </div>
      )}
    </div>
  )
}
