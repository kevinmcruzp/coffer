import { useState } from 'react'
import { useExpenses } from '../hooks/useExpenses'
import type { Category, Currency, Expense } from '../types'
import type { Totals } from '../hooks/useExpenses'

// ── ExpenseRow ──────────────────────────────────────────────────────────────

type RowProps = {
  expense: Expense
  onUpdate: (id: string, changes: Partial<Omit<Expense, 'id'>>) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

function ExpenseRow({ expense, onUpdate, onRemove }: RowProps) {
  const [editField, setEditField] = useState<'name' | 'debit' | 'credit' | null>(null)
  const [draft, setDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  function startEdit(field: 'name' | 'debit' | 'credit') {
    setEditField(field)
    setDraft(field === 'name' ? expense.name : String(expense[field]))
  }

  async function commitEdit() {
    if (!editField) return
    const changes: Partial<Omit<Expense, 'id'>> = {}
    if (editField === 'name') changes.name = draft.trim()
    else if (editField === 'debit') changes.debit = parseFloat(draft) || 0
    else if (editField === 'credit') changes.credit = parseFloat(draft) || 0
    try {
      await onUpdate(expense.id, changes)
    } catch {
      // revert: field re-renders with original value
    }
    setEditField(null)
  }

  return (
    <tr>
      <td
        data-testid={`name-${expense.id}`}
        className="px-2 py-1 cursor-pointer"
        onClick={() => { if (editField !== 'name') startEdit('name') }}
      >
        {editField === 'name' ? (
          <input
            autoFocus
            className="w-full bg-gray-800 text-white rounded px-1"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditField(null)
            }}
          />
        ) : (
          expense.name
        )}
      </td>
      <td className="px-2 py-1">
        <select
          className="bg-gray-800 text-white rounded px-1 text-sm"
          value={expense.currency}
          onChange={e => onUpdate(expense.id, { currency: e.target.value as Currency })}
        >
          <option value="BRL">BRL</option>
          <option value="USD">USD</option>
        </select>
      </td>
      <td
        className="px-2 py-1 text-right cursor-pointer"
        onClick={() => { if (editField !== 'debit') startEdit('debit') }}
      >
        {editField === 'debit' ? (
          <input
            autoFocus
            type="number"
            min="0"
            step="0.01"
            className="w-24 bg-gray-800 text-white rounded px-1 text-right"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditField(null)
            }}
          />
        ) : (
          expense.debit.toFixed(2)
        )}
      </td>
      <td
        className="px-2 py-1 text-right cursor-pointer"
        onClick={() => { if (editField !== 'credit') startEdit('credit') }}
      >
        {editField === 'credit' ? (
          <input
            autoFocus
            type="number"
            min="0"
            step="0.01"
            className="w-24 bg-gray-800 text-white rounded px-1 text-right"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditField(null)
            }}
          />
        ) : (
          expense.credit.toFixed(2)
        )}
      </td>
      <td className="px-2 py-1 text-center">
        <input
          type="checkbox"
          checked={expense.fixed}
          aria-label={`Fixed ${expense.name}`}
          onChange={e => onUpdate(expense.id, { fixed: e.target.checked })}
        />
      </td>
      <td className="px-2 py-1">
        {confirmDelete ? (
          <span className="flex gap-1">
            <button
              className="text-xs text-red-400 underline"
              onClick={() => onRemove(expense.id)}
            >
              Confirm
            </button>
            <button
              className="text-xs text-gray-400 underline"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            className="text-xs text-gray-500 hover:text-red-400"
            aria-label={`Delete ${expense.name}`}
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  )
}

// ── AddExpenseForm ───────────────────────────────────────────────────────────

type AddFormProps = {
  category: Category
  onAdd: (input: Omit<Expense, 'id'>) => Promise<void>
}

