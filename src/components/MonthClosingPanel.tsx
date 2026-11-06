import { useState } from 'react'
import { useMonthClosing } from '../hooks/useMonthClosing'
import { useToast } from '../hooks/useToast'
import { userMessage } from '../lib/errorMessages'
import { shortMonthLabel } from '../lib/months'
import { InfoTip } from './InfoTip'

const INFO = 'Closing locks this month and carries its BRL balance into the next month as an income entry. Reopen to fix something — closing again updates that entry.'

function fmtBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

type Props = {
  monthKey: string
}

export function MonthClosingPanel({ monthKey }: Props) {
  const { closing, balance, nextKey, loading, close, reopen } = useMonthClosing(monthKey)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  if (loading) return null

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
      setError(userMessage(err, 'Something went wrong. Please try again.'))
    }
    setBusy(false)
  }

  return (
    <section className="border-t border-line pt-6 space-y-3">
      <div className="flex items-center gap-1.5">
        <h2 className="text-xs text-faint uppercase tracking-wider">Month closing</h2>
        <InfoTip label="Month closing">{INFO}</InfoTip>
      </div>

      {closing ? (
        <div className="flex flex-wrap items-center gap-3">
          <p data-testid="closing-status" className="text-sm text-dim flex-1">
            <span className="text-brass font-medium">Closed on {new Date(closing.closedAt).toLocaleDateString('pt-BR')}</span>
            {' · '}
            {closing.balance === 0
              ? 'nothing to carry (balance R$ 0,00)'
              : <><span className="font-mono tabular-nums text-fg">{fmtBRL(closing.balance)}</span> carried to {next}</>}
          </p>
          <button
            onClick={() => run(reopen, `${month} reopened`)}
            disabled={busy}
            className="text-xs text-dim hover:text-fg px-3 py-1.5 rounded-lg border border-line hover:border-brass transition-colors disabled:opacity-50"
          >
            Reopen
          </button>
        </div>
      ) : confirming ? (
        <div data-testid="close-confirm" className="rounded-lg border border-brass/50 bg-panel p-4 space-y-3">
          <p className="text-sm text-fg">
            Carry <span className="font-mono tabular-nums">{fmtBRL(balance)}</span> to {next} as income and lock {month} for editing?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => run(close, `${month} closed`)}
              disabled={busy}
              aria-label="Confirm close"
              className="px-3 py-1.5 text-xs font-semibold text-ink bg-brass hover:brightness-110 rounded-lg transition disabled:opacity-50"
            >
              {busy ? 'Closing…' : `Close ${month}`}
            </button>
            <button
              onClick={() => { setConfirming(false); setError(null) }}
              disabled={busy}
              className="px-3 py-1.5 text-xs text-dim hover:text-fg rounded-lg hover:bg-panel-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-dim flex-1">
            Balance to carry into {next}: <span className="font-mono tabular-nums text-fg">{fmtBRL(balance)}</span>
          </p>
          <button
            onClick={() => setConfirming(true)}
            className="px-3.5 py-1.5 text-xs font-semibold text-ink bg-brass hover:brightness-110 rounded-lg transition"
          >
            Close month
          </button>
        </div>
      )}

      {error && <p className="text-neg text-xs">{error}</p>}
    </section>
  )
}
