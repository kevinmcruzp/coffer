import { SessionProvider } from './contexts/SessionContext'
import { useSession } from './hooks/useSession'
import { SetupScreen } from './components/SetupScreen'
import { LoginScreen } from './components/LoginScreen'

function AppShell() {
  const { state, setup, login, logout } = useSession()

  if (state.status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950">
        <span className="text-gray-400 text-sm">Loading…</span>
      </main>
    )
  }

  if (state.status === 'setup') {
    return <SetupScreen onSetup={setup} />
  }

  if (state.status === 'locked') {
    return <LoginScreen onLogin={login} />
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold">Coffer</h1>
        <button
          onClick={logout}
          className="text-sm text-gray-400 underline hover:text-white"
        >
          Lock vault
        </button>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <AppShell />
    </SessionProvider>
  )
}
