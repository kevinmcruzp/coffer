import { useRef, useState } from 'react'
import { parseCSV } from '../lib/parseCSV'
import { writeMonth, listMonths } from '../lib/db'
import { monthKeySchema } from '../lib/schemas'
import { useSession } from '../hooks/useSession'
import type { MonthData } from '../types'

type PreviewData = {
  monthKey: string
  data: Omit<MonthData, 'key'>
}

type Props = {
  onDone: () => void
}

export function ImportScreen({ onDone }: Props) {
  const { state, db } = useSession()
  const cryptoKey = state.status === 'unlocked' ? state.key : null

  const fileRef = useRef<HTMLInputElement>(null)
  const [monthKey, setMonthKey] = useState('')
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [overwriteWarning, setOverwriteWarning] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setParseError(null)
    setPreview(null)
    setOverwriteWarning(false)

    const text = await file.text()
    const result = parseCSV(text)

    if (!result.ok) {
      setParseError(result.error)
      return
    }

    setPreview({ monthKey, data: result.data })
  }

  function handleMonthKeyChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMonthKey(e.target.value)
    setPreview(null)
    setOverwriteWarning(false)
  }

  async function handleConfirm() {
    if (!db || !cryptoKey || !preview) return

    const keyValidation = monthKeySchema.safeParse(preview.monthKey)
    if (!keyValidation.success) {
      setParseError('Invalid month — use YYYY-MM format')
      return
    }

    if (!overwriteWarning) {
      const existing = await listMonths(db)
      if (existing.includes(preview.monthKey)) {
        setOverwriteWarning(true)
        return
      }
    }

    setSaving(true)
    try {
      const monthData: MonthData = { key: preview.monthKey, ...preview.data }
      await writeMonth(db, preview.monthKey, monthData, cryptoKey)
      onDone()
    } finally {
      setSaving(false)
    }
  }

  function handleFileClick() {
    const keyValidation = monthKeySchema.safeParse(monthKey)
    if (!keyValidation.success) {
      setParseError('Enter a valid month (YYYY-MM) before selecting the file')
      return
    }
    setParseError(null)
    fileRef.current?.click()
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl font-semibold">Import CSV</h1>

        <div className="space-y-2">
          <label className="text-sm text-gray-400">Month (YYYY-MM)</label>
          <input
            type="text"
            placeholder="2025-01"
            value={monthKey}
            onChange={handleMonthKeyChange}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
          />
        </div>

        <button
          onClick={handleFileClick}
          className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded px-4 py-2 text-sm"
        >
          Select CSV file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {parseError && (
          <p className="text-red-400 text-sm">{parseError}</p>
        )}

        {preview && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-gray-300">Preview — {preview.monthKey}</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-gray-400 text-left border-b border-gray-800">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4 text-right">Debit</th>
                    <th className="py-2 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.data.expenses.map((e) => (
                    <tr key={e.id} className="border-b border-gray-900">
                      <td className="py-1 pr-4">{e.name}</td>
                      <td className="py-1 pr-4 text-gray-400">{e.category}</td>
                      <td className="py-1 pr-4 text-right">{e.debit > 0 ? e.debit.toFixed(2) : '—'}</td>
                      <td className="py-1 text-right">{e.credit > 0 ? e.credit.toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-sm text-gray-400 space-y-1">
              {preview.data.incomes[0] && (
                <p>Income: BRL {preview.data.incomes[0].amount.toFixed(2)}</p>
              )}
              <p>Saving: BRL {preview.data.saving.toFixed(2)}</p>
              <p>Adjustment: BRL {preview.data.adjustment.toFixed(2)}</p>
            </div>

            {overwriteWarning && (
              <p className="text-yellow-400 text-sm">
                Month {preview.monthKey} already exists. Confirm again to overwrite.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="bg-white text-gray-950 rounded px-4 py-2 text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                {saving ? 'Saving…' : overwriteWarning ? 'Overwrite' : 'Save'}
              </button>
              <button
                onClick={onDone}
                className="text-gray-400 hover:text-white text-sm px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
