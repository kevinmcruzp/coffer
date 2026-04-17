import { createContext } from 'react'

export type SessionState =
  | { status: 'loading' }
  | { status: 'setup' }
  | { status: 'locked' }
  | { status: 'unlocked'; key: CryptoKey }

export type LockTimeout = 5 | 15 | 30 | 60 | 'never'

export const DEFAULT_LOCK_TIMEOUT: LockTimeout = 15

export const LOCK_TIMEOUT_OPTIONS: LockTimeout[] = [5, 15, 30, 60, 'never']

export function parseLockTimeout(raw: string | undefined): LockTimeout {
  if (raw === 'never') return 'never'
  const n = Number(raw)
  if (n === 5 || n === 15 || n === 30 || n === 60) return n
  return DEFAULT_LOCK_TIMEOUT
}

export type SessionContextType = {
  state: SessionState
  db: IDBDatabase | null
  lockTimeout: LockTimeout
  setup: (password: string) => Promise<void>
  login: (password: string) => Promise<void>
  logout: () => void
  setLockTimeout: (value: LockTimeout) => Promise<void>
}

export const SessionContext = createContext<SessionContextType | null>(null)
