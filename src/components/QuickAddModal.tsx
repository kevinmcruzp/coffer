import { useState } from 'react'
import { useExpenses } from '../hooks/useExpenses'
import { useLocale } from '../hooks/useLocale'
import { useSession } from '../hooks/useSession'
import { NumberInput } from './NumberInput'
import { ParcelsInfo } from './ParcelsInfo'
import { userMessage } from '../lib/errorMessages'
import { round2, parseMoney } from '../lib/math'
import type { Message } from '../lib/i18n'

type Props = {
  monthKey: string
  onClose: () => void
}

export function QuickAddModal({ monthKey, onClose }: Props) {
  const { add } = useExpenses(monthKey)
  const { currency } = useSession()
  const { t, money, shortMonthLabel } = useLocale()
  const [name, setName] = useState('')
  const [debit, setDebit] = useState('')
  const [credit, setCredit] = useState('')
  const [parcels, setParcels] = useState('')
  const [error, setError] = useState<Message | null>(null)
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
        debit: parseMoney(debit),
        credit: perParcel,
        ...(isParceled ? { installments: parcelsNum } : {}),
      })
      onClose()
    } catch (err) {
      setError(userMessage(err, 'expenses.addFailed'))
      setSaving(false)
    }
  }

  const fmt = (v: number) => money(v, currency)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:max-w-sm bg-panel border border-line rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg">{t('quickAdd.title', { month: shortMonthLabel(monthKey) })}</h2>
          <button
            onClick={onClose}
            className="text-faint hover:text-fg text-lg leading-none"
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            autoFocus
            className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder-faint focus:outline-none focus:border-brass"
            placeholder={t('common.name')}
            value={name}
            onChange={e => setName(e.target.value)}
          />

          <div className="flex gap-2">
            <NumberInput
              min="0"
              step="0.01"
              placeholder={t('payment.debit')}
              aria-label={t('payment.debit')}
              className="flex-1 min-w-0 bg-panel-2 border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder-faint focus:outline-none focus:border-brass"
              value={debit}
              onChange={e => setDebit(e.target.value)}
            />
            <NumberInput
              min="0"
              step="0.01"
              placeholder={t('payment.credit')}
              aria-label={t('payment.credit')}
              className="flex-1 min-w-0 bg-panel-2 border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder-faint focus:outline-none focus:border-brass"
              value={credit}
              onChange={e => setCredit(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <label className="block text-xs text-dim uppercase tracking-wider">
                {t('quickAdd.parcelsOptional')}
              </label>
              <ParcelsInfo />
            </div>
            <NumberInput
              min="1"
              step="1"
              placeholder="1"
              aria-label={t('common.parcels')}
              className="w-full bg-panel-2 border border-line rounded-lg px-3 py-2 text-fg text-sm placeholder-faint focus:outline-none focus:border-brass"
              value={parcels}
              onChange={e => setParcels(e.target.value)}
            />
            {isParceled && (
              <p data-testid="parcel-hint" className="text-xs text-brass/90 pt-1">
                {t('common.parcelHint', { count: parcelsNum, each: fmt(perParcel), total: fmt(round2(perParcel * parcelsNum)) })}
              </p>
            )}
          </div>

          {error && <p className="text-neg text-xs">{t(error)}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-brass text-ink font-semibold rounded-lg py-2 text-sm hover:brightness-110 disabled:opacity-50 transition-colors"
          >
            {saving ? t('quickAdd.adding') : t('quickAdd.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
