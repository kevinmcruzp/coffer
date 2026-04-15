import { useState } from 'react'
import { useExpenses } from '../hooks/useExpenses'
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
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await add({
        name: name.trim(),
        category: 'other',
        currency,
        debit: parseFloat(debit) || 0,
        credit: parseFloat(credit) || 0,
        fixed: false,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:max-w-sm bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Quick add — {monthKey}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            autoFocus
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-500"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <div className="flex gap-2">
            <select
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-sm focus:outline-none"
              value={currency}
              onChange={e => setCurrency(e.target.value as Currency)}
            >
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Debit"
              aria-label="Debit"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-500"
              value={debit}
              onChange={e => setDebit(e.target.value)}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Credit"
              aria-label="Credit"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gray-500"
              value={credit}
              onChange={e => setCredit(e.target.value)}
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-white text-gray-950 font-semibold rounded-lg py-2 text-sm hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Adding…' : 'Add expense'}
          </button>
        </form>
      </div>
    </div>
  )
}
