import { useState } from 'react'
import { useExpenses } from '../hooks/useExpenses'
import { NumberInput } from './NumberInput'
import { userMessage } from '../lib/errorMessages'
import { round2, parseMoney } from '../lib/math'
import { CURRENCIES } from '../types'
import type { Currency } from '../types'

type Props = {
  monthKey: string
  onClose: () => void
}

export function QuickAddModal({ monthKey, onClose }: Props) {
  const { add } = useExpenses(monthKey)
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState<Currency>('BRL')
  const [debit, setDebit] = useState('')
  const [credit, setCredit] = useState('')
  const [parcels, setParcels] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const parcelsNum = parseInt(parcels, 10)
  const creditNum = parseFloat(credit) || 0
  const isParceled = parcelsNum >= 2 && creditNum > 0
  const perParcel = isParceled ? Math.round((creditNum / parcelsNum) * 100) / 100 : creditNum

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await add({
        name: name.trim(),
        category: 'other',
        currency,
        debit: parseMoney(debit),
        credit: perParcel,
        ...(isParceled ? { installments: parcelsNum } : {}),
      })
      onClose()
    } catch (err) {
      setError(userMessage(err, 'Failed to add expense'))
      setSaving(false)
    }
  }

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(v)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:max-w-sm bg-panel border border-line rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg">Quick add — {monthKey}</h2>
          <button
            onClick={onClose}
            className="text-faint hover:text-fg text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            autoFocus
            className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder-faint focus:outline-none focus:border-brass"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <div className="flex gap-2">
            <select
              className="bg-panel-2 border border-line rounded-lg px-2 py-2 text-fg text-sm focus:outline-none"
              value={currency}
              onChange={e => setCurrency(e.target.value as Currency)}
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <NumberInput
              min="0"
              step="0.01"
              placeholder="Debit"
              aria-label="Debit"
              className="flex-1 bg-panel-2 border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder-faint focus:outline-none focus:border-brass"
              value={debit}
              onChange={e => setDebit(e.target.value)}
            />
            <NumberInput
              min="0"
              step="0.01"
              placeholder="Credit"
              aria-label="Credit"
              className="flex-1 bg-panel-2 border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder-faint focus:outline-none focus:border-brass"
              value={credit}
              onChange={e => setCredit(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-dim uppercase tracking-wider">
              Parcels (optional)
            </label>
            <NumberInput
              min="1"
              step="1"
              placeholder="1"
              aria-label="Parcels"
              className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder-faint focus:outline-none focus:border-brass"
              value={parcels}
              onChange={e => setParcels(e.target.value)}
            />
            {isParceled && (
              <p data-testid="parcel-hint" className="text-xs text-brass/90 pt-1">
                ↳ {parcelsNum}× de {fmt(perParcel)} = {fmt(round2(perParcel * parcelsNum))}
              </p>
            )}
          </div>

          {error && <p className="text-neg text-xs">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-brass text-ink font-semibold rounded-lg py-2 text-sm hover:brightness-110 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Adding…' : 'Add expense'}
          </button>
        </form>
      </div>
    </div>
  )
}
