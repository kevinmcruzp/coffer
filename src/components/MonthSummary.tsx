import { useState } from 'react'
import { useExpenses } from '../hooks/useExpenses'
import { useIncomes } from '../hooks/useIncomes'
import { useMonthMeta } from '../hooks/useMonthMeta'
import { useToast } from './Toast'
import { PieChart } from './PieChart'
import type { Currency } from '../types'

type CardProps = {
  label: string
  value: string
  highlight?: 'positive' | 'negative' | 'neutral'
}

function Card({ label, value, highlight = 'neutral' }: CardProps) {
  const colors = {
    positive: 'text-emerald-400',
    negative: 'text-red-400',
    neutral: 'text-white',
  }
  return (
    <div className="bg-gray-900 rounded-xl p-4 space-y-1">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-semibold ${colors[highlight]}`}>{value}</p>
    </div>
  )
}

function fmt(value: number, currency: Currency): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

type Props = {
  monthKey: string
}

export function MonthSummary({ monthKey }: Props) {
  const { expenses, totals: expenseTotals, loading: loadingExp } = useExpenses(monthKey)
  const { totals: incomeTotals, loading: loadingInc } = useIncomes(monthKey)
  const { saving, adjustment, loading: loadingMeta, setSaving, setAdjustment } = useMonthMeta(monthKey)

  const [savingDraft, setSavingDraft] = useState<string | null>(null)
  const [adjustmentDraft, setAdjustmentDraft] = useState<string | null>(null)
  const { toast } = useToast()

  if (loadingExp || loadingInc || loadingMeta) {
    return <div className="text-gray-400 text-sm text-center py-12">Loading…</div>
  }

  const currencies: Currency[] = ['BRL', 'USD']
  const activeCurrencies = currencies.filter(c =>
    incomeTotals[c] > 0 ||
    expenseTotals[c].total > 0
  )

  async function commitSaving() {
    if (savingDraft === null) return
    const value = parseFloat(savingDraft)
    if (!isNaN(value) && value >= 0) {
      try {
        await setSaving(value)
        toast('Saving updated')
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Failed to save', 'error')
      }
    }
    setSavingDraft(null)
  }

  async function commitAdjustment() {
    if (adjustmentDraft === null) return
    const value = parseFloat(adjustmentDraft)
    if (!isNaN(value)) {
      try {
        await setAdjustment(value)
        toast('Adjustment updated')
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Failed to save', 'error')
      }
    }
    setAdjustmentDraft(null)
  }

  return (
    <div className="space-y-6">
      {activeCurrencies.map(c => {
        const income = incomeTotals[c]
        const debit = expenseTotals[c].debit
        const credit = expenseTotals[c].credit
        const savingBRL = c === 'BRL' ? saving : 0
        const adjBRL = c === 'BRL' ? adjustment : 0
        const balance = income - debit - credit - savingBRL + adjBRL
        const balanceHighlight = balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'neutral'

        return (
          <div key={c} className="space-y-3">
            {activeCurrencies.length > 1 && (
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{c}</h2>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Card label="Income" value={fmt(income, c)} />
              <Card label="Debit" value={fmt(debit, c)} />
              <Card label="Credit card" value={fmt(credit, c)} />
              {c === 'BRL' && (
                <>
                  <Card label="Saving" value={fmt(saving, 'BRL')} />
                  <Card label="Adjustment" value={fmt(adjustment, 'BRL')} />
                </>
              )}
              <Card label="Balance" value={fmt(balance, c)} highlight={balanceHighlight} />
            </div>
          </div>
        )
      })}

      {activeCurrencies.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-8">No data for this month yet.</p>
      )}

      {/* Pie charts — BRL expenses breakdown */}
      {expenses.some(e => e.currency === 'BRL') && (() => {
        const brl = expenses.filter(e => e.currency === 'BRL')
        const fixedTotal = brl.filter(e => e.category === 'fixed').reduce((s, e) => s + e.debit + e.credit, 0)
        const otherTotal = brl.filter(e => e.category === 'other').reduce((s, e) => s + e.debit + e.credit, 0)
        const debitTotal = brl.reduce((s, e) => s + e.debit, 0)
        const creditTotal = brl.reduce((s, e) => s + e.credit, 0)
        return (
          <div className="flex justify-around flex-wrap gap-4 pt-2">
            <PieChart
              title="By Category"
              slices={[
                { label: 'Fixed', value: fixedTotal, color: '#6366f1' },
                { label: 'Others', value: otherTotal, color: '#ec4899' },
              ]}
            />
            <PieChart
              title="By Payment"
              slices={[
                { label: 'Debit', value: debitTotal, color: '#14b8a6' },
                { label: 'Credit', value: creditTotal, color: '#f97316' },
              ]}
            />
          </div>
        )
      })()}

      {/* Saving & Adjustment inputs */}
      <div className="border-t border-gray-800 pt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-gray-500 uppercase tracking-wider">Saving (BRL)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
            value={savingDraft ?? saving}
            onChange={e => setSavingDraft(e.target.value)}
            onBlur={commitSaving}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setSavingDraft(null)
            }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500 uppercase tracking-wider">Adjustment (BRL)</label>
          <input
            type="number"
            step="0.01"
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
            value={adjustmentDraft ?? adjustment}
            onChange={e => setAdjustmentDraft(e.target.value)}
            onBlur={commitAdjustment}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setAdjustmentDraft(null)
            }}
          />
        </div>
      </div>
    </div>
  )
}
