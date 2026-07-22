import { useMemo, useState } from 'react'
import { useExpenses } from '../hooks/useExpenses'
import { useIncomes } from '../hooks/useIncomes'
import { useToast } from '../hooks/useToast'
import { userMessage } from '../lib/errorMessages'
import type { Currency, Expense } from '../types'

type Props = {
  monthKey: string
  onClose: () => void
  onCopied?: () => void
}

function prevMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const date = new Date(y, m - 2, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function expenseDedupeKey(name: string, category: string): string {
  return `${name.toLowerCase()}::${category}`
}

function incomeDedupeKey(source: string, currency: string): string {
  return `${source.toLowerCase()}::${currency}`
}

// A recurring bill is copied verbatim; an ongoing parcel is copied with one
// installment less. Finished parcels (installments === 1) are filtered out earlier.
function copyExpense(e: Expense): Omit<Expense, 'id'> {
  const copy: Omit<Expense, 'id'> = {
    name: e.name,
    category: e.category,
    currency: e.currency,
    debit: e.debit,
    credit: e.credit,
  }
  if (e.installments !== undefined && e.installments > 1) {
    copy.installments = e.installments - 1
  }
  return copy
}

function fmt(value: number, currency: Currency): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value)
}

export function CopyFromPreviousModal({ monthKey, onClose, onCopied }: Props) {
  const prevKey = prevMonthKey(monthKey)
  const { expenses: prevExpenses, loading: loadingPrevExp } = useExpenses(prevKey)
  const { incomes: prevIncomes, loading: loadingPrevInc } = useIncomes(prevKey)
  const { expenses: curExpenses, add: addExpense, loading: loadingCurExp } = useExpenses(monthKey)
  const { incomes: curIncomes, add: addIncome, loading: loadingCurInc } = useIncomes(monthKey)
  const { toast } = useToast()

  const [selected, setSelected] = useState<Set<string> | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const curExpenseKeys = useMemo(
    () => new Set(curExpenses.map(e => expenseDedupeKey(e.name, e.category))),
    [curExpenses],
  )
  const curIncomeKeys = useMemo(
    () => new Set(curIncomes.map(i => incomeDedupeKey(i.source, i.currency))),
    [curIncomes],
  )

  const incomeItems = useMemo(
    () => prevIncomes.map(i => ({
      id: `inc:${i.id}`,
      income: i,
      duplicate: curIncomeKeys.has(incomeDedupeKey(i.source, i.currency)),
    })),
    [prevIncomes, curIncomeKeys],
  )

  const expenseItems = useMemo(
    () => prevExpenses
      // Finished parcels are paid off — never worth carrying forward.
      .filter(e => e.installments === undefined || e.installments > 1)
      .map(e => ({
        id: `exp:${e.id}`,
        expense: e,
        duplicate: curExpenseKeys.has(expenseDedupeKey(e.name, e.category)),
      })),
    [prevExpenses, curExpenseKeys],
  )

  const selectableIds = useMemo(
    () => [
      ...incomeItems.filter(it => !it.duplicate).map(it => it.id),
      ...expenseItems.filter(it => !it.duplicate).map(it => it.id),
    ],
    [incomeItems, expenseItems],
  )

  const effectiveSelected = selected ?? new Set(selectableIds)
  const selectedCount = selectableIds.filter(id => effectiveSelected.has(id)).length
  const loading = loadingPrevExp || loadingPrevInc || loadingCurExp || loadingCurInc
  const isEmpty = incomeItems.length === 0 && expenseItems.length === 0

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev ?? selectableIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCopy() {
    setError(null)
    setSaving(true)
    try {
      let count = 0
      for (const it of incomeItems) {
        if (it.duplicate || !effectiveSelected.has(it.id)) continue
        await addIncome({ source: it.income.source, currency: it.income.currency, amount: it.income.amount })
        count++
      }
      for (const it of expenseItems) {
        if (it.duplicate || !effectiveSelected.has(it.id)) continue
        await addExpense(copyExpense(it.expense))
        count++
      }
      toast(`${count} item${count !== 1 ? 's' : ''} copied`)
      onCopied?.()
      onClose()
    } catch (err) {
      setError(userMessage(err, 'Failed to copy items'))
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:max-w-sm bg-panel border border-line rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg">Copy from {prevKey}</h2>
          <button
            onClick={onClose}
            className="text-faint hover:text-fg text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {loading ? (
          <p className="text-dim text-sm text-center py-8">Loading…</p>
        ) : isEmpty ? (
          <p className="text-faint text-sm text-center py-8">Nothing to copy from {prevKey}.</p>
        ) : (
          <div className="overflow-y-auto space-y-4">
            {incomeItems.length > 0 && (
              <Section title="Income">
                {incomeItems.map(it => (
                  <ItemRow
                    key={it.id}
                    label={it.income.source}
                    detail={fmt(it.income.amount, it.income.currency)}
                    duplicate={it.duplicate}
                    checked={!it.duplicate && effectiveSelected.has(it.id)}
                    onToggle={() => toggle(it.id)}
                  />
                ))}
              </Section>
            )}
            {expenseItems.length > 0 && (
              <Section title="Expenses">
                {expenseItems.map(it => (
                  <ItemRow
                    key={it.id}
                    label={it.expense.name}
                    detail={fmt(it.expense.debit + it.expense.credit, it.expense.currency)}
                    badge={it.expense.installments ? `${it.expense.installments}x` : undefined}
                    duplicate={it.duplicate}
                    checked={!it.duplicate && effectiveSelected.has(it.id)}
                    onToggle={() => toggle(it.id)}
                  />
                ))}
              </Section>
            )}
          </div>
        )}

        {error && <p className="text-neg text-xs">{error}</p>}

        {!loading && !isEmpty && (
          <button
            onClick={handleCopy}
            disabled={saving || selectedCount === 0}
            className="w-full bg-brass text-ink font-semibold rounded-lg py-2 text-sm hover:brightness-110 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Copying…' : `Copy selected (${selectedCount})`}
          </button>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="text-xs text-faint uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  )
}

type ItemRowProps = {
  label: string
  detail: string
  badge?: string
  duplicate: boolean
  checked: boolean
  onToggle: () => void
}

function ItemRow({ label, detail, badge, duplicate, checked, onToggle }: ItemRowProps) {
  return (
    <label className={`flex items-center gap-3 py-1 text-sm ${duplicate ? 'opacity-40' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        aria-label={label}
        disabled={duplicate}
        checked={checked}
        onChange={onToggle}
        className="accent-brass"
      />
      <span className="flex-1 text-fg">
        {label}
        {badge && <span className="ml-2 text-xs text-brass">({badge})</span>}
        {duplicate && <span className="ml-2 text-xs text-faint">already here</span>}
      </span>
      <span className="text-dim">{detail}</span>
    </label>
  )
}
