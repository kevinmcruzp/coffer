import { useState } from 'react'
import { useMonthClosing } from '../hooks/useMonthClosing'
import { useLocale } from '../hooks/useLocale'
import { useSession } from '../hooks/useSession'
import { useToast } from '../hooks/useToast'
import { userMessage } from '../lib/errorMessages'
import type { Message } from '../lib/i18n'
import { InfoTip } from './InfoTip'
import { Interpolate } from './Interpolate'

type Props = {
  monthKey: string
}

export function MonthClosingPanel({ monthKey }: Props) {
  const { closing, balance, nextKey, loading, close, reopen } = useMonthClosing(monthKey)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<Message | null>(null)
  const { toast } = useToast()
  const { currency } = useSession()
  const { t, money, shortMonthLabel, date } = useLocale()

  if (loading) return null

  const fmt = (value: number) => money(value, currency)
  const amount = (value: number) => <span className="font-mono tabular-nums text-fg">{fmt(value)}</span>

  const month = shortMonthLabel(monthKey)
  const next = shortMonthLabel(nextKey)

  async function run(action: () => Promise<void>, success: string) {
    setError(null)
    setBusy(true)
    try {
      await action()
      setConfirming(false)
      toast(success)
    } catch (err) {
      setError(userMessage(err))
    }
    setBusy(false)
  }

  return (
    <section className="border-t border-line pt-6 space-y-3">
      <div className="flex items-center gap-1.5">
        <h2 className="text-xs text-faint uppercase tracking-wider">{t('closing.title')}</h2>
        <InfoTip label={t('closing.title')}>{t('closing.info')}</InfoTip>
      </div>

      {closing ? (
        <div className="flex flex-wrap items-center gap-3">
          <p data-testid="closing-status" className="text-sm text-dim flex-1">
            <span className="text-brass font-medium">{t('closing.closedOn', { date: date(closing.closedAt) })}</span>
            {' · '}
            {closing.balance === 0
              ? t('closing.nothingToCarry', { amount: fmt(0) })
              : <Interpolate text={t('closing.carriedTo', { month: next })} values={{ amount: amount(closing.balance) }} />}
          </p>
          <button
            onClick={() => run(reopen, t('closing.reopened', { month }))}
            disabled={busy}
            className="text-xs text-dim hover:text-fg px-3 py-1.5 rounded-lg border border-line hover:border-brass transition-colors disabled:opacity-50"
          >
            {t('closing.reopen')}
          </button>
        </div>
      ) : confirming ? (
        <div data-testid="close-confirm" className="rounded-lg border border-brass/50 bg-panel p-4 space-y-3">
          <p className="text-sm text-fg">
            <Interpolate
              text={t('closing.confirm', { next, month })}
              values={{ amount: <span className="font-mono tabular-nums">{fmt(balance)}</span> }}
            />
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => run(close, t('closing.closed', { month }))}
              disabled={busy}
              aria-label={t('closing.confirmClose')}
              className="px-3 py-1.5 text-xs font-semibold text-ink bg-brass hover:brightness-110 rounded-lg transition disabled:opacity-50"
            >
              {busy ? t('closing.closing') : t('closing.closeMonthOf', { month })}
            </button>
            <button
              onClick={() => { setConfirming(false); setError(null) }}
              disabled={busy}
              className="px-3 py-1.5 text-xs text-dim hover:text-fg rounded-lg hover:bg-panel-2 transition-colors"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-dim flex-1">
            <Interpolate text={t('closing.balanceToCarry', { month: next })} values={{ amount: amount(balance) }} />
          </p>
          <button
            onClick={() => setConfirming(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-ink bg-brass hover:brightness-110 rounded-lg transition"
          >
            {t('closing.closeMonth')}
          </button>
        </div>
      )}

      {error && <p className="text-neg text-xs">{t(error)}</p>}
    </section>
  )
}
