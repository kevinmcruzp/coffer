import { useState, type ReactNode } from 'react'
import { useSession } from '../hooks/useSession'
import { useToast } from '../hooks/useToast'
import { useLocale } from '../hooks/useLocale'
import { LOCK_TIMEOUT_OPTIONS, parseLockTimeout, type LockTimeout } from '../contexts/session'
import { exportBackup, importBackup } from '../lib/backup'
import { saveBackupFile } from '../lib/backupFile'
import { parseCurrency } from '../lib/currencyStore'
import { userMessage } from '../lib/errorMessages'
import { LANGUAGES, LANGUAGE_NAMES, parseLanguage } from '../lib/i18n'
import { CURRENCIES } from '../types'

type Props = {
  // Location of the vault file on disk.
  vaultPath: string
  onImport: () => void
}

const SELECT =
  'shrink-0 bg-panel-2 border border-line rounded-lg px-3 py-1.5 text-fg text-sm focus:outline-none focus:border-brass'

const ACTION_BUTTON =
  'shrink-0 text-xs text-dim hover:text-fg px-3 py-1.5 rounded-lg border border-line hover:border-brass transition-colors disabled:opacity-50 cursor-pointer'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1">
      <h2 className="text-xs text-brass uppercase tracking-wider pb-1">{title}</h2>
      <div className="rounded-lg border border-line bg-panel divide-y divide-line">{children}</div>
    </section>
  )
}

function Row({ title, hint, children }: { title: ReactNode; hint: string; children: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-fg">{title}</p>
        <p className="text-xs text-faint pt-0.5">{hint}</p>
      </div>
      {children}
    </div>
  )
}

