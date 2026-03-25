import { createContext } from 'react'

export type SessionState =
  | { status: 'loading' }
  | { status: 'setup' }
  | { status: 'locked' }
  | { status: 'unlocked'; key: CryptoKey }

export type SessionContextType = {
  state: SessionState
  setup: (password: string) => Promise<void>
  login: (password: string) => Promise<void>
  logout: () => void
}

export const SessionContext = createContext<SessionContextType | null>(null)
