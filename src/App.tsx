import { useState } from 'react'
import { SessionProvider } from './contexts/SessionContext'
import { useSession } from './hooks/useSession'
import { useCurrentMonth } from './hooks/useCurrentMonth'
import { SetupScreen } from './components/SetupScreen'
import { LoginScreen } from './components/LoginScreen'
import { MonthNavigator } from './components/MonthNavigator'
import { ExpenseList } from './components/ExpenseList'
import { IncomeList } from './components/IncomeList'
import { MonthSummary } from './components/MonthSummary'
import { AnnualView } from './components/AnnualView'
import { QuickAddModal } from './components/QuickAddModal'
import { SettingsModal } from './components/SettingsModal'
import { ImportScreen } from './components/ImportScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import {
  ExpensesIcon, IncomeIcon, SummaryIcon, AnnualIcon,
  ImportExportIcon, BackupIcon, SettingsIcon, LockIcon, PlusIcon,
} from './components/Icons'
import { useToast } from './hooks/useToast'
import { downloadCSV } from './lib/exportCSV'
import { readMonth } from './lib/db'
import { exportBackup, importBackup } from './lib/backup'
import { userMessage } from './lib/errorMessages'
import { useExpenses } from './hooks/useExpenses'
import { useMonthMeta } from './hooks/useMonthMeta'

type Tab = 'expenses' | 'income' | 'summary' | 'annual'

const TABS: { id: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'expenses', label: 'Expenses', Icon: ExpensesIcon },
  { id: 'income', label: 'Income', Icon: IncomeIcon },
  { id: 'summary', label: 'Summary', Icon: SummaryIcon },
  { id: 'annual', label: 'Annual', Icon: AnnualIcon },
]

