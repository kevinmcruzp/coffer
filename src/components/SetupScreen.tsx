import { useState, type FormEvent } from 'react'
import { useLocale } from '../hooks/useLocale'

type Props = {
  onSetup: (password: string) => Promise<void>
}

export function SetupScreen({ onSetup }: Props) {
  const { t } = useLocale()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordTooShort = password.length > 0 && password.length < 8
  const mismatch = confirm.length > 0 && password !== confirm
  const canSubmit =
    password.length >= 8 && password === confirm && acknowledged && !loading

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError('')
    setLoading(true)
    try {
      await onSetup(password)
    } catch {
      setError(t('setup.failed'))
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-fg">{t('app.welcome')}</h1>
          <p className="text-sm text-dim">{t('setup.intro')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm text-dim" htmlFor="password">
              {t('auth.masterPassword')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg bg-panel-2 px-3 py-2 text-fg placeholder-faint focus:outline-none focus:ring-2 focus:ring-brass"
              placeholder={t('setup.passwordPlaceholder')}
            />
            {passwordTooShort && (
              <p className="text-xs text-neg">{t('setup.tooShort')}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm text-dim" htmlFor="confirm">
              {t('setup.confirm')}
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg bg-panel-2 px-3 py-2 text-fg placeholder-faint focus:outline-none focus:ring-2 focus:ring-brass"
              placeholder={t('setup.confirmPlaceholder')}
            />
            {mismatch && (
              <p className="text-xs text-neg">{t('setup.mismatch')}</p>
            )}
          </div>

          <div className="rounded-lg border border-neg/40 bg-neg/10 p-3 space-y-2">
            <p className="text-xs text-neg leading-relaxed">{t('setup.warning')}</p>
            <label className="flex items-start gap-2 text-xs text-neg cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-0.5 accent-neg"
              />
              <span>{t('setup.acknowledge')}</span>
            </label>
          </div>

          {error && <p className="text-sm text-neg">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-lg bg-brass px-4 py-2 font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? t('setup.submitting') : t('setup.submit')}
          </button>
        </form>
      </div>
    </main>
  )
}
