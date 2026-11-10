import { useState, type ReactNode } from 'react'
import { useSession } from '../hooks/useSession'
import { useToast } from '../hooks/useToast'
import { LOCK_TIMEOUT_OPTIONS, parseLockTimeout, type LockTimeout } from '../contexts/session'
import { readMonth } from '../lib/db'
import { downloadCSV } from '../lib/exportCSV'
import { exportBackup, importBackup } from '../lib/backup'
import { downloadBlob } from '../lib/download'
import { userMessage } from '../lib/errorMessages'
import { shortMonthLabel } from '../lib/months'

type Props = {
  monthKey: string
  onImport: () => void
}

const LOCK_TIMEOUT_LABELS: Record<LockTimeout, string> = {
  5: '5 minutes',
  15: '15 minutes',
  30: '30 minutes',
  60: '1 hour',
  never: 'Never',
}

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

export function SettingsPage({ monthKey, onImport }: Props) {
  const { state, db, lockTimeout, setLockTimeout } = useSession()
  const { toast } = useToast()
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restorePassword, setRestorePassword] = useState('')
  const [restoring, setRestoring] = useState(false)

  const cryptoKey = state.status === 'unlocked' ? state.key : null
  const month = shortMonthLabel(monthKey)

  async function handleLockTimeout(raw: string) {
    try {
      await setLockTimeout(parseLockTimeout(raw))
      toast('Auto-lock updated')
    } catch (err) {
      toast(userMessage(err, 'Failed to save settings'), 'error')
    }
  }

  async function handleExport() {
    if (!db || !cryptoKey) return
    try {
      downloadCSV(await readMonth(db, monthKey, cryptoKey), monthKey)
      toast('Exported successfully')
    } catch {
      toast('No data found for this month', 'error')
    }
  }

  async function handleBackup() {
    if (!db || !cryptoKey) return
    try {
      const blob = await exportBackup(db, cryptoKey)
      downloadBlob(blob, `coffer-backup-${new Date().toISOString().slice(0, 10)}.coffer`)
      toast('Backup downloaded')
    } catch {
      toast('Failed to create backup. Please try again.', 'error')
    }
  }

  function closeRestore() {
    setRestoreFile(null)
    setRestorePassword('')
  }

  async function handleRestore() {
    if (!restoreFile || !db || !cryptoKey) return
    setRestoring(true)
    try {
      const count = await importBackup(restoreFile, db, restorePassword, cryptoKey)
      toast(`${count} month${count !== 1 ? 's' : ''} restored`)
    } catch (err) {
      toast(userMessage(err, 'Failed to restore backup. Please try again.'), 'error')
    }
    setRestoring(false)
    closeRestore()
  }

  return (
    <div className="space-y-8">
      <Section title="Security">
        <Row
          title={<label htmlFor="lock-timeout">Auto-lock after inactivity</label>}
          hint="The vault locks itself after this long without activity. You can also lock it any time."
        >
          <select
            id="lock-timeout"
            value={String(lockTimeout)}
            onChange={e => handleLockTimeout(e.target.value)}
            className="shrink-0 bg-panel-2 border border-line rounded-lg px-3 py-1.5 text-fg text-sm focus:outline-none focus:border-brass"
          >
            {LOCK_TIMEOUT_OPTIONS.map(option => (
              <option key={option} value={String(option)}>
                {LOCK_TIMEOUT_LABELS[option]}
              </option>
            ))}
          </select>
        </Row>
      </Section>

      <Section title="Backup">
        <Row
          title="Encrypted backup"
          hint="One file with every month, readable only with your master password. Keep a copy somewhere safe."
        >
          <button onClick={handleBackup} className={ACTION_BUTTON}>Download backup</button>
        </Row>
        <Row
          title="Restore from a backup"
          hint="Months in the backup replace the months with the same date in this vault."
        >
          {restoreFile ? (
            <form
              onSubmit={e => { e.preventDefault(); handleRestore() }}
              className="flex flex-wrap items-center gap-2"
            >
              <input
                type="password"
                aria-label="Backup password"
                placeholder="Backup password"
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
                {restoring ? 'Restoring…' : 'Restore'}
              </button>
              <button type="button" onClick={closeRestore} className="px-2 py-1.5 text-xs text-dim hover:text-fg">
                Cancel
              </button>
            </form>
          ) : (
            <label className={ACTION_BUTTON}>
              Choose file
              <input
                type="file"
                accept=".coffer"
                aria-label="Restore backup"
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

      <Section title="Spreadsheet">
        <Row title={`Export ${month} as CSV`} hint="The month you were viewing, in the spreadsheet format.">
          <button onClick={handleExport} aria-label={`Export ${month}`} className={ACTION_BUTTON}>Export</button>
        </Row>
        <Row title="Import a month from CSV" hint="Bring a month over from the spreadsheet. You review it before saving.">
          <button onClick={onImport} aria-label="Import CSV" className={ACTION_BUTTON}>Import</button>
        </Row>
      </Section>
    </div>
  )
}
