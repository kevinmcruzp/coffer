import { useEffect, useRef, useState, type ReactNode } from 'react'
import { deriveKey, generateSalt, generateVerificationToken, verifyKey } from '../lib/crypto'
import { openDB, readSetting, writeSetting } from '../lib/db'
import { base64ToUint8Array, uint8ArrayToBase64 } from '../lib/encoding'
import { SessionContext, type SessionState } from './session'

type Props = {
  children: ReactNode
  idbFactory?: IDBFactory
}

export function SessionProvider({ children, idbFactory }: Props) {
  const [state, setState] = useState<SessionState>({ status: 'loading' })
  const [db, setDb] = useState<IDBDatabase | null>(null)
  const dbRef = useRef<IDBDatabase | null>(null)

  useEffect(() => {
    openDB(idbFactory ?? indexedDB).then(async (dbInstance) => {
      dbRef.current = dbInstance
      setDb(dbInstance)
      const salt = await readSetting(dbInstance, 'salt')
      setState(salt === undefined ? { status: 'setup' } : { status: 'locked' })
    })
  }, [idbFactory])

  async function setup(password: string) {
    const dbInstance = dbRef.current!
    const salt = generateSalt()
    const key = await deriveKey(password, salt)
    const token = await generateVerificationToken(key)
    await writeSetting(dbInstance, 'salt', uint8ArrayToBase64(salt))
    await writeSetting(dbInstance, 'verificationToken', token)
    setState({ status: 'unlocked', key })
  }

  async function login(password: string) {
    const dbInstance = dbRef.current!
    const saltB64 = await readSetting(dbInstance, 'salt')
    const token = await readSetting(dbInstance, 'verificationToken')
    if (!saltB64 || !token) throw new Error('App not initialized')

    const key = await deriveKey(password, base64ToUint8Array(saltB64))
    const valid = await verifyKey(key, token)
    if (!valid) throw new Error('Incorrect password')

    setState({ status: 'unlocked', key })
  }

  function logout() {
    setState({ status: 'locked' })
  }

  return (
    <SessionContext.Provider value={{ state, db, setup, login, logout }}>
      {children}
    </SessionContext.Provider>
  )
}
