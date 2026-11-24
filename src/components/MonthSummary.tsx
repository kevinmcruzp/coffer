import { useState } from 'react'
import { useExpenses } from '../hooks/useExpenses'
import { useIncomes } from '../hooks/useIncomes'
import { useMonthMeta } from '../hooks/useMonthMeta'
import { useLocale } from '../hooks/useLocale'
import { useSession } from '../hooks/useSession'
import { useToast } from '../hooks/useToast'
import { userMessage } from '../lib/errorMessages'
import { round2, parseMoney } from '../lib/math'
import { PieChart } from './PieChart'
import { NumberInput } from './NumberInput'
import { StatCard } from './StatCard'
import { InfoTip } from './InfoTip'
import { MonthClosingPanel } from './MonthClosingPanel'

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
  const { t, money } = useLocale()

  if (loadingExp || loadingInc || loadingMeta) {
    return <div className="text-dim text-sm text-center py-12">{t('common.loading')}</div>
  }

  const fmt = (value: number) => money(value, currency)
  const hasData = income !== 0 || expenseTotals.total > 0 || saving !== 0 || adjustment !== 0
  const balance = round2(income - expenseTotals.total - saving + adjustment)
  const balanceHighlight = balance > 0 ? 'positive' : balance < 0 ? 'negative' : 'neutral'

  async function commitSaving() {
    if (savingDraft === null) return
    const value = Math.max(parseMoney(savingDraft), 0)
    try {
      await setSaving(value)
      toast(t('summary.savingUpdated'))
    } catch (err) {
      toast(t(userMessage(err, 'summary.saveFailed')), 'error')
    }
    setSavingDraft(null)
  }

  async function commitBudget() {
    if (budgetDraft === null) return
    const value = Math.max(parseMoney(budgetDraft), 0)
    try {
      await setBudget(value)
      toast(t('summary.budgetUpdated'))
    } catch (err) {
      toast(t(userMessage(err, 'summary.saveFailed')), 'error')
    }
    setBudgetDraft(null)
  }

  async function commitAdjustment() {
    if (adjustmentDraft === null) return
    const value = parseMoney(adjustmentDraft)
    try {
      await setAdjustment(value)
      toast(t('summary.adjustmentUpdated'))
    } catch (err) {
      toast(t(userMessage(err, 'summary.saveFailed')), 'error')
    }
    setAdjustmentDraft(null)
  }

  return (
    <div className="space-y-6">
      {hasData ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label={t('summary.income')} value={fmt(income)} />
          <StatCard label={t('payment.debit')} value={fmt(expenseTotals.debit)} />
          <StatCard label={t('summary.creditCard')} value={fmt(expenseTotals.credit)} />
          <StatCard label={t('summary.saving')} value={fmt(saving)} info={t('summary.savingInfo')} />
          <StatCard label={t('summary.adjustment')} value={fmt(adjustment)} info={t('summary.adjustmentInfo')} />
          <StatCard label={t('summary.balance')} value={fmt(balance)} info={t('summary.balanceInfo')} highlight={balanceHighlight} />
        </div>
      ) : (
        <p className="text-faint text-sm text-center py-8">{t('summary.noData')}</p>
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
              <span className="flex items-center gap-1.5">{t('summary.budget')} <InfoTip label={t('summary.budget')}>{t('summary.budgetInfo')}</InfoTip></span>
              <span className={over ? 'text-neg font-semibold' : ''}>
                {fmt(spent)} / {fmt(budget)}
                {over && <span className="ml-2 text-neg">{t('summary.over', { amount: fmt(round2(spent - budget)) })}</span>}
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
              title={t('summary.byCategory')}
              slices={[
                { label: t('category.fixed'), value: fixedTotal, color: '#C9A45C' },
                { label: t('category.other'), value: otherTotal, color: '#6F93A8' },
              ]}
            />
            <PieChart
              title={t('summary.byPayment')}
              slices={[
                { label: t('payment.debit'), value: expenseTotals.debit, color: '#7FA88C' },
                { label: t('payment.credit'), value: expenseTotals.credit, color: '#C08457' },
              ]}
            />
          </div>
        )
      })()}

      {/* Saving, Adjustment & Budget inputs */}
      <div className="border-t border-line pt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-faint uppercase tracking-wider">{t('common.withCurrency', { label: t('summary.saving'), currency })}</label>
            <InfoTip label={t('summary.saving')}>{t('summary.savingInfo')}</InfoTip>
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
            <label className="text-xs text-faint uppercase tracking-wider">{t('common.withCurrency', { label: t('summary.adjustment'), currency })}</label>
            <InfoTip label={t('summary.adjustment')}>{t('summary.adjustmentInfo')}</InfoTip>
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
            <label className="text-xs text-faint uppercase tracking-wider">{t('common.withCurrency', { label: t('summary.budget'), currency })} <span className="normal-case text-faint">{t('summary.noLimit')}</span></label>
            <InfoTip label={t('summary.budget')}>{t('summary.budgetInfo')}</InfoTip>
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