export function SettingsPage({ vaultPath, onImport }: Props) {
  const { state, vault, currency, lockTimeout, setLockTimeout, setCurrency } = useSession()
  const { toast } = useToast()
  const { t, language, setLanguage } = useLocale()
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restorePassword, setRestorePassword] = useState('')
  const [restoring, setRestoring] = useState(false)

  const cryptoKey = state.status === 'unlocked' ? state.key : null

  function lockTimeoutLabel(option: LockTimeout): string {
    if (option === 'never') return t('settings.never')
    if (option === 60) return t('settings.oneHour')
    return t('settings.minutes', { count: option })
  }

  function handleLanguage(raw: string) {
    const next = parseLanguage(raw)
    if (next) setLanguage(next)
  }

  async function handleLockTimeout(raw: string) {
    try {
      await setLockTimeout(parseLockTimeout(raw))
      toast(t('settings.autoLockUpdated'))
    } catch (err) {
      toast(t(userMessage(err, 'settings.saveFailed')), 'error')
    }
  }

  async function handleCurrency(raw: string) {
    const next = parseCurrency(raw)
    try {
      await setCurrency(next)
      toast(t('settings.nowShowing', { currency: next }))
    } catch (err) {
      toast(t(userMessage(err, 'settings.saveFailed')), 'error')
    }
  }

  async function handleBackup() {
    if (!vault || !cryptoKey) return
    try {
      const saved = await saveBackupFile(await exportBackup(vault, cryptoKey), vaultPath, t('dialog.saveBackup'))
      if (saved) toast(t('settings.backupSaved'))
    } catch (err) {
      toast(t(userMessage(err, 'settings.backupFailed')), 'error')
    }
  }

  function closeRestore() {
    setRestoreFile(null)
    setRestorePassword('')
  }

  async function handleRestore() {
    if (!restoreFile || !vault || !cryptoKey) return
    setRestoring(true)
    try {
      const count = await importBackup(restoreFile, vault, restorePassword, cryptoKey)
      toast(count === 1 ? t('settings.restoredOne') : t('settings.restoredMany', { count }))
    } catch (err) {
      toast(t(userMessage(err, 'settings.restoreFailed')), 'error')
    }
    setRestoring(false)
    closeRestore()
  }

  return (
    <div className="space-y-8">
      <Section title={t('settings.vault')}>
        <div className="px-4 py-3.5">
          <p className="text-sm text-fg">{t('settings.vaultFile')}</p>
          <p className="text-xs text-dim font-mono break-all pt-1">{vaultPath}</p>
          <p className="text-xs text-faint pt-1.5">{t('settings.vaultHint')}</p>
        </div>
      </Section>

      <Section title={t('settings.language')}>
        <Row
          title={<label htmlFor="language">{t('settings.language')}</label>}
          hint={t('settings.languageHint')}
        >
          <select
            id="language"
            value={language}
            onChange={e => handleLanguage(e.target.value)}
            className={SELECT}
          >
            {LANGUAGES.map(option => (
              <option key={option} value={option} lang={option}>
                {LANGUAGE_NAMES[option]}
              </option>
            ))}
          </select>
        </Row>
      </Section>

      <Section title={t('settings.currency')}>
        <Row
          title={<label htmlFor="currency">{t('settings.activeCurrency')}</label>}
          hint={t('settings.currencyHint')}
        >
          <select
            id="currency"
            value={currency}
            onChange={e => handleCurrency(e.target.value)}
            className={SELECT}
          >
            {CURRENCIES.map(option => (
              <option key={option} value={option}>
                {option} — {t(`currency.${option}`)}
              </option>
            ))}
          </select>
        </Row>
      </Section>

      <Section title={t('settings.security')}>
        <Row
          title={<label htmlFor="lock-timeout">{t('settings.autoLock')}</label>}
          hint={t('settings.autoLockHint')}
        >
          <select
            id="lock-timeout"
            value={String(lockTimeout)}
            onChange={e => handleLockTimeout(e.target.value)}
            className={SELECT}
          >
            {LOCK_TIMEOUT_OPTIONS.map(option => (
              <option key={option} value={String(option)}>
                {lockTimeoutLabel(option)}
              </option>
            ))}
          </select>
        </Row>
      </Section>

      <Section title={t('settings.backup')}>
        <Row title={t('settings.encryptedBackup')} hint={t('settings.backupHint')}>
          <button onClick={handleBackup} className={ACTION_BUTTON}>{t('settings.saveBackup')}</button>
        </Row>
        <Row title={t('settings.restoreTitle')} hint={t('settings.restoreHint')}>
          {restoreFile ? (
            <form
              onSubmit={e => { e.preventDefault(); handleRestore() }}
              className="flex flex-wrap items-center gap-2"
            >
              <input
                type="password"
                aria-label={t('settings.backupPassword')}
                placeholder={t('settings.backupPassword')}
                value={restorePassword}
                onChange={e => setRestorePassword(e.target.value)}
                autoFocus
                className="w-44 bg-panel-2 border border-line rounded-lg px-3 py-1.5 text-fg text-sm placeholder-faint focus:outline-none focus:border-brass"
              />
              <button
                type="submit"
                disabled={restoring}
                className="px-3 py-1.5 text-xs font-semibold text-ink bg-brass hover:brightness-110 rounded-lg transition disabled:opacity-50"
              >
                {restoring ? t('settings.restoring') : t('settings.restore')}
              </button>
              <button type="button" onClick={closeRestore} className="px-2 py-1.5 text-xs text-dim hover:text-fg">
                {t('common.cancel')}
              </button>
            </form>
          ) : (
            <label className={ACTION_BUTTON}>
              {t('settings.chooseFile')}
              <input
                type="file"
                accept=".coffer"
                aria-label={t('settings.restoreBackup')}
                className="hidden"
                onChange={e => {
                  setRestoreFile(e.target.files?.[0] ?? null)
                  e.target.value = ''
                }}
              />
            </label>
          )}
        </Row>
      </Section>

      <Section title={t('settings.spreadsheet')}>
        <Row title={t('settings.importTitle')} hint={t('settings.importHint', { currency })}>
          <button onClick={onImport} aria-label={t('settings.importCsv')} className={ACTION_BUTTON}>{t('settings.import')}</button>
        </Row>
      </Section>
    </div>
  )
}
