import { useState } from 'react'
import { useExpenses } from '../hooks/useExpenses'
import { useIncomes } from '../hooks/useIncomes'
import { useMonthMeta } from '../hooks/useMonthMeta'
import { useToast } from '../hooks/useToast'
import { userMessage } from '../lib/errorMessages'
import { round2, parseMoney } from '../lib/math'
import { PieChart } from './PieChart'
import { NumberInput } from './NumberInput'
import { StatCard } from './StatCard'
import { CURRENCIES } from '../types'
import type { Currency } from '../types'

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
  const { saving, adjustment, budget, loading: loadingMeta, setSaving, setAdjustment, setBudget } = useMonthMeta(monthKey)

  const [savingDraft, setSavingDraft] = useState<string | null>(null)
  const [adjustmentDraft, setAdjustmentDraft] = useState<string | null>(null)
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null)
  const { toast } = useToast()

  if (loadingExp || loadingInc || loadingMeta) {
    return <div className="text-dim text-sm text-center py-12">Loading…</div>
  }

  const currencies = CURRENCIES
  const activeCurrencies = currencies.filter(c =>
    incomeTotals[c] > 0 ||
    expenseTotals[c].total > 0
  )

  async function commitSaving() {
    if (savingDraft === null) return
    const value = Math.max(parseMoney(savingDraft), 0)
    try {
      await setSaving(value)
      toast('Saving updated')
    } catch (err) {
      toast(userMessage(err, 'Failed to save'), 'error')
    }
    setSavingDraft(null)
  }

  async function commitBudget() {
    if (budgetDraft === null) return
    const value = Math.max(parseMoney(budgetDraft), 0)
    try {
      await setBudget(value)
      toast('Budget updated')
    } catch (err) {
      toast(userMessage(err, 'Failed to save'), 'error')
    }
    setBudgetDraft(null)
  }

  async function commitAdjustment() {
    if (adjustmentDraft === null) return
    const value = parseMoney(adjustmentDraft)
    try {
      await setAdjustment(value)
      toast('Adjustment updated')
    } catch (err) {
      toast(userMessage(err, 'Failed to save'), 'error')
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
        const balance = round2(income - debit - credit - savingBRL + adjBRL)
        const balanceHighlight = balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'neutral'

        return (
          <div key={c} className="space-y-3">
            {activeCurrencies.length > 1 && (
              <h2 className="text-xs font-semibold text-faint uppercase tracking-widest">{c}</h2>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Income" value={fmt(income, c)} />
              <StatCard label="Debit" value={fmt(debit, c)} />
              <StatCard label="Credit card" value={fmt(credit, c)} />
              {c === 'BRL' && (
                <>
                  <StatCard label="Saving" value={fmt(saving, 'BRL')} />
                  <StatCard label="Adjustment" value={fmt(adjustment, 'BRL')} />
                </>
              )}
              <StatCard label="Balance" value={fmt(balance, c)} highlight={balanceHighlight} />
            </div>
          </div>
        )
      })}

      {activeCurrencies.length === 0 && (
        <p className="text-faint text-sm text-center py-8">No data for this month yet.</p>
      )}

      {/* Budget progress bar */}
      {budget > 0 && (() => {
        const spent = expenseTotals.BRL.total
        const pct = Math.min(spent / budget, 1)
        const over = spent > budget
        const barColor = over ? 'bg-neg' : pct >= 0.8 ? 'bg-brass' : 'bg-pos'
        return (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-dim">
              <span>Budget</span>
              <span className={over ? 'text-neg font-semibold' : ''}>
                {fmt(spent, 'BRL')} / {fmt(budget, 'BRL')}
                {over && <span className="ml-2 text-neg">+{fmt(round2(spent - budget), 'BRL')} over</span>}
              </span>
            </div>
            <div className="h-2 bg-panel-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${Math.min(pct * 100, 100)}%` }}
              />
            </div>
          </div>
        )
      })()}

      {/* Pie charts — BRL expenses breakdown */}
      {expenses.some(e => e.currency === 'BRL') && (() => {
        const brl = expenses.filter(e => e.currency === 'BRL')
        const fixedTotal = round2(brl.filter(e => e.category === 'fixed').reduce((s, e) => s + e.debit + e.credit, 0))
        const otherTotal = round2(brl.filter(e => e.category === 'other').reduce((s, e) => s + e.debit + e.credit, 0))
        const debitTotal = round2(brl.reduce((s, e) => s + e.debit, 0))
        const creditTotal = round2(brl.reduce((s, e) => s + e.credit, 0))
        return (
          <div className="flex justify-around flex-wrap gap-4 pt-2">
            <PieChart
              title="By Category"
              slices={[
                { label: 'Fixed', value: fixedTotal, color: '#C9A45C' },
                { label: 'Others', value: otherTotal, color: '#6F93A8' },
              ]}
            />
            <PieChart
              title="By Payment"
              slices={[
                { label: 'Debit', value: debitTotal, color: '#7FA88C' },
                { label: 'Credit', value: creditTotal, color: '#C08457' },
              ]}
            />
          </div>
        )
      })()}

      {/* Saving, Adjustment & Budget inputs */}
      <div className="border-t border-line pt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-faint uppercase tracking-wider">Saving (BRL)</label>
          <NumberInput
            min="0"
            step="0.01"
            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brass"
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
          <label className="text-xs text-faint uppercase tracking-wider">Adjustment (BRL)</label>
          <NumberInput
            step="0.01"
            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brass"
            value={adjustmentDraft ?? adjustment}
            onChange={e => setAdjustmentDraft(e.target.value)}
            onBlur={commitAdjustment}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setAdjustmentDraft(null)
            }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-faint uppercase tracking-wider">Budget (BRL) <span className="normal-case text-faint">— 0 = no limit</span></label>
          <NumberInput
            min="0"
            step="0.01"
            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brass"
            value={budgetDraft ?? budget}
            onChange={e => setBudgetDraft(e.target.value)}
            onBlur={commitBudget}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setBudgetDraft(null)
            }}
          />
        </div>
      </div>
    </div>
  )
}
