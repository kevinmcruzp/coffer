import { useMemo, useState } from 'react'
import { useExpenses } from '../hooks/useExpenses'
import { useSession } from '../hooks/useSession'
import { readMonth } from '../lib/db'
import { syncFixed } from '../lib/syncFixed'
import { useToast } from './Toast'
import { CURRENCIES } from '../types'
import type { Category, Currency, Expense } from '../types'
import type { Totals } from '../hooks/useExpenses'

// ── Sort ──────────────────────────────────────────────────────────────────────

type ExpenseSortCol = 'name' | 'debit' | 'credit' | 'total'
type SortDir = 'asc' | 'desc'

function sortExpenses(arr: Expense[], col: ExpenseSortCol, dir: SortDir): Expense[] {
  return [...arr].sort((a, b) => {
    let d: number
    if (col === 'name') d = a.name.localeCompare(b.name)
    else if (col === 'debit') d = a.debit - b.debit
    else if (col === 'credit') d = a.credit - b.credit
    else d = (a.debit + a.credit) - (b.debit + b.credit)
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

// ── FilterBar ────────────────────────────────────────────────────────────────

type PaymentFilter = 'all' | 'debit' | 'credit'
type CategoryFilter = 'all' | 'fixed' | 'other'

type FilterBarProps = {
  search: string
  onSearch: (v: string) => void
  category: CategoryFilter
  onCategory: (v: CategoryFilter) => void
  payment: PaymentFilter
  onPayment: (v: PaymentFilter) => void
}

function ToggleGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-700">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 text-xs transition-colors ${
            value === o.value
              ? 'bg-gray-700 text-white'
              : 'bg-gray-900 text-gray-500 hover:text-gray-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function FilterBar({ search, onSearch, category, onCategory, payment, onPayment }: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <input
        type="search"
        placeholder="Search…"
        value={search}
        onChange={e => onSearch(e.target.value)}
        className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 w-40"
      />
      <ToggleGroup
        options={[
          { value: 'all', label: 'All' },
          { value: 'fixed', label: 'Fixed' },
          { value: 'other', label: 'Others' },
        ]}
        value={category}
        onChange={onCategory}
      />
      <ToggleGroup
        options={[
          { value: 'all', label: 'All' },
          { value: 'debit', label: 'Debit' },
          { value: 'credit', label: 'Credit' },
        ]}
        value={payment}
        onChange={onPayment}
      />
    </div>
  )
}

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
    if (editField === 'name') {
      changes.name = draft.trim()
    } else if (editField === 'debit') {
      const v = parseFloat(draft)
      if (isNaN(v)) { setEditField(null); return }
      changes.debit = v
    } else if (editField === 'credit') {
      const v = parseFloat(draft)
      if (isNaN(v)) { setEditField(null); return }
      changes.credit = v
    }
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
          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
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
      <td className="px-2 py-1 text-right text-gray-400">
        {(expense.debit + expense.credit).toFixed(2)}
      </td>
      <td className="px-2 py-1 text-center">
        <input
          type="checkbox"
          checked={expense.fixed}
          aria-label={`Repeat ${expense.name}`}
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
        <td />
        <td className="px-2 py-1 text-center">
          <input
            type="checkbox"
            checked={fixed}
            aria-label="Repeat next month"
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
          <td colSpan={7} className="px-2 py-1 text-red-400 text-xs">
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
  onAdd?: (input: Omit<Expense, 'id'>) => Promise<void>
  sortCol: ExpenseSortCol
  sortDir: SortDir
  onSort: (col: ExpenseSortCol) => void
}

function ExpenseGroup({ label, category, expenses, onUpdate, onRemove, onAdd, sortCol, sortDir, onSort }: GroupProps) {
  return (
    <section data-testid={`group-${category}`} className="mb-6">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
        {label}
      </h2>
      <table className="w-full text-sm text-white">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-800 select-none">
            <th
              className="px-2 py-1 text-left font-normal cursor-pointer hover:text-gray-300"
              onClick={() => onSort('name')}
            >
              Name <SortIndicator active={sortCol === 'name'} dir={sortDir} />
            </th>
            <th className="px-2 py-1 text-left font-normal">Currency</th>
            <th
              className="px-2 py-1 text-right font-normal cursor-pointer hover:text-gray-300"
              onClick={() => onSort('debit')}
            >
              Debit <SortIndicator active={sortCol === 'debit'} dir={sortDir} />
            </th>
            <th
              className="px-2 py-1 text-right font-normal cursor-pointer hover:text-gray-300"
              onClick={() => onSort('credit')}
            >
              Credit <SortIndicator active={sortCol === 'credit'} dir={sortDir} />
            </th>
            <th
              className="px-2 py-1 text-right font-normal cursor-pointer hover:text-gray-300"
              onClick={() => onSort('total')}
            >
              Total <SortIndicator active={sortCol === 'total'} dir={sortDir} />
            </th>
            <th className="px-2 py-1 text-center font-normal">Repeat</th>
            <th className="px-2 py-1 font-normal" />
          </tr>
        </thead>
        <tbody>
          {expenses.map(e => (
            <ExpenseRow key={e.id} expense={e} onUpdate={onUpdate} onRemove={onRemove} />
          ))}
          {onAdd && <AddExpenseForm category={category} onAdd={onAdd} />}
        </tbody>
      </table>
    </section>
  )
}

