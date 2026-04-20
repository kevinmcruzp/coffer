import { useMemo, useState } from 'react'
import { useIncomes } from '../hooks/useIncomes'
import { useToast } from '../hooks/useToast'
import { userMessage } from '../lib/errorMessages'
import { CURRENCIES } from '../types'
import type { Currency, Income } from '../types'
import type { IncomeTotals } from '../hooks/useIncomes'

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
    <span className={active ? 'ml-1' : 'ml-1 text-gray-700'}>
      {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )
}

// ── IncomeRow ────────────────────────────────────────────────────────────────

type RowProps = {
  income: Income
  onUpdate: (id: string, changes: Partial<Omit<Income, 'id'>>) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

function IncomeRow({ income, onUpdate, onRemove }: RowProps) {
  const [editField, setEditField] = useState<'source' | 'amount' | null>(null)
  const [draft, setDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { toast } = useToast()

  function startEdit(field: 'source' | 'amount') {
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
      changes.amount = v
    }
    try {
      await onUpdate(income.id, changes)
    } catch (err) {
      toast(userMessage(err, 'Failed to update income'), 'error')
    }
    setEditField(null)
  }

  return (
    <tr>
      <td
        data-testid={`source-${income.id}`}
        className="px-2 py-1 cursor-pointer"
        onClick={() => { if (editField !== 'source') startEdit('source') }}
      >
        {editField === 'source' ? (
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
          income.source
        )}
      </td>
      <td className="px-2 py-1">
        <select
          className="bg-gray-800 text-white rounded px-1 text-sm"
          value={income.currency}
          onChange={e => onUpdate(income.id, { currency: e.target.value as Currency })}
        >
          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td
        className="px-2 py-1 text-right cursor-pointer"
        onClick={() => { if (editField !== 'amount') startEdit('amount') }}
      >
        {editField === 'amount' ? (
          <input
            autoFocus
            type="number"
            min="0.01"
            step="0.01"
            className="w-28 bg-gray-800 text-white rounded px-1 text-right"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditField(null)
            }}
          />
        ) : (
          income.amount.toFixed(2)
        )}
      </td>
      <td className="px-2 py-1 text-center">
        <input
          type="checkbox"
          aria-label="Repeat"
          checked={income.recurring ?? false}
          onChange={e => onUpdate(income.id, { recurring: e.target.checked })}
          className="accent-emerald-500"
        />
      </td>
      <td className="px-2 py-1">
        {confirmDelete ? (
          <span className="flex gap-1">
            <button
              className="text-xs text-red-400 underline"
              onClick={() => onRemove(income.id)}
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
  const [currency, setCurrency] = useState<Currency>('BRL')
  const [amount, setAmount] = useState('0')
  const [formError, setFormError] = useState<string | null>(null)

  async function handleAdd() {
    setFormError(null)
    try {
      await onAdd({ source: source.trim(), currency, amount: parseFloat(amount) || 0 })
      setSource('')
      setAmount('0')
    } catch (err) {
      setFormError(userMessage(err, 'Failed to add income'))
    }
  }

  return (
    <>
      <tr className="text-gray-400 text-sm">
        <td className="px-2 py-1">
          <input
            className="w-full bg-gray-800 text-white rounded px-1 placeholder-gray-500"
            placeholder="Source"
            value={source}
            onChange={e => setSource(e.target.value)}
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
            min="0.01"
            step="0.01"
            aria-label="Amount"
            className="w-28 bg-gray-800 text-white rounded px-1 text-right"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </td>
        <td className="px-2 py-1" />
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
          <td colSpan={4} className="px-2 py-1 text-red-400 text-xs">
            {formError}
          </td>
        </tr>
      )}
    </>
  )
}

// ── TotalsFooter ──────────────────────────────────────────────────────────────

function fmtCurrency(value: number, currency: Currency): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value)
}

function TotalsFooter({ totals }: { totals: IncomeTotals }) {
  const currencies = CURRENCIES
  const active = currencies.filter(c => totals[c] > 0)

  if (active.length === 0) return null

  return (
    <div className="border-t border-gray-800 pt-4 mt-4 space-y-2">
      {active.map(c => (
        <div
          key={c}
          data-testid={`income-totals-${c}`}
          className="flex gap-6 text-sm text-gray-300"
        >
          <span className="font-semibold text-gray-500 w-10">{c}</span>
          <span>Total: <strong>{fmtCurrency(totals[c], c)}</strong></span>
        </div>
      ))}
    </div>
  )
}

// ── IncomeList ────────────────────────────────────────────────────────────────

type Props = {
  monthKey: string
}

export function IncomeList({ monthKey }: Props) {
  const { incomes, loading, error, totals, add, update, remove } = useIncomes(monthKey)
  const [sortCol, setSortCol] = useState<IncomeSortCol>('source')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(col: IncomeSortCol) {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorted = useMemo(() => sortIncomes(incomes, sortCol, sortDir), [incomes, sortCol, sortDir])

  if (loading) {
    return <div className="text-gray-400 text-sm text-center py-8">Loading…</div>
  }

  if (error) {
    return <div className="text-red-400 text-sm text-center py-8">{error}</div>
  }

  return (
    <div>
      <table className="w-full text-sm text-white">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-800 select-none">
            <th
              className="px-2 py-1 text-left font-normal cursor-pointer hover:text-gray-300"
              onClick={() => toggleSort('source')}
            >
              Source <SortIndicator active={sortCol === 'source'} dir={sortDir} />
            </th>
            <th className="px-2 py-1 text-left font-normal">Currency</th>
            <th
              className="px-2 py-1 text-right font-normal cursor-pointer hover:text-gray-300"
              onClick={() => toggleSort('amount')}
            >
              Amount <SortIndicator active={sortCol === 'amount'} dir={sortDir} />
            </th>
            <th className="px-2 py-1 text-center font-normal">Repeat</th>
            <th className="px-2 py-1 font-normal" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(i => (
            <IncomeRow key={i.id} income={i} onUpdate={update} onRemove={remove} />
          ))}
          <AddIncomeForm onAdd={add} />
        </tbody>
      </table>
      <TotalsFooter totals={totals} />
    </div>
  )
}
