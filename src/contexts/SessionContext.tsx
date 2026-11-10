import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { deriveKey, generateSalt, generateVerificationToken, verifyKey } from '../lib/crypto'
import { openIdbStore } from '../lib/idbStore'
import type { VaultStore } from '../lib/vaultStore'
import { base64ToUint8Array, uint8ArrayToBase64 } from '../lib/encoding'
import { useAutoLock } from '../hooks/useAutoLock'
import {
  DEFAULT_LOCK_TIMEOUT,
  SessionContext,
  parseLockTimeout,
  type LockTimeout,
  type SessionState,
} from './session'

type Props = {
  children: ReactNode
  // Where the vault lives. Must be a stable reference — a new function reopens the vault.
  openStore?: () => Promise<VaultStore>
}

export function SessionProvider({ children, openStore = openIdbStore }: Props) {
  const [state, setState] = useState<SessionState>({ status: 'loading' })
  const [db, setDb] = useState<VaultStore | null>(null)
  const [lockTimeout, setLockTimeoutState] = useState<LockTimeout>(DEFAULT_LOCK_TIMEOUT)
  const dbRef = useRef<VaultStore | null>(null)

  useEffect(() => {
    openStore().then(async (dbInstance) => {
      dbRef.current = dbInstance
      setDb(dbInstance)
      const salt = await dbInstance.readSetting('salt')
      const timeout = parseLockTimeout(await dbInstance.readSetting('lockTimeoutMinutes'))
      setLockTimeoutState(timeout)
      setState(salt === undefined ? { status: 'setup' } : { status: 'locked' })
    })
  }, [openStore])

  // First-time setup: generates a random salt, derives a key from the password,
  // and stores an encrypted verification token. The salt is stored in plaintext
  // (it must be readable without a key to allow re-derivation on future logins).
  async function setup(password: string) {
    const dbInstance = dbRef.current
    if (!dbInstance) throw new Error('Database not ready')
    const salt = generateSalt()
    const key = await deriveKey(password, salt)
    const token = await generateVerificationToken(key)
    await dbInstance.writeSetting('salt', uint8ArrayToBase64(salt))
    await dbInstance.writeSetting('verificationToken', token)
    setState({ status: 'unlocked', key })
  }

  // Subsequent logins: retrieves the stored salt, re-derives the key from the
  // password + salt, then verifies correctness by decrypting the stored token.
  async function login(password: string) {
    const dbInstance = dbRef.current
    if (!dbInstance) throw new Error('Database not ready')
    const saltB64 = await dbInstance.readSetting('salt')
    const token = await dbInstance.readSetting('verificationToken')
    if (!saltB64 || !token) throw new Error('App not initialized')

    const key = await deriveKey(password, base64ToUint8Array(saltB64))
    const valid = await verifyKey(key, token)
    if (!valid) throw new Error('Incorrect password')

    setState({ status: 'unlocked', key })
  }

  const logout = useCallback(() => {
    setState({ status: 'locked' })
  }, [])

  async function setLockTimeout(value: LockTimeout) {
    const dbInstance = dbRef.current
    if (!dbInstance) throw new Error('Database not ready')
    await dbInstance.writeSetting('lockTimeoutMinutes', String(value))
    setLockTimeoutState(value)
  }

  const timeoutMs = lockTimeout === 'never' ? 0 : lockTimeout * 60 * 1000

  useAutoLock({
    enabled: state.status === 'unlocked' && lockTimeout !== 'never',
    timeoutMs,
    onLock: logout,
  })

  return (
    <SessionContext.Provider
      value={{ state, db, lockTimeout, setup, login, logout, setLockTimeout }}
    >
      {children}
    </SessionContext.Provider>
  )
}
