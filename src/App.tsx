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
import { FixedPanel } from './components/FixedPanel'
import { QuickAddModal } from './components/QuickAddModal'
import { ImportScreen } from './components/ImportScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider, useToast } from './components/Toast'
import { downloadCSV } from './lib/exportCSV'
import { readMonth } from './lib/db'
import { exportBackup, importBackup } from './lib/backup'
import { useExpenses } from './hooks/useExpenses'
import { useMonthMeta } from './hooks/useMonthMeta'

type Tab = 'expenses' | 'income' | 'summary' | 'fixed' | 'annual'

const TAB_LABELS: Record<Tab, string> = {
  expenses: 'Expenses',
  income: 'Income',
  summary: 'Summary',
  fixed: 'Fixed',
  annual: 'Annual',
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
    <span className="text-xs text-red-400 font-medium px-2 py-0.5 rounded-full bg-red-950 border border-red-800">
      +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(excess)} over budget
    </span>
  )
}

function MainApp() {
  const { state, db, logout } = useSession()
  const { monthKey, goBack, goForward, goTo } = useCurrentMonth(currentMonthKey())
  const [tab, setTab] = useState<Tab>('expenses')
  const [importing, setImporting] = useState(false)
  const [quickAdd, setQuickAdd] = useState(false)
  const { toast } = useToast()

  async function handleExport() {
    if (!db || state.status !== 'unlocked') return
    try {
      const data = await readMonth(db, monthKey, state.key)
      downloadCSV(data, monthKey)
      toast('Exported successfully')
    } catch {
      toast('Nothing to export for this month', 'error')
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
      toast('Backup failed', 'error')
    }
  }

  async function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !db || state.status !== 'unlocked') return
    try {
      const count = await importBackup(file, db, state.key)
      toast(`${count} month${count !== 1 ? 's' : ''} restored`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Restore failed', 'error')
    }
  }

  if (importing) {
    return <ImportScreen onDone={() => setImporting(false)} />
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white tracking-tight">Coffer</span>
          <BudgetBadge monthKey={monthKey} />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setQuickAdd(true)}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors font-medium"
            aria-label="Quick add expense"
          >
            +
          </button>
          <button
            onClick={handleExport}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors"
          >
            Export
          </button>
          <button
            onClick={handleBackup}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors"
          >
            Backup
          </button>
          <label className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors cursor-pointer">
            Restore
            <input type="file" accept=".coffer" className="hidden" onChange={handleRestore} />
          </label>
          <button
            onClick={() => setImporting(true)}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors"
          >
            Import
          </button>
          <button
            onClick={logout}
            className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-800 transition-colors"
          >
            Lock
          </button>
        </div>
      </header>

      {quickAdd && <QuickAddModal monthKey={monthKey} onClose={() => setQuickAdd(false)} />}

      {/* Month navigator — hidden on Annual tab */}
      {tab !== 'annual' && (
        <div className="px-4 py-4 flex justify-center border-b border-gray-800">
          <MonthNavigator monthKey={monthKey} goBack={goBack} goForward={goForward} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-800 px-4">
        {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-white text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="px-4 py-6 max-w-4xl mx-auto">
        {tab === 'expenses' && <ExpenseList key={monthKey} monthKey={monthKey} />}
        {tab === 'income' && <IncomeList key={monthKey} monthKey={monthKey} />}
        {tab === 'summary' && <MonthSummary key={monthKey} monthKey={monthKey} />}
        {tab === 'fixed' && <FixedPanel key={monthKey} monthKey={monthKey} />}
        {tab === 'annual' && (
          <AnnualView
            currentYear={parseInt(monthKey.split('-')[0], 10)}
            onSelectMonth={(key) => { goTo(key); setTab('expenses') }}
          />
        )}
      </main>
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