function AddExpenseForm({ category, onAdd }: AddFormProps) {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<Currency>('BRL')
  const [debit, setDebit] = useState('0')
  const [credit, setCredit] = useState('0')
  const [fixed, setFixed] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleAdd() {
    setFormError(null)
    try {
      await onAdd({
        name: name.trim(),
        category,
        currency,
        debit: parseFloat(debit) || 0,
        credit: parseFloat(credit) || 0,
        fixed,
      })
      setName('')
      setDebit('0')
      setCredit('0')
      setFixed(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add')
    }
  }

  return (
    <>
      <tr className="text-gray-400 text-sm">
        <td className="px-2 py-1">
          <input
            className="w-full bg-gray-800 text-white rounded px-1 placeholder-gray-500"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </td>
        <td className="px-2 py-1">
          <select
            className="bg-gray-800 text-white rounded px-1 text-sm"
            value={currency}
            onChange={e => setCurrency(e.target.value as Currency)}
          >
            <option value="BRL">BRL</option>
            <option value="USD">USD</option>
          </select>
        </td>
        <td className="px-2 py-1">
          <input
            type="number"
            min="0"
            step="0.01"
            aria-label="Debit"
            className="w-24 bg-gray-800 text-white rounded px-1 text-right"
            value={debit}
            onChange={e => setDebit(e.target.value)}
          />
        </td>
        <td className="px-2 py-1">
          <input
            type="number"
            min="0"
            step="0.01"
            aria-label="Credit"
            className="w-24 bg-gray-800 text-white rounded px-1 text-right"
            value={credit}
            onChange={e => setCredit(e.target.value)}
          />
        </td>
        <td className="px-2 py-1 text-center">
          <input
            type="checkbox"
            checked={fixed}
            aria-label="Fixed new expense"
            onChange={e => setFixed(e.target.checked)}
          />
        </td>
        <td className="px-2 py-1">
          <button
            className="text-xs text-emerald-400 hover:text-emerald-300"
            onClick={handleAdd}
          >
            Add
          </button>
        </td>
      </tr>
      {formError && (
        <tr>
          <td colSpan={6} className="px-2 py-1 text-red-400 text-xs">
            {formError}
          </td>
        </tr>
      )}
    </>
  )
}

// ── ExpenseGroup ─────────────────────────────────────────────────────────────

type GroupProps = {
  label: string
  category: Category
  expenses: Expense[]
  onUpdate: (id: string, changes: Partial<Omit<Expense, 'id'>>) => Promise<void>
  onRemove: (id: string) => Promise<void>
  onAdd: (input: Omit<Expense, 'id'>) => Promise<void>
}

function ExpenseGroup({ label, category, expenses, onUpdate, onRemove, onAdd }: GroupProps) {
  return (
    <section data-testid={`group-${category}`} className="mb-6">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
        {label}
      </h2>
      <table className="w-full text-sm text-white">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-800">
            <th className="px-2 py-1 text-left font-normal">Name</th>
            <th className="px-2 py-1 text-left font-normal">Currency</th>
            <th className="px-2 py-1 text-right font-normal">Debit</th>
            <th className="px-2 py-1 text-right font-normal">Credit</th>
            <th className="px-2 py-1 text-center font-normal">Fixed</th>
            <th className="px-2 py-1 font-normal" />
          </tr>
        </thead>
        <tbody>
          {expenses.map(e => (
            <ExpenseRow key={e.id} expense={e} onUpdate={onUpdate} onRemove={onRemove} />
          ))}
          <AddExpenseForm category={category} onAdd={onAdd} />
        </tbody>
      </table>
    </section>
  )
}

// ── TotalsFooter ─────────────────────────────────────────────────────────────

function TotalsFooter({ totals }: { totals: Totals }) {
  const currencies: Currency[] = ['BRL', 'USD']
  const active = currencies.filter(c => totals[c].total > 0)

  if (active.length === 0) return null

  return (
    <div className="border-t border-gray-800 pt-4 mt-4 space-y-2">
      {active.map(c => (
        <div
          key={c}
          data-testid={`totals-${c}`}
          className="flex gap-6 text-sm text-gray-300"
        >
          <span className="font-semibold text-gray-500 w-10">{c}</span>
          <span>Debit: <strong>{totals[c].debit.toFixed(2)}</strong></span>
          <span>Credit: <strong>{totals[c].credit.toFixed(2)}</strong></span>
          <span>Total: <strong>{totals[c].total.toFixed(2)}</strong></span>
        </div>
      ))}
    </div>
  )
}

// ── ExpenseList ───────────────────────────────────────────────────────────────

type Props = {
  monthKey: string
}

export function ExpenseList({ monthKey }: Props) {
  const { expenses, loading, error, totals, add, update, remove } = useExpenses(monthKey)

  if (loading) {
    return (
      <div className="text-gray-400 text-sm text-center py-8">Loading…</div>
    )
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm text-center py-8">{error}</div>
    )
  }

  const fixed = expenses.filter(e => e.category === 'fixed')
  const others = expenses.filter(e => e.category === 'other')

  return (
    <div>
      <ExpenseGroup
        label="Fixo"
        category="fixed"
        expenses={fixed}
        onUpdate={update}
        onRemove={remove}
        onAdd={add}
      />
      <ExpenseGroup
        label="Outros"
        category="other"
        expenses={others}
        onUpdate={update}
        onRemove={remove}
        onAdd={add}
      />
      <TotalsFooter totals={totals} />
    </div>
  )
}
