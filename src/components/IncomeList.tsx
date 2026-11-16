import { useMemo, useState } from 'react'
import { useIncomes } from '../hooks/useIncomes'
import { useMonthClosing } from '../hooks/useMonthClosing'
import { useSession } from '../hooks/useSession'
import { useToast } from '../hooks/useToast'
import { NumberInput } from './NumberInput'
import { userMessage } from '../lib/errorMessages'
import { round2, parseMoney } from '../lib/math'
import { formatMoney } from '../lib/money'
import { shortMonthLabel } from '../lib/months'
import type { Income } from '../types'

const FIELD = 'bg-panel-2 text-fg rounded px-1 border border-line focus:outline-none focus:border-brass'

// ── Sort ──────────────────────────────────────────────────────────────────────

type IncomeSortCol = 'source' | 'amount'
type SortDir = 'asc' | 'desc'

function sortIncomes(arr: Income[], col: IncomeSortCol, dir: SortDir): Income[] {
  return [...arr].sort((a, b) => {
    const d = col === 'source' ? a.source.localeCompare(b.source) : a.amount - b.amount
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

// ── CarryNote ───────────────────────────────────────────────────────────────

// Audit trail for a carried-over balance: names the source month, and warns if that
// month was reopened after closing (the carried amount may no longer match it).
function CarryNote({ incomeId, carryFrom }: { incomeId: string; carryFrom: string }) {
  const { closing, loading } = useMonthClosing(carryFrom)
  const source = shortMonthLabel(carryFrom)
  const stale = !loading && closing === null

  return (
    <span data-testid={`carry-${incomeId}`} className={`block text-xs ${stale ? 'text-neg' : 'text-brass'}`}>
      {stale
        ? `⚠ ${source} was reopened — close it again to update this balance`
        : `↳ Closing of ${source}`}
    </span>
  )
}

// ── IncomeRow ────────────────────────────────────────────────────────────────

type RowProps = {
  income: Income
  readOnly: boolean
  onUpdate: (id: string, changes: Partial<Omit<Income, 'id'>>) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

function IncomeRow({ income, readOnly, onUpdate, onRemove }: RowProps) {
  // Carried-over balances are managed by closing the previous month, never by hand.
  const locked = readOnly || income.carryFrom !== undefined
  const [editField, setEditField] = useState<'source' | 'amount' | null>(null)
  const [draft, setDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { toast } = useToast()

  function startEdit(field: 'source' | 'amount') {
    if (locked) return
    setEditField(field)
    setDraft(field === 'source' ? income.source : String(income.amount))
  }

  async function commitEdit() {
    if (!editField) return
    const changes: Partial<Omit<Income, 'id'>> = {}
    if (editField === 'source') {
      changes.source = draft.trim()
    } else if (editField === 'amount') {
      const v = parseFloat(draft)
      if (isNaN(v)) { setEditField(null); return }
      changes.amount = round2(v)
    }
    try {
      await onUpdate(income.id, changes)
    } catch (err) {
      toast(userMessage(err, 'Failed to update income'), 'error')
    }
    setEditField(null)
  }

  return (
    <tr className="group hover:bg-panel/50 transition-colors">
      <td
        data-testid={`source-${income.id}`}
        className={`px-2 py-1 ${locked ? '' : 'cursor-pointer'}`}
        onClick={() => { if (editField !== 'source') startEdit('source') }}
      >
        {editField === 'source' ? (
          <input
            autoFocus
            className={`${FIELD} w-full`}
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
            <span className={locked ? '' : 'border-b border-dashed border-transparent group-hover:border-faint'}>{income.source}</span>
            {income.carryFrom && <CarryNote incomeId={income.id} carryFrom={income.carryFrom} />}
          </>
        )}
      </td>
      <td
        className={`px-2 py-1 text-right ${locked ? '' : 'cursor-pointer'}`}
        onClick={() => { if (editField !== 'amount') startEdit('amount') }}
      >
        {editField === 'amount' ? (
          <NumberInput
            autoFocus
            min="0.01"
            step="0.01"
            className={`${FIELD} w-28 text-right`}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditField(null)
            }}
          />
        ) : (
          <span className={`font-mono tabular-nums ${income.amount < 0 ? 'text-neg' : 'text-pos'} ${locked ? '' : 'border-b border-dashed border-transparent group-hover:border-faint'}`}>{income.amount.toFixed(2)}</span>
        )}
      </td>
      <td className="px-2 py-1">
        {locked ? null : confirmDelete ? (
          <span className="flex gap-1">
            <button
              className="text-xs text-neg underline"
              onClick={() => onRemove(income.id)}
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
            aria-label={`Delete ${income.source}`}
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </button>
        )}
      </td>
    </tr>
  )
}

// ── AddIncomeForm ─────────────────────────────────────────────────────────────

type AddFormProps = {
  onAdd: (input: Omit<Income, 'id'>) => Promise<void>
}

function AddIncomeForm({ onAdd }: AddFormProps) {
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  async function handleAdd() {
    setFormError(null)
    try {
      await onAdd({ source: source.trim(), amount: parseMoney(amount) })
      setSource('')
      setAmount('')
    } catch (err) {
      setFormError(userMessage(err, 'Failed to add income'))
    }
  }

  return (
    <>
      <tr className="text-dim text-sm">
        <td className="px-2 py-1">
          <input
            className={`${FIELD} w-full placeholder-faint`}
            placeholder="Source"
            value={source}
            onChange={e => setSource(e.target.value)}
          />
        </td>
        <td className="px-2 py-1">
          <NumberInput
            min="0.01"
            step="0.01"
            aria-label="Amount"
            placeholder="0.00"
            className={`${FIELD} w-28 text-right placeholder-faint`}
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
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
      {formError && (
        <tr>
          <td colSpan={2} className="px-2 py-1 text-neg text-xs">
            {formError}
          </td>
        </tr>
      )}
    </>
  )
}

// ── TotalsFooter ──────────────────────────────────────────────────────────────

function TotalsFooter({ total }: { total: number }) {
  const { currency } = useSession()

  if (total === 0) return null

  return (
    <div
      data-testid="income-total"
      className="border-t border-line pt-4 mt-4 flex gap-6 text-sm text-dim [&_strong]:font-mono [&_strong]:tabular-nums [&_strong]:text-pos"
    >
      <span>Total: <strong>{formatMoney(total, currency)}</strong></span>
    </div>
  )
}

// ── IncomeList ────────────────────────────────────────────────────────────────

type Props = {
  monthKey: string
}

export function IncomeList({ monthKey }: Props) {
  const { incomes, closed, loading, error, total, add, update, remove } = useIncomes(monthKey)
  const [sortCol, setSortCol] = useState<IncomeSortCol>('source')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(col: IncomeSortCol) {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorted = useMemo(() => sortIncomes(incomes, sortCol, sortDir), [incomes, sortCol, sortDir])

  if (loading) {
    return <div className="text-dim text-sm text-center py-8">Loading…</div>
  }

  if (error) {
    return <div className="text-neg text-sm text-center py-8">{error}</div>
  }

  return (
    <div>
      <table className="w-full text-sm text-fg">
        <thead>
          <tr className="text-faint text-[11px] uppercase tracking-[0.06em] border-b border-line select-none">
            <th
              className="px-2 py-1 text-left font-normal cursor-pointer hover:text-dim"
              onClick={() => toggleSort('source')}
            >
              Source <SortIndicator active={sortCol === 'source'} dir={sortDir} />
            </th>
            <th
              className="px-2 py-1 text-right font-normal cursor-pointer hover:text-dim"
              onClick={() => toggleSort('amount')}
            >
              Amount <SortIndicator active={sortCol === 'amount'} dir={sortDir} />
            </th>
            <th className="px-2 py-1 font-normal" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(i => (
            <IncomeRow key={i.id} income={i} readOnly={closed} onUpdate={update} onRemove={remove} />
          ))}
          {!closed && <AddIncomeForm onAdd={add} />}
        </tbody>
      </table>
      <TotalsFooter total={total} />
    </div>
  )
}
