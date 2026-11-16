import { useState } from 'react'
import { useExpenses } from '../hooks/useExpenses'
import { useIncomes } from '../hooks/useIncomes'
import { useMonthMeta } from '../hooks/useMonthMeta'
import { useSession } from '../hooks/useSession'
import { useToast } from '../hooks/useToast'
import { userMessage } from '../lib/errorMessages'
import { round2, parseMoney } from '../lib/math'
import { formatMoney } from '../lib/money'
import { PieChart } from './PieChart'
import { NumberInput } from './NumberInput'
import { StatCard } from './StatCard'
import { InfoTip } from './InfoTip'
import { MonthClosingPanel } from './MonthClosingPanel'

const INFO = {
  saving: 'Money set aside this month. It is subtracted from the balance.',
  adjustment: 'Manual correction to the balance — use a negative value to subtract.',
  budget: 'Monthly spending ceiling. It only warns you — it does not change the balance. 0 = no limit.',
  balance: 'Income − Debit − Credit − Saving + Adjustment.',
}

type Props = {
  monthKey: string
}

export function MonthSummary({ monthKey }: Props) {
  const { expenses, totals: expenseTotals, loading: loadingExp } = useExpenses(monthKey)
  const { total: income, closed, loading: loadingInc } = useIncomes(monthKey)
  const { saving, adjustment, budget, loading: loadingMeta, setSaving, setAdjustment, setBudget } = useMonthMeta(monthKey)

  const [savingDraft, setSavingDraft] = useState<string | null>(null)
  const [adjustmentDraft, setAdjustmentDraft] = useState<string | null>(null)
  const [budgetDraft, setBudgetDraft] = useState<string | null>(null)
  const { toast } = useToast()
  const { currency } = useSession()

  if (loadingExp || loadingInc || loadingMeta) {
    return <div className="text-dim text-sm text-center py-12">Loading…</div>
  }

  const fmt = (value: number) => formatMoney(value, currency)
  const hasData = income !== 0 || expenseTotals.total > 0 || saving !== 0 || adjustment !== 0
  const balance = round2(income - expenseTotals.total - saving + adjustment)
  const balanceHighlight = balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'neutral'

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
      {hasData ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Income" value={fmt(income)} />
          <StatCard label="Debit" value={fmt(expenseTotals.debit)} />
          <StatCard label="Credit card" value={fmt(expenseTotals.credit)} />
          <StatCard label="Saving" value={fmt(saving)} info={INFO.saving} />
          <StatCard label="Adjustment" value={fmt(adjustment)} info={INFO.adjustment} />
          <StatCard label="Balance" value={fmt(balance)} info={INFO.balance} highlight={balanceHighlight} />
        </div>
      ) : (
        <p className="text-faint text-sm text-center py-8">No data for this month yet.</p>
      )}

      {/* Budget progress bar */}
      {budget > 0 && (() => {
        const spent = expenseTotals.total
        const pct = Math.min(spent / budget, 1)
        const over = spent > budget
        const barColor = over ? 'bg-neg' : pct >= 0.8 ? 'bg-brass' : 'bg-pos'
        return (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-dim">
              <span className="flex items-center gap-1.5">Budget <InfoTip label="Budget">{INFO.budget}</InfoTip></span>
              <span className={over ? 'text-neg font-semibold' : ''}>
                {fmt(spent)} / {fmt(budget)}
                {over && <span className="ml-2 text-neg">+{fmt(round2(spent - budget))} over</span>}
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

      {/* Pie charts — expenses breakdown */}
      {expenses.length > 0 && (() => {
        const fixedTotal = round2(expenses.filter(e => e.category === 'fixed').reduce((s, e) => s + e.debit + e.credit, 0))
        const otherTotal = round2(expenses.filter(e => e.category === 'other').reduce((s, e) => s + e.debit + e.credit, 0))
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
                { label: 'Debit', value: expenseTotals.debit, color: '#7FA88C' },
                { label: 'Credit', value: expenseTotals.credit, color: '#C08457' },
              ]}
            />
          </div>
        )
      })()}

      {/* Saving, Adjustment & Budget inputs */}
      <div className="border-t border-line pt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-faint uppercase tracking-wider">Saving ({currency})</label>
            <InfoTip label="Saving">{INFO.saving}</InfoTip>
          </div>
          <NumberInput
            min="0"
            step="0.01"
            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brass disabled:opacity-60"
            value={savingDraft ?? saving}
            onChange={e => setSavingDraft(e.target.value)}
            disabled={closed}
            onBlur={commitSaving}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setSavingDraft(null)
            }}
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-faint uppercase tracking-wider">Adjustment ({currency})</label>
            <InfoTip label="Adjustment">{INFO.adjustment}</InfoTip>
          </div>
          <NumberInput
            step="0.01"
            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brass disabled:opacity-60"
            value={adjustmentDraft ?? adjustment}
            onChange={e => setAdjustmentDraft(e.target.value)}
            disabled={closed}
            onBlur={commitAdjustment}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setAdjustmentDraft(null)
            }}
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-faint uppercase tracking-wider">Budget ({currency}) <span className="normal-case text-faint">— 0 = no limit</span></label>
            <InfoTip label="Budget">{INFO.budget}</InfoTip>
          </div>
          <NumberInput
            min="0"
            step="0.01"
            className="w-full bg-panel border border-line rounded-lg px-3 py-2 text-fg text-sm focus:outline-none focus:border-brass disabled:opacity-60"
            value={budgetDraft ?? budget}
            onChange={e => setBudgetDraft(e.target.value)}
            disabled={closed}
            onBlur={commitBudget}
            onKeyDown={e => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') setBudgetDraft(null)
            }}
          />
        </div>
      </div>

      <MonthClosingPanel monthKey={monthKey} />
    </div>
  )
}
