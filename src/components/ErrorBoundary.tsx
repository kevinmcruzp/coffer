import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console in development only — no financial data is logged
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, info.componentStack)
    }
  }

  render() {
    if (this.state.error) {
      return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white gap-4 p-6">
          <p className="text-gray-300 text-sm text-center max-w-sm">
            Something went wrong. Your data is safe — refresh the page to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-white text-gray-950 rounded px-4 py-2 text-sm font-medium hover:bg-gray-200"
          >
            Refresh
          </button>
        </main>
      )
    }
    return this.props.children
  }
}
