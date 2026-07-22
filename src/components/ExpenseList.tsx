import { useMemo, useState } from 'react'
import { useExpenses } from '../hooks/useExpenses'
import { useToast } from '../hooks/useToast'
import { CopyFromPreviousModal } from './CopyFromPreviousModal'
import { NumberInput } from './NumberInput'
import { userMessage } from '../lib/errorMessages'
import { round2, parseMoney } from '../lib/math'
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
    <span className={active ? 'ml-1' : 'ml-1 text-faint'}>
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
    <div className="flex rounded-lg overflow-hidden border border-line">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 text-xs transition-colors ${
            value === o.value
              ? 'bg-panel-2 text-fg'
              : 'bg-panel text-faint hover:text-dim'
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
        className="bg-panel border border-line rounded-lg px-3 py-1 text-sm text-fg placeholder-faint focus:outline-none focus:border-brass w-40"
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
  const { toast } = useToast()

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
      changes.debit = round2(v)
    } else if (editField === 'credit') {
      const v = parseFloat(draft)
      if (isNaN(v)) { setEditField(null); return }
      changes.credit = round2(v)
    }
    try {
      await onUpdate(expense.id, changes)
    } catch (err) {
      toast(userMessage(err, 'Failed to update expense'), 'error')
    }
    setEditField(null)
  }

  return (
    <tr className="group hover:bg-panel/50 transition-colors">
      <td
        data-testid={`name-${expense.id}`}
        className="px-2 py-1 cursor-pointer"
        onClick={() => { if (editField !== 'name') startEdit('name') }}
      >
        {editField === 'name' ? (
          <input
            autoFocus
            className="w-full bg-panel-2 text-fg rounded px-1"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditField(null)
            }}
          />
        ) : (
          <>
            <span className="border-b border-dashed border-transparent group-hover:border-faint">{expense.name}</span>
            {expense.installments !== undefined && expense.installments > 1 && (
              <span
                data-testid={`installments-${expense.id}`}
                className="ml-2 text-xs text-brass"
              >
                ({expense.installments}x)
              </span>
            )}
          </>
        )}
      </td>
      <td className="px-2 py-1">
        <select
          className="bg-panel-2 text-fg rounded px-1 text-sm"
          value={expense.currency}
          onChange={async e => {
            try {
              await onUpdate(expense.id, { currency: e.target.value as Currency })
            } catch (err) {
              toast(userMessage(err, 'Failed to update currency'), 'error')
            }
          }}
        >
          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td
        className="px-2 py-1 text-right cursor-pointer"
        onClick={() => { if (editField !== 'debit') startEdit('debit') }}
      >
        {editField === 'debit' ? (
          <NumberInput
            autoFocus
            min="0"
            step="0.01"
            className="w-24 bg-panel-2 text-fg rounded px-1 text-right"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditField(null)
            }}
          />
        ) : expense.debit > 0 ? (
          <span className="font-mono tabular-nums border-b border-dashed border-transparent group-hover:border-faint">{expense.debit.toFixed(2)}</span>
        ) : (
          <span className="text-faint">—</span>
        )}
      </td>
      <td
        className="px-2 py-1 text-right cursor-pointer"
        onClick={() => { if (editField !== 'credit') startEdit('credit') }}
      >
        {editField === 'credit' ? (
          <NumberInput
            autoFocus
            min="0"
            step="0.01"
            className="w-24 bg-panel-2 text-fg rounded px-1 text-right"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditField(null)
            }}
          />
        ) : expense.credit > 0 ? (
          <span className="font-mono tabular-nums border-b border-dashed border-transparent group-hover:border-faint">{expense.credit.toFixed(2)}</span>
        ) : (
          <span className="text-faint">—</span>
        )}
      </td>
      <td className="px-2 py-1 text-right text-dim font-mono tabular-nums">
        {(expense.debit + expense.credit).toFixed(2)}
      </td>
      <td className="px-2 py-1">
        {confirmDelete ? (
          <span className="flex gap-1">
            <button
              className="text-xs text-neg underline"
              onClick={() => onRemove(expense.id)}
            >
              Confirm
            </button>
            <button
              className="text-xs text-dim underline"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            className="text-xs text-faint hover:text-neg"
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
  const [debit, setDebit] = useState('')
  const [credit, setCredit] = useState('')
  const [parcels, setParcels] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const parcelsNum = parseInt(parcels, 10)
  const creditNum = parseFloat(credit) || 0
  const isParceled = parcelsNum >= 2 && creditNum > 0
  const perParcel = isParceled ? Math.round((creditNum / parcelsNum) * 100) / 100 : creditNum

  async function handleAdd() {
    setFormError(null)
    try {
      await onAdd({
        name: name.trim(),
        category,
        currency,
        debit: parseMoney(debit),
        credit: perParcel,
        ...(isParceled ? { installments: parcelsNum } : {}),
      })
      setName('')
      setDebit('')
      setCredit('')
      setParcels('')
    } catch (err) {
      setFormError(userMessage(err, 'Failed to add expense'))
    }
  }

  return (
    <>
      <tr className="text-dim text-sm">
        <td className="px-2 py-1">
          <input
            className="w-full bg-panel-2 text-fg rounded px-1 placeholder-faint"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </td>
        <td className="px-2 py-1">
          <select
            className="bg-panel-2 text-fg rounded px-1 text-sm"
            value={currency}
            onChange={e => setCurrency(e.target.value as Currency)}
          >
            <option value="BRL">BRL</option>
            <option value="USD">USD</option>
          </select>
        </td>
        <td className="px-2 py-1">
          <NumberInput
            min="0"
            step="0.01"
            aria-label="Debit"
            placeholder="0.00"
            className="w-24 bg-panel-2 text-fg rounded px-1 text-right placeholder-faint"
            value={debit}
            onChange={e => setDebit(e.target.value)}
          />
        </td>
        <td className="px-2 py-1">
          <NumberInput
            min="0"
            step="0.01"
            aria-label="Credit"
            placeholder="0.00"
            className="w-24 bg-panel-2 text-fg rounded px-1 text-right placeholder-faint border border-line focus:outline-none focus:border-brass"
            value={credit}
            onChange={e => setCredit(e.target.value)}
          />
        </td>
        <td className="px-2 py-1">
          <div className="flex items-center gap-1 justify-end">
            <span className="text-faint text-xs">×</span>
            <NumberInput
              min="1"
              step="1"
              placeholder="1"
              aria-label="Parcels"
              className="w-12 bg-panel-2 text-fg rounded px-1 text-center text-sm border border-line focus:outline-none focus:border-brass placeholder-faint"
              value={parcels}
              onChange={e => setParcels(e.target.value)}
            />
          </div>
        </td>
        <td className="px-2 py-1">
          <button
            className="text-xs text-pos hover:text-pos"
            onClick={handleAdd}
          >
            Add
          </button>
        </td>
      </tr>
      {isParceled && (
        <tr data-testid="parcel-hint">
          <td colSpan={6} className="px-2 pb-2 text-xs text-brass/90">
            ↳ {parcelsNum}× de {fmtCurrency(perParcel, currency)} = {fmtCurrency(round2(perParcel * parcelsNum), currency)}
          </td>
        </tr>
      )}
      {formError && (
        <tr>
          <td colSpan={6} className="px-2 py-1 text-neg text-xs">
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
      <h2 className="text-[11px] font-semibold text-brass uppercase tracking-[0.11em] mb-2">
        {label}
      </h2>
      <table className="w-full text-sm text-fg">
        <thead>
          <tr className="text-faint text-[11px] uppercase tracking-[0.06em] border-b border-line select-none">
            <th
              className="px-2 py-1 text-left font-normal cursor-pointer hover:text-dim"
              onClick={() => onSort('name')}
            >
              Name <SortIndicator active={sortCol === 'name'} dir={sortDir} />
            </th>
            <th className="px-2 py-1 text-left font-normal">Currency</th>
            <th
              className="px-2 py-1 text-right font-normal cursor-pointer hover:text-dim"
              onClick={() => onSort('debit')}
            >
              Debit <SortIndicator active={sortCol === 'debit'} dir={sortDir} />
            </th>
            <th
              className="px-2 py-1 text-right font-normal cursor-pointer hover:text-dim"
              onClick={() => onSort('credit')}
            >
              Credit <SortIndicator active={sortCol === 'credit'} dir={sortDir} />
            </th>
            <th
              className="px-2 py-1 text-right font-normal cursor-pointer hover:text-dim"
              onClick={() => onSort('total')}
            >
              Total <SortIndicator active={sortCol === 'total'} dir={sortDir} />
            </th>
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
    <div className="border-t border-line pt-4 mt-4 space-y-2">
      {active.map(c => (
        <div
          key={c}
          data-testid={`totals-${c}`}
          className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-dim [&_strong]:font-mono [&_strong]:tabular-nums [&_strong]:text-fg"
        >
          <span className="font-semibold text-faint w-10">{c}</span>
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

function ExpenseListBody({ monthKey }: Props) {
  const { expenses, loading, error, totals, add, update, remove } = useExpenses(monthKey)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all')
  const [sortCol, setSortCol] = useState<ExpenseSortCol>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

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
    return <div className="text-dim text-sm text-center py-8">Loading…</div>
  }

  if (error) {
    return <div className="text-neg text-sm text-center py-8">{error}</div>
  }

  const isFiltering = search !== '' || categoryFilter !== 'all' || paymentFilter !== 'all'
  const fixed = sorted.filter(e => e.category === 'fixed')
  const others = sorted.filter(e => e.category === 'other')

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-3 items-center">
        <FilterBar
          search={search}
          onSearch={setSearch}
          category={categoryFilter}
          onCategory={setCategoryFilter}
          payment={paymentFilter}
          onPayment={setPaymentFilter}
        />
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
        <p className="text-faint text-sm text-center py-8">No expenses match the current filters.</p>
      )}
      <TotalsFooter totals={totals} />
      {expenses.length > 0 && (
        <p className="text-xs text-faint mt-3">
          Tap any name or amount to edit inline · <span className="font-mono">Enter</span> saves
        </p>
      )}
    </div>
  )
}

export function ExpenseList({ monthKey }: Props) {
  const [copyOpen, setCopyOpen] = useState(false)
  // Bumped after a copy so the body remounts and re-reads the month.
  const [version, setVersion] = useState(0)

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setCopyOpen(true)}
          className="text-xs text-dim hover:text-fg px-3 py-1.5 rounded-lg border border-line hover:border-brass transition-colors"
        >
          Copy from previous month
        </button>
      </div>
      <ExpenseListBody key={version} monthKey={monthKey} />
      {copyOpen && (
        <CopyFromPreviousModal
          monthKey={monthKey}
          onClose={() => setCopyOpen(false)}
          onCopied={() => setVersion(v => v + 1)}
        />
      )}
    </div>
  )
}
