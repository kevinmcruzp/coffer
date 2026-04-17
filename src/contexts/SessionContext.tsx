import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { deriveKey, generateSalt, generateVerificationToken, verifyKey } from '../lib/crypto'
import { openDB, readSetting, writeSetting } from '../lib/db'
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
  idbFactory?: IDBFactory
}

export function SessionProvider({ children, idbFactory }: Props) {
  const [state, setState] = useState<SessionState>({ status: 'loading' })
  const [db, setDb] = useState<IDBDatabase | null>(null)
  const [lockTimeout, setLockTimeoutState] = useState<LockTimeout>(DEFAULT_LOCK_TIMEOUT)
  const dbRef = useRef<IDBDatabase | null>(null)

  useEffect(() => {
    openDB(idbFactory ?? indexedDB).then(async (dbInstance) => {
      dbRef.current = dbInstance
      setDb(dbInstance)
      const salt = await readSetting(dbInstance, 'salt')
      const timeout = parseLockTimeout(await readSetting(dbInstance, 'lockTimeoutMinutes'))
      setLockTimeoutState(timeout)
      setState(salt === undefined ? { status: 'setup' } : { status: 'locked' })
    })
  }, [idbFactory])

  async function setup(password: string) {
    const dbInstance = dbRef.current
    if (!dbInstance) throw new Error('Database not ready')
    const salt = generateSalt()
    const key = await deriveKey(password, salt)
    const token = await generateVerificationToken(key)
    await writeSetting(dbInstance, 'salt', uint8ArrayToBase64(salt))
    await writeSetting(dbInstance, 'verificationToken', token)
    setState({ status: 'unlocked', key })
  }

  async function login(password: string) {
    const dbInstance = dbRef.current
    if (!dbInstance) throw new Error('Database not ready')
    const saltB64 = await readSetting(dbInstance, 'salt')
    const token = await readSetting(dbInstance, 'verificationToken')
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
    await writeSetting(dbInstance, 'lockTimeoutMinutes', String(value))
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