// ── TotalsFooter ─────────────────────────────────────────────────────────────

function fmtCurrency(value: number, currency: Currency): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value)
}

function TotalsFooter({ totals }: { totals: Totals }) {
  const currencies = CURRENCIES
  const active = currencies.filter(c => totals[c].total > 0)

  if (active.length === 0) return null

  return (
    <div className="border-t border-gray-800 pt-4 mt-4 space-y-2">
      {active.map(c => (
        <div
          key={c}
          data-testid={`totals-${c}`}
          className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-300"
        >
          <span className="font-semibold text-gray-500 w-10">{c}</span>
          <span>Debit: <strong>{fmtCurrency(totals[c].debit, c)}</strong></span>
          <span>Credit: <strong>{fmtCurrency(totals[c].credit, c)}</strong></span>
          <span>Total: <strong>{fmtCurrency(totals[c].total, c)}</strong></span>
        </div>
      ))}
    </div>
  )
}

// ── ExpenseList ───────────────────────────────────────────────────────────────

type Props = {
  monthKey: string
}

function prevMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number)
  const date = new Date(y, m - 2, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function ExpenseList({ monthKey }: Props) {
  const { expenses, loading, error, totals, add, update, remove } = useExpenses(monthKey)
  const { state, db } = useSession()
  const { toast } = useToast()
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [sortCol, setSortCol] = useState<ExpenseSortCol>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  async function handleSync() {
    if (!db || state.status !== 'unlocked') return
    setSyncing(true)
    try {
      const prev = await readMonth(db, prevMonthKey(monthKey), state.key)
      const currentData = { key: monthKey, expenses, incomes: [], saving: 0, adjustment: 0, budget: 0 }
      const toAdd = syncFixed(prev, currentData)
      if (toAdd.length === 0) {
        toast('Already up to date')
      } else {
        for (const expense of toAdd) {
          await add(expense)
        }
        toast(`${toAdd.length} expense${toAdd.length !== 1 ? 's' : ''} added`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed'
      if (msg.includes('not found')) {
        toast('No previous month data found', 'error')
      } else {
        toast(msg, 'error')
      }
    }
    setSyncing(false)
  }

  function toggleSort(col: ExpenseSortCol) {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return expenses.filter(e => {
      if (q && !e.name.toLowerCase().includes(q)) return false
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false
      if (paymentFilter === 'debit' && e.debit === 0) return false
      if (paymentFilter === 'credit' && e.credit === 0) return false
      return true
    })
  }, [expenses, search, categoryFilter, paymentFilter])

  const sorted = useMemo(
    () => sortExpenses(filtered, sortCol, sortDir),
    [filtered, sortCol, sortDir],
  )

  if (loading) {
    return <div className="text-gray-400 text-sm text-center py-8">Loading…</div>
  }

  if (error) {
    return <div className="text-red-400 text-sm text-center py-8">{error}</div>
  }

  const isFiltering = search !== '' || categoryFilter !== 'all' || paymentFilter !== 'all'
  const fixed = sorted.filter(e => e.category === 'fixed')
  const others = sorted.filter(e => e.category === 'other')

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-3 items-center justify-between">
        <FilterBar
          search={search}
          onSearch={setSearch}
          category={categoryFilter}
          onCategory={setCategoryFilter}
          payment={paymentFilter}
          onPayment={setPaymentFilter}
        />
        <button
          onClick={handleSync}
          disabled={syncing}
          className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded border border-gray-700 hover:border-gray-500 transition-colors disabled:opacity-50"
        >
          {syncing ? 'Syncing…' : '↻ Sync fixed'}
        </button>
      </div>
      {categoryFilter !== 'other' && (
        <ExpenseGroup
          label="Fixed"
          category="fixed"
          expenses={fixed}
          onUpdate={update}
          onRemove={remove}
          onAdd={isFiltering ? undefined : add}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={toggleSort}
        />
      )}
      {categoryFilter !== 'fixed' && (
        <ExpenseGroup
          label="Others"
          category="other"
          expenses={others}
          onUpdate={update}
          onRemove={remove}
          onAdd={isFiltering ? undefined : add}
          sortCol={sortCol}
          sortDir={sortDir}
          onSort={toggleSort}
        />
      )}
      {isFiltering && filtered.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-8">No expenses match the current filters.</p>
      )}
      <TotalsFooter totals={totals} />
    </div>
  )
}
