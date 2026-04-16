import { useExpenses } from '../hooks/useExpenses'
import { useIncomes } from '../hooks/useIncomes'
import { CURRENCIES } from '../types'
import type { Currency } from '../types'

function fmt(value: number, currency: Currency): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

type Props = { monthKey: string }

export function FixedPanel({ monthKey }: Props) {
  const { expenses, loading: loadingExp } = useExpenses(monthKey)
  const { totals: incomeTotals, loading: loadingInc } = useIncomes(monthKey)

  if (loadingExp || loadingInc) {
    return <div className="text-gray-400 text-sm text-center py-8">Loading…</div>
  }

  const fixed = expenses.filter(e => e.fixed)

  if (fixed.length === 0) {
    return (
      <p className="text-gray-500 text-sm text-center py-12">
        No expenses marked as Repeat this month.
      </p>
    )
  }

  // totals per currency
  const committed = CURRENCIES.reduce<Record<Currency, number>>(
    (acc, c) => {
      acc[c] = fixed.filter(e => e.currency === c).reduce((s, e) => s + e.debit + e.credit, 0)
      return acc
    },
    Object.fromEntries(CURRENCIES.map(c => [c, 0])) as Record<Currency, number>,
  )

  const activeCurrencies = CURRENCIES.filter(c => committed[c] > 0)
  const totalIncomeBRL = incomeTotals.BRL
  const pct = totalIncomeBRL > 0 ? (committed.BRL / totalIncomeBRL) * 100 : null

  return (
    <div className="space-y-6">
      {/* List */}
      <table className="w-full text-sm text-white">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-800">
            <th className="px-2 py-1 text-left font-normal">Name</th>
            <th className="px-2 py-1 text-left font-normal">Currency</th>
            <th className="px-2 py-1 text-right font-normal">Debit</th>
            <th className="px-2 py-1 text-right font-normal">Credit</th>
            <th className="px-2 py-1 text-right font-normal">Total</th>
          </tr>
        </thead>
        <tbody>
          {fixed.map(e => (
            <tr key={e.id} className="border-b border-gray-800/50">
              <td className="px-2 py-1 text-gray-200">{e.name}</td>
              <td className="px-2 py-1 text-gray-500 text-xs">{e.currency}</td>
              <td className="px-2 py-1 text-right text-gray-300">{e.debit > 0 ? e.debit.toFixed(2) : '—'}</td>
              <td className="px-2 py-1 text-right text-gray-300">{e.credit > 0 ? e.credit.toFixed(2) : '—'}</td>
              <td className="px-2 py-1 text-right font-medium">{(e.debit + e.credit).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="border-t border-gray-800 pt-4 space-y-2">
        {activeCurrencies.map(c => (
          <div key={c} className="flex justify-between text-sm">
            <span className="text-gray-500">Committed ({c})</span>
            <span className="font-semibold text-white">{fmt(committed[c], c)}</span>
          </div>
        ))}

        {pct !== null && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">% of income (BRL)</span>
            <span className={`font-semibold ${pct >= 80 ? 'text-red-400' : pct >= 50 ? 'text-yellow-400' : 'text-emerald-400'}`}>
              {pct.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
