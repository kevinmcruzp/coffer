import { useState, useEffect } from 'react'
import { SessionProvider } from './contexts/SessionContext'
import { useSession } from './hooks/useSession'
import { useCurrentMonth } from './hooks/useCurrentMonth'
import { SetupScreen } from './components/SetupScreen'
import { LoginScreen } from './components/LoginScreen'
import { MonthNavigator } from './components/MonthNavigator'
import { YearNavigator } from './components/YearNavigator'
import { ExpenseList } from './components/ExpenseList'
import { IncomeList } from './components/IncomeList'
import { MonthSummary } from './components/MonthSummary'
import { AnnualView } from './components/AnnualView'
import { QuickAddModal } from './components/QuickAddModal'
import { SettingsPage } from './components/SettingsPage'
import { ImportScreen } from './components/ImportScreen'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import {
  ExpensesIcon, IncomeIcon, SummaryIcon, AnnualIcon,
  SettingsIcon, LockIcon, PlusIcon,
  SunIcon, MoonIcon,
} from './components/Icons'

type Theme = 'light' | 'dark'

function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('coffer-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('coffer-theme', theme)
  }, [theme])
  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))
  return [theme, toggle]
}
import { useExpenses } from './hooks/useExpenses'
import { useMonthMeta } from './hooks/useMonthMeta'
import { useMonthClosing } from './hooks/useMonthClosing'
import { yearOf } from './lib/months'

type LedgerTab = 'expenses' | 'income' | 'summary' | 'annual'
type Tab = LedgerTab | 'settings'

const TABS: { id: LedgerTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
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
  const { logout } = useSession()
  const [theme, toggleTheme] = useTheme()
  const { monthKey, canGoBack, goBack, goForward, goTo } = useCurrentMonth(currentMonthKey())
  const { closing } = useMonthClosing(monthKey)
  const [tab, setTab] = useState<Tab>('expenses')
  const [annualYear, setAnnualYear] = useState(() => yearOf(currentMonthKey()))
  const [importing, setImporting] = useState(false)
  const [quickAdd, setQuickAdd] = useState(false)
  const isMonthTab = tab !== 'annual' && tab !== 'settings'

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
            <NavItem
              key={id}
              label={label}
              active={tab === id}
              // Opening Annual lands on the year of the month you were browsing.
              onClick={() => { if (id === 'annual') setAnnualYear(yearOf(monthKey)); setTab(id) }}
            >
              <Icon />
            </NavItem>
          ))}
        </nav>

        <div className="hidden md:block md:flex-1" />

        <div className="hidden md:flex items-center gap-2 text-[11.5px] text-dim px-2.5 py-2 border border-line rounded-lg bg-panel-2">
          <LockIcon className="w-3.5 h-3.5 text-brass" />
          Encrypted · Local only
        </div>

        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="shrink-0 flex items-center justify-center px-2.5 py-2 rounded-lg border border-line text-dim hover:text-brass hover:border-brass transition-colors"
          >
            {theme === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setTab('settings')}
            aria-label="Settings"
            aria-current={tab === 'settings' ? 'page' : undefined}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border transition-colors text-xs ${
              tab === 'settings' ? 'border-brass text-fg bg-brass-soft' : 'border-line text-dim hover:text-fg hover:border-brass'
            }`}
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
          {tab === 'settings' && <h1 className="font-serif text-xl font-semibold tracking-tight py-1">Settings</h1>}
          {tab === 'annual' && <YearNavigator year={annualYear} onChange={setAnnualYear} />}
          {isMonthTab && (
            <MonthNavigator monthKey={monthKey} canGoBack={canGoBack} goBack={goBack} goForward={goForward} goTo={goTo} />
          )}
          <div className="flex-1" />
          {isMonthTab && closing && (
            <span
              data-testid="closed-badge"
              className="text-xs text-brass font-medium px-2.5 py-0.5 rounded-full bg-brass-soft border border-brass/40 whitespace-nowrap"
            >
              Closed
            </span>
          )}
          {tab !== 'settings' && (
            <>
              <BudgetBadge monthKey={monthKey} />
              <button
                onClick={() => setQuickAdd(true)}
                disabled={closing !== null}
                title={closing ? 'This month is closed. Reopen it in Summary to add expenses.' : undefined}
                className="inline-flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2 rounded-lg bg-brass text-ink hover:brightness-110 transition disabled:opacity-40 disabled:hover:brightness-100 disabled:cursor-not-allowed"
                aria-label="Quick add expense"
              >
                <PlusIcon className="w-4 h-4" /><span className="hidden sm:inline">Add</span>
              </button>
            </>
          )}
        </header>

        <main className="px-4 md:px-7 py-6 max-w-4xl w-full mx-auto">
          {tab === 'expenses' && <ExpenseList key={monthKey} monthKey={monthKey} />}
          {tab === 'income' && <IncomeList key={monthKey} monthKey={monthKey} />}
          {tab === 'summary' && <MonthSummary key={monthKey} monthKey={monthKey} />}
          {tab === 'annual' && (
            <AnnualView
              year={annualYear}
              onSelectMonth={(key) => { goTo(key); setTab('expenses') }}
            />
          )}
          {tab === 'settings' && <SettingsPage monthKey={monthKey} onImport={() => setImporting(true)} />}
        </main>
      </div>

      {/* Overlays */}
      {quickAdd && <QuickAddModal monthKey={monthKey} onClose={() => setQuickAdd(false)} />}
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
