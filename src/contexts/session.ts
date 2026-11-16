import { createContext } from 'react'
import type { VaultStore } from '../lib/vaultStore'
import type { Currency } from '../types'

// State machine:
//   loading  → setup    (no salt in the vault — first launch)
//   loading  → locked   (salt found — returning user)
//   setup    → unlocked (password created)
//   locked   → unlocked (correct password entered)
//   unlocked → locked   (logout or auto-lock timeout)
// The CryptoKey in 'unlocked' is derived from the password and lives only in memory;
// it is never persisted. Closing the tab loses the key and requires re-login.
export type SessionState =
  | { status: 'loading' }
  | { status: 'setup' }
  | { status: 'locked' }
  | { status: 'unlocked'; key: CryptoKey }

// Values are in minutes. 'never' disables the auto-lock timer entirely.
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
  // The whole vault, every currency included. Only what works across currencies
  // (backup, restore) should reach for it.
  vault: VaultStore | null
  // The vault limited to the active currency — what the data hooks read and write.
  db: VaultStore | null
  // Each currency is a separate environment with its own months.
  currency: Currency
  lockTimeout: LockTimeout
  setup: (password: string) => Promise<void>
  login: (password: string) => Promise<void>
  logout: () => void
  setLockTimeout: (value: LockTimeout) => Promise<void>
  setCurrency: (value: Currency) => Promise<void>
}

export const SessionContext = createContext<SessionContextType | null>(null)