function NavItem({
  label, active, onClick, children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors shrink-0 md:w-full ${
        active ? 'text-fg bg-brass-soft' : 'text-dim hover:text-fg hover:bg-panel-2'
      }`}
    >
      {active && (
        <span className="hidden md:block absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-brass" />
      )}
      <span className="w-[17px] h-[17px] shrink-0 opacity-90 [&>svg]:w-full [&>svg]:h-full">
        {children}
      </span>
      <span>{label}</span>
    </button>
  )
}

function currentMonthKey(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function BudgetBadge({ monthKey }: { monthKey: string }) {
  const { totals } = useExpenses(monthKey)
  const { budget } = useMonthMeta(monthKey)
  if (budget === 0) return null
  const spent = totals.BRL.total
  const excess = spent - budget
  if (excess <= 0) return null
  return (
    <span className="text-xs text-neg font-medium px-2.5 py-0.5 rounded-full bg-neg/10 border border-neg/40 tabular-nums whitespace-nowrap">
      +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(excess)} over budget
    </span>
  )
}

function MainApp() {
  const { state, db, logout } = useSession()
  const { monthKey, canGoBack, goBack, goForward, goTo } = useCurrentMonth(currentMonthKey())
  const [tab, setTab] = useState<Tab>('expenses')
  const [importing, setImporting] = useState(false)
  const [quickAdd, setQuickAdd] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restorePassword, setRestorePassword] = useState('')
  const { toast } = useToast()

  async function handleExport() {
    if (!db || state.status !== 'unlocked') return
    try {
      const data = await readMonth(db, monthKey, state.key)
      downloadCSV(data, monthKey)
      toast('Exported successfully')
    } catch {
      toast('No data found for this month', 'error')
    }
  }

  async function handleBackup() {
    if (!db || state.status !== 'unlocked') return
    try {
      const blob = await exportBackup(db, state.key)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `coffer-backup-${new Date().toISOString().slice(0, 10)}.coffer`
      a.click()
      URL.revokeObjectURL(url)
      toast('Backup downloaded')
    } catch {
      toast('Failed to create backup. Please try again.', 'error')
    }
  }

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setRestoreFile(file)
    setRestorePassword('')
  }

  async function confirmRestore() {
    if (!restoreFile || !db || state.status !== 'unlocked') return
    try {
      const count = await importBackup(restoreFile, db, restorePassword, state.key)
      toast(`${count} month${count !== 1 ? 's' : ''} restored`)
    } catch (err) {
      toast(userMessage(err, 'Failed to restore backup. Please try again.'), 'error')
    }
    setRestoreFile(null)
    setRestorePassword('')
  }

  if (importing) {
    return <ImportScreen onDone={() => setImporting(false)} />
  }

  return (
    <div className="min-h-screen bg-ink text-fg flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="bg-panel border-b md:border-b-0 md:border-r border-line flex md:flex-col md:w-60 md:shrink-0 items-center md:items-stretch gap-3 md:gap-6 px-3 py-2.5 md:p-4 overflow-x-auto">
        <div className="flex items-center gap-2.5 md:px-2 shrink-0">
          <span className="w-8 h-8 rounded-lg grid place-items-center bg-brass text-ink shrink-0">
            <LockIcon className="w-[17px] h-[17px]" />
          </span>
          <span className="font-serif text-xl font-semibold tracking-tight">Coffer</span>
        </div>

        <nav className="flex md:flex-col gap-1 md:gap-0.5 shrink-0">
          <p className="hidden md:block text-[10px] uppercase tracking-[0.11em] text-faint px-2 pb-1.5">Ledger</p>
          {TABS.map(({ id, label, Icon }) => (
            <NavItem key={id} label={label} active={tab === id} onClick={() => setTab(id)}>
              <Icon />
            </NavItem>
          ))}
        </nav>

        <nav className="flex md:flex-col gap-1 md:gap-0.5 shrink-0">
          <p className="hidden md:block text-[10px] uppercase tracking-[0.11em] text-faint px-2 pb-1.5">Data</p>
          <NavItem label="Export" onClick={handleExport}><ImportExportIcon /></NavItem>
          <NavItem label="Import" onClick={() => setImporting(true)}><ImportExportIcon /></NavItem>
          <NavItem label="Backup" onClick={handleBackup}><BackupIcon /></NavItem>
          <label className="relative flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-dim hover:text-fg hover:bg-panel-2 transition-colors shrink-0 md:w-full cursor-pointer">
            <span className="w-[17px] h-[17px] shrink-0 opacity-90 [&>svg]:w-full [&>svg]:h-full"><BackupIcon /></span>
            <span>Restore</span>
            <input type="file" accept=".coffer" className="hidden" onChange={handleRestore} />
          </label>
        </nav>

        <div className="hidden md:block md:flex-1" />

        <div className="hidden md:flex items-center gap-2 text-[11.5px] text-dim px-2.5 py-2 border border-line rounded-lg bg-panel-2">
          <LockIcon className="w-3.5 h-3.5 text-brass" />
          Encrypted · Local only
        </div>

        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-line text-dim hover:text-fg hover:border-brass transition-colors text-xs"
          >
            <SettingsIcon className="w-4 h-4" /><span className="hidden md:inline">Settings</span>
          </button>
          <button
            onClick={logout}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-line text-dim hover:text-fg hover:border-brass transition-colors text-xs"
          >
            <LockIcon className="w-4 h-4" /><span className="hidden md:inline">Lock</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-3 md:gap-4 px-4 md:px-7 py-3.5 border-b border-line">
          {tab !== 'annual'
            ? <MonthNavigator monthKey={monthKey} canGoBack={canGoBack} goBack={goBack} goForward={goForward} />
            : <span className="font-serif text-lg font-semibold">Annual overview</span>}
          <div className="flex-1" />
          <BudgetBadge monthKey={monthKey} />
          <button
            onClick={() => setQuickAdd(true)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-lg bg-brass text-ink hover:brightness-110 transition"
            aria-label="Quick add expense"
          >
            <PlusIcon className="w-4 h-4" /><span className="hidden sm:inline">Add</span>
          </button>
        </header>

        <main className="px-4 md:px-7 py-6 max-w-4xl w-full mx-auto">
          {tab === 'expenses' && <ExpenseList key={monthKey} monthKey={monthKey} />}
          {tab === 'income' && <IncomeList key={monthKey} monthKey={monthKey} />}
          {tab === 'summary' && <MonthSummary key={monthKey} monthKey={monthKey} />}
          {tab === 'annual' && (
            <AnnualView
              currentYear={parseInt(monthKey.split('-')[0], 10)}
              onSelectMonth={(key) => { goTo(key); setTab('expenses') }}
            />
          )}
        </main>
      </div>

      {/* Overlays */}
      {quickAdd && <QuickAddModal monthKey={monthKey} onClose={() => setQuickAdd(false)} />}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {restoreFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <form
            onSubmit={(e) => { e.preventDefault(); confirmRestore() }}
            className="bg-panel border border-line rounded-2xl p-6 w-full max-w-sm mx-4"
          >
            <h2 className="text-sm font-semibold text-fg mb-1">Restore Backup</h2>
            <p className="text-xs text-dim mb-4">
              Enter the password used when this backup was created.
            </p>
            <input
              type="password"
              value={restorePassword}
              onChange={(e) => setRestorePassword(e.target.value)}
              placeholder="Backup password"
              className="w-full px-3 py-2 rounded-lg bg-panel-2 border border-line text-fg text-sm focus:outline-none focus:border-brass mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setRestoreFile(null); setRestorePassword('') }}
                className="px-3 py-1.5 text-xs text-dim hover:text-fg rounded-lg hover:bg-panel-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold text-ink bg-brass hover:brightness-110 rounded-lg transition"
              >
                Restore
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function AppShell() {
  const { state, setup, login } = useSession()

  if (state.status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950">
        <span className="text-gray-400 text-sm">Loading…</span>
      </main>
    )
  }

  if (state.status === 'setup') return <SetupScreen onSetup={setup} />
  if (state.status === 'locked') return <LoginScreen onLogin={login} />

  return <MainApp />
}

export default function App() {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </SessionProvider>
    </ErrorBoundary>
  )
}
